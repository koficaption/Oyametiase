-- Public registration + PE approval. Church position and responsibility are
-- not system permissions. New sign-ups always start as pending members.

INSERT INTO public.roles (slug, name, description, sort_order) VALUES
  ('ministry_finance', 'Ministry financial secretary', 'Scoped ministry money books only', 45),
  ('children_teacher', 'Children''s Ministry Teacher', 'Assigned children / class records only', 46)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username citext,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS church_position text,
  ADD COLUMN IF NOT EXISTS church_responsibility text,
  ADD COLUMN IF NOT EXISTS requested_system_role text,
  ADD COLUMN IF NOT EXISTS assigned_department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_status text,
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

UPDATE public.profiles
SET
  username = COALESCE(username, split_part(email::text, '@', 1)),
  church_position = COALESCE(church_position, 'Member'),
  church_responsibility = COALESCE(church_responsibility, 'No specific role'),
  requested_system_role = COALESCE(requested_system_role, role_slug),
  account_status = COALESCE(account_status, CASE WHEN is_active THEN 'active' ELSE 'suspended' END),
  approval_status = COALESCE(approval_status, 'approved'),
  approved_at = COALESCE(approved_at, created_at)
WHERE account_status IS NULL OR approval_status IS NULL OR username IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('pending', 'active', 'rejected', 'suspended'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_approval_idx
  ON public.profiles (approval_status, account_status);

-- Public signup copies user_metadata onto a pending member profile.
-- app_metadata is ignored so a registrant cannot pick Presiding Elder.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  assembly uuid;
  uname text;
BEGIN
  SELECT id INTO assembly FROM public.assemblies ORDER BY created_at ASC LIMIT 1;

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
    requested_system_role, account_status, approval_status, is_active, invited_at
  )
  VALUES (
    NEW.id,
    assembly,
    'member',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    uname,
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
    NEW.raw_user_meta_data->>'whatsapp_number',
    COALESCE(NEW.raw_user_meta_data->>'church_position', 'Member'),
    COALESCE(NEW.raw_user_meta_data->>'church_responsibility', 'No specific role'),
    COALESCE(NEW.raw_user_meta_data->>'requested_system_role', 'member'),
    'pending',
    'pending',
    true,
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

-- Members cannot change role, approval, or church office fields.
CREATE OR REPLACE FUNCTION app_private.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND current_setting('role', true) <> 'service_role'
     AND NOT app_private.is_admin() THEN
    IF NEW.role_slug IS DISTINCT FROM OLD.role_slug
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.church_position IS DISTINCT FROM OLD.church_position
       OR NEW.church_responsibility IS DISTINCT FROM OLD.church_responsibility
       OR NEW.assigned_department_id IS DISTINCT FROM OLD.assigned_department_id
       OR NEW.requested_system_role IS DISTINCT FROM OLD.requested_system_role
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'Only the Presiding Elder can change roles, office, or account status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_login_email(identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.email::text
  FROM public.profiles p
  WHERE p.email = lower(btrim(identifier))
     OR p.username = lower(btrim(identifier))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_login_email(text) TO anon, authenticated;

-- Ministry financial secretaries use assigned_department_id, not department leadership.
CREATE OR REPLACE FUNCTION app_private.finance_department_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT d.id
  FROM public.departments d
  WHERE d.archived_at IS NULL
    AND (
      d.leader_id = app_private.member_id()
      OR d.assistant_leader_id = app_private.member_id()
      OR d.id = (app_private.current_profile()).assigned_department_id
    );
$$;

GRANT EXECUTE ON FUNCTION app_private.finance_department_ids() TO authenticated;

CREATE OR REPLACE FUNCTION app_private.can_read_transaction(txn public.financial_transactions)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.is_admin() THEN true
      WHEN app_private.has_role(ARRAY['treasurer']) THEN txn.department_id IS NULL
      WHEN app_private.has_role(ARRAY['department_leader', 'ministry_finance'])
        AND txn.department_id IS NOT NULL
        AND txn.department_id IN (SELECT app_private.finance_department_ids()) THEN true
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_transaction(txn public.financial_transactions)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.has_role(ARRAY['treasurer']) THEN txn.department_id IS NULL
      WHEN app_private.has_role(ARRAY['department_leader', 'ministry_finance'])
        AND txn.department_id IS NOT NULL
        AND txn.department_id IN (SELECT app_private.finance_department_ids()) THEN true
      ELSE false
    END;
$$;

DROP POLICY IF EXISTS financial_categories_select ON public.financial_categories;
CREATE POLICY financial_categories_select ON public.financial_categories
  FOR SELECT TO authenticated
  USING (
    app_private.can_read_finance()
    OR app_private.has_role(ARRAY['department_leader', 'ministry_finance'])
  );

CREATE OR REPLACE FUNCTION app_private.can_read_children()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    app_private.has_role(ARRAY['presiding_elder', 'secretary'])
    OR EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.slug = 'children'
        AND d.archived_at IS NULL
        AND (
          d.id IN (SELECT app_private.led_department_ids())
          OR (
            app_private.has_role(ARRAY['children_teacher'])
            AND d.id = (app_private.current_profile()).assigned_department_id
          )
        )
    );
$$;

NOTIFY pgrst, 'reload schema';
