-- Open public registration: accounts become active immediately.
-- The first real (non-seed) account becomes Presiding Elder.
-- Later sign-ups stay members until a Presiding Elder assigns an office.

ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'active',
  ALTER COLUMN approval_status SET DEFAULT 'approved';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  assembly uuid;
  uname text;
  assigned_role text := 'member';
  has_human_pe boolean;
BEGIN
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
  END IF;

  uname := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))));
  IF uname IS NULL OR uname = '' THEN
    uname := 'user-' || substr(NEW.id::text, 1, 8);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = uname) THEN
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
    'active',
    'approved',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

UPDATE public.profiles
SET
  account_status = 'active',
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, now()),
  is_active = true
WHERE (account_status = 'pending' OR approval_status = 'pending')
  AND COALESCE(account_status, 'pending') NOT IN ('rejected', 'suspended');

UPDATE public.profiles
SET role_slug = 'presiding_elder'
WHERE id = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.email NOT ILIKE '%@oyametiase.local'
    AND p.account_status = 'active'
    AND COALESCE(p.approval_status, 'approved') = 'approved'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles e
      WHERE e.role_slug = 'presiding_elder'
        AND e.email NOT ILIKE '%@oyametiase.local'
        AND e.account_status = 'active'
    )
  ORDER BY
    CASE
      WHEN p.requested_system_role = 'presiding_elder' THEN 0
      WHEN p.church_position = 'Presiding Elder' THEN 0
      ELSE 1
    END,
    p.created_at ASC
  LIMIT 1
);

NOTIFY pgrst, 'reload schema';
