-- Annual church themes (year-based, not hard-coded) and welfare payment records
-- used by official reports. Treasurer may read welfare amounts for reports only.

CREATE TABLE IF NOT EXISTS public.church_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  year int NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  title text NOT NULL,
  scripture text,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, year)
);

DROP TRIGGER IF EXISTS church_themes_updated_at ON public.church_themes;
CREATE TRIGGER church_themes_updated_at
  BEFORE UPDATE ON public.church_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS church_themes_active_idx
  ON public.church_themes (assembly_id, is_active)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_single_active_theme()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.church_themes
    SET is_active = false
    WHERE assembly_id = NEW.assembly_id
      AND id IS DISTINCT FROM NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS church_themes_single_active ON public.church_themes;
CREATE TRIGGER church_themes_single_active
  BEFORE INSERT OR UPDATE OF is_active ON public.church_themes
  FOR EACH ROW
  WHEN (NEW.is_active)
  EXECUTE FUNCTION public.ensure_single_active_theme();

INSERT INTO public.church_themes (assembly_id, year, title, scripture, description, is_active)
SELECT
  a.id,
  2026,
  'The Church Unleashed to Transform Society Through the Gospel and the Power of the Holy Spirit.',
  NULL,
  'Official annual theme for The Church of Pentecost, Oyame Tiase Assembly.',
  true
FROM public.assemblies a
ON CONFLICT (assembly_id, year) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = true,
  archived_at = NULL;

INSERT INTO public.church_themes (assembly_id, year, title, scripture, description, is_active)
SELECT
  a.id,
  2027,
  'New theme to be entered by authorized leadership.',
  NULL,
  'Placeholder until the Presiding Elder records the 2027 theme.',
  false
FROM public.assemblies a
ON CONFLICT (assembly_id, year) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.welfare_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.welfare_cases (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS welfare_payments_case_idx ON public.welfare_payments (case_id);
CREATE INDEX IF NOT EXISTS welfare_payments_date_idx ON public.welfare_payments (assembly_id, paid_on);

-- Treasurer may read welfare figures for reports. Case writes stay with PE / welfare officers.
CREATE OR REPLACE FUNCTION app_private.can_read_welfare()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder', 'treasurer'])
      OR app_private.is_welfare_officer();
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_welfare()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.has_role(ARRAY['presiding_elder'])
      OR app_private.is_welfare_officer();
$$;

DROP POLICY IF EXISTS welfare_write ON public.welfare_cases;
CREATE POLICY welfare_write ON public.welfare_cases
  FOR ALL TO authenticated
  USING (app_private.can_write_welfare())
  WITH CHECK (app_private.can_write_welfare());

ALTER TABLE public.church_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welfare_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS church_themes_select ON public.church_themes;
CREATE POLICY church_themes_select ON public.church_themes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS church_themes_write ON public.church_themes;
CREATE POLICY church_themes_write ON public.church_themes
  FOR ALL TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

DROP POLICY IF EXISTS welfare_payments_select ON public.welfare_payments;
CREATE POLICY welfare_payments_select ON public.welfare_payments
  FOR SELECT TO authenticated
  USING (app_private.can_read_welfare());

DROP POLICY IF EXISTS welfare_payments_write ON public.welfare_payments;
CREATE POLICY welfare_payments_write ON public.welfare_payments
  FOR ALL TO authenticated
  USING (app_private.can_write_welfare())
  WITH CHECK (app_private.can_write_welfare());

GRANT SELECT ON public.church_themes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.church_themes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welfare_payments TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_write_welfare() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_single_active_theme() TO authenticated;
