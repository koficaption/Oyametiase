-- Portal structure: ministry kinds, children records, approvals, report review.
-- Does not recreate existing tables.

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS ministry_kind text;

UPDATE public.departments
SET ministry_kind = CASE
  WHEN slug IN ('pmm', 'pwm', 'pym', 'children') THEN slug
  ELSE coalesce(ministry_kind, 'other')
END
WHERE ministry_kind IS NULL OR ministry_kind = '';

ALTER TABLE public.department_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.department_reports
  DROP CONSTRAINT IF EXISTS department_reports_status_check;
ALTER TABLE public.department_reports
  ADD CONSTRAINT department_reports_status_check
  CHECK (status IN ('submitted', 'reviewed', 'returned'));

CREATE TABLE IF NOT EXISTS public.ministry_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender public.gender NOT NULL,
  date_of_birth date,
  parent_member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  guardian_name text,
  guardian_phone text,
  class_name text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS ministry_children_updated_at ON public.ministry_children;
CREATE TRIGGER ministry_children_updated_at
  BEFORE UPDATE ON public.ministry_children
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ministry_children_dept_idx
  ON public.ministry_children (department_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS ministry_children_parent_idx
  ON public.ministry_children (parent_member_id);

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'member_status',
    'welfare',
    'leadership',
    'announcement',
    'finance_adjustment'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  title text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_table text,
  related_id uuid,
  requested_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approvals_status_idx ON public.approvals (assembly_id, status);

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
      WHERE d.id IN (SELECT app_private.led_department_ids())
        AND d.slug = 'children'
    );
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_approvals(approval_row public.approvals)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder'])
      OR approval_row.requested_by = auth.uid();
$$;

-- Treasurer may see only their own member row, not the full register.
CREATE OR REPLACE FUNCTION app_private.can_read_member(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    CASE
      WHEN app_private.has_role(ARRAY['presiding_elder', 'secretary']) THEN true
      WHEN app_private.member_id() = target THEN true
      WHEN app_private.has_role(ARRAY['department_leader']) THEN EXISTS (
        SELECT 1
        FROM public.department_members dm
        WHERE dm.member_id = target
          AND dm.department_id IN (SELECT app_private.led_department_ids())
      )
      ELSE false
    END;
$$;

-- Restricted welfare stays with PE and welfare officers, not the Secretary by default.
CREATE OR REPLACE FUNCTION app_private.can_read_welfare()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder'])
      OR app_private.is_welfare_officer();
$$;

ALTER TABLE public.ministry_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ministry_children_select ON public.ministry_children;
CREATE POLICY ministry_children_select ON public.ministry_children
  FOR SELECT TO authenticated
  USING (
    app_private.can_read_children()
    OR parent_member_id = app_private.member_id()
  );

DROP POLICY IF EXISTS ministry_children_write ON public.ministry_children;
CREATE POLICY ministry_children_write ON public.ministry_children
  FOR ALL TO authenticated
  USING (app_private.can_read_children())
  WITH CHECK (app_private.can_read_children());

DROP POLICY IF EXISTS approvals_select ON public.approvals;
CREATE POLICY approvals_select ON public.approvals
  FOR SELECT TO authenticated
  USING (app_private.can_read_approvals(approvals));

DROP POLICY IF EXISTS approvals_insert ON public.approvals;
CREATE POLICY approvals_insert ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS approvals_update ON public.approvals;
CREATE POLICY approvals_update ON public.approvals
  FOR UPDATE TO authenticated
  USING (app_private.has_role(ARRAY['presiding_elder']))
  WITH CHECK (app_private.has_role(ARRAY['presiding_elder']));

GRANT SELECT, INSERT, UPDATE ON public.ministry_children TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_children() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_read_approvals(public.approvals) TO authenticated;
