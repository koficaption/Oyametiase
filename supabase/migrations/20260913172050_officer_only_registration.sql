-- This CMS is for officers only. The first real account stays Presiding Elder.
-- Later public sign-ups wait until the Presiding Elder assigns an officer office.

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
  assigned_status text := 'pending';
  assigned_approval text := 'pending';
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
    assigned_status := 'active';
    assigned_approval := 'approved';
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
