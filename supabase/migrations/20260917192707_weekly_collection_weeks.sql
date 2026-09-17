-- Optional name for a collection week, e.g. "Last supper week".
-- Money still lives on tagged financial_transactions; this table only stores the label
-- because transaction amounts must be greater than zero.

CREATE TABLE IF NOT EXISTS public.weekly_collection_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.assemblies (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  label text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, week_start),
  CONSTRAINT weekly_collection_weeks_monday_chk
    CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  CONSTRAINT weekly_collection_weeks_label_len_chk
    CHECK (char_length(label) <= 120)
);

COMMENT ON TABLE public.weekly_collection_weeks IS
  'Treasurer-entered name for a Monday-start collection week, such as Last supper week.';

DROP TRIGGER IF EXISTS weekly_collection_weeks_updated_at ON public.weekly_collection_weeks;
CREATE TRIGGER weekly_collection_weeks_updated_at
  BEFORE UPDATE ON public.weekly_collection_weeks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.weekly_collection_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_collection_weeks_select ON public.weekly_collection_weeks;
CREATE POLICY weekly_collection_weeks_select ON public.weekly_collection_weeks
  FOR SELECT TO authenticated
  USING (app_private.can_read_finance());

DROP POLICY IF EXISTS weekly_collection_weeks_insert ON public.weekly_collection_weeks;
CREATE POLICY weekly_collection_weeks_insert ON public.weekly_collection_weeks
  FOR INSERT TO authenticated
  WITH CHECK (app_private.can_write_finance());

DROP POLICY IF EXISTS weekly_collection_weeks_update ON public.weekly_collection_weeks;
CREATE POLICY weekly_collection_weeks_update ON public.weekly_collection_weeks
  FOR UPDATE TO authenticated
  USING (app_private.can_write_finance())
  WITH CHECK (app_private.can_write_finance());

DROP POLICY IF EXISTS weekly_collection_weeks_delete ON public.weekly_collection_weeks;
CREATE POLICY weekly_collection_weeks_delete ON public.weekly_collection_weeks
  FOR DELETE TO authenticated
  USING (app_private.can_write_finance());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_collection_weeks TO authenticated;

NOTIFY pgrst, 'reload schema';
