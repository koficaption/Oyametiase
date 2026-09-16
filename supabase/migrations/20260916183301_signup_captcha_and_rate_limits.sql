-- Public Auth sign-up must present a one-time ticket issued only after the
-- Next.js server verifies CAPTCHA. Direct calls to /auth/v1/signup cannot
-- mint a ticket, so they cannot create profiles. Rate-limit counters live
-- in app_private so anon cannot read or reset them.

CREATE TABLE IF NOT EXISTS app_private.signup_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  username citext NOT NULL,
  captcha_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS signup_tickets_captcha_hash_idx
  ON app_private.signup_tickets (captcha_hash);
CREATE INDEX IF NOT EXISTS signup_tickets_email_idx
  ON app_private.signup_tickets (email, expires_at);

CREATE TABLE IF NOT EXISTS app_private.auth_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('signup', 'login', 'forgot')),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_attempts_lookup_idx
  ON app_private.auth_attempts (ip_hash, action, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (email);

REVOKE ALL ON TABLE app_private.signup_tickets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE app_private.auth_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE app_private.signup_tickets TO postgres, service_role;
GRANT ALL ON TABLE app_private.auth_attempts TO postgres, service_role;

CREATE OR REPLACE FUNCTION app_private.consume_signup_ticket(p_email text, p_ticket uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  consumed uuid;
BEGIN
  UPDATE app_private.signup_tickets
  SET used_at = now()
  WHERE id = p_ticket
    AND used_at IS NULL
    AND expires_at > now()
    AND email = lower(btrim(p_email))::citext
  RETURNING id INTO consumed;

  RETURN consumed IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION app_private.consume_signup_ticket(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.issue_signup_ticket(
  p_email text,
  p_username text,
  p_captcha_hash text,
  p_ttl_seconds integer DEFAULT 600
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  new_id uuid;
  ttl integer := GREATEST(30, LEAST(COALESCE(p_ttl_seconds, 600), 3600));
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  DELETE FROM app_private.signup_tickets
  WHERE expires_at < now() - interval '1 day';

  INSERT INTO app_private.signup_tickets (email, username, captcha_hash, expires_at)
  VALUES (
    lower(btrim(p_email))::citext,
    lower(btrim(p_username))::citext,
    p_captcha_hash,
    now() + make_interval(secs => ttl)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_rate_limited(
  p_action text,
  p_ip_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  max_attempts integer;
  window_seconds integer;
  recent integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'signup' THEN
    max_attempts := 5;
    window_seconds := 3600;
  ELSIF p_action = 'login' THEN
    max_attempts := 10;
    window_seconds := 900;
  ELSIF p_action = 'forgot' THEN
    max_attempts := 5;
    window_seconds := 3600;
  ELSE
    RAISE EXCEPTION 'invalid auth action';
  END IF;

  DELETE FROM app_private.auth_attempts
  WHERE created_at < now() - interval '2 days';

  SELECT count(*)::integer INTO recent
  FROM app_private.auth_attempts
  WHERE ip_hash = p_ip_hash
    AND action = p_action
    AND created_at > now() - make_interval(secs => window_seconds);

  INSERT INTO app_private.auth_attempts (action, ip_hash)
  VALUES (p_action, p_ip_hash);

  RETURN recent >= max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_signup_ticket(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_rate_limited(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_signup_ticket(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_rate_limited(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
  assembly uuid;
  uname text;
  assigned_role text := 'member';
  assigned_status text := 'pending';
  assigned_approval text := 'pending';
  has_human_pe boolean;
  ticket_id uuid;
  is_public_signup boolean;
BEGIN
  BEGIN
    ticket_id := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'signup_ticket', '')), '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    ticket_id := NULL;
  END;

  IF ticket_id IS NULL OR NOT app_private.consume_signup_ticket(NEW.email, ticket_id) THEN
    RAISE EXCEPTION 'Registration requires a verified CAPTCHA'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(872314);

  SELECT id INTO assembly FROM public.assemblies ORDER BY created_at ASC LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.role_slug = 'presiding_elder'
      AND COALESCE(p.account_status, 'active') = 'active'
      AND COALESCE(p.approval_status, 'approved') <> 'rejected'
      AND p.email NOT ILIKE '%@oyametiase.local'
  ) INTO has_human_pe;

  IF NOT has_human_pe THEN
    assigned_role := 'presiding_elder';
    assigned_status := 'active';
    assigned_approval := 'approved';
  END IF;

  uname := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))));
  IF uname IS NULL OR uname = '' THEN
    uname := 'user-' || substr(NEW.id::text, 1, 8);
  END IF;

  is_public_signup := COALESCE(NEW.raw_user_meta_data->>'registration', '') = 'public';
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = uname) THEN
    IF is_public_signup THEN
      RAISE EXCEPTION 'This username is already taken'
        USING ERRCODE = '23505';
    END IF;
    uname := uname || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.profiles (
    id, assembly_id, role_slug, full_name, email, phone, username,
    date_of_birth, whatsapp_number, church_position, church_responsibility,
    requested_system_role, account_status, approval_status, is_active,
    invited_at, approved_at
  )
  VALUES (
    NEW.id,
    assembly,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    uname,
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    NEW.raw_user_meta_data->>'whatsapp_number',
    COALESCE(NEW.raw_user_meta_data->>'church_position', 'Member'),
    COALESCE(NEW.raw_user_meta_data->>'church_responsibility', 'No specific role'),
    COALESCE(NEW.raw_user_meta_data->>'requested_system_role', 'member'),
    assigned_status,
    assigned_approval,
    true,
    now(),
    CASE WHEN assigned_approval = 'approved' THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
