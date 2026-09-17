-- Date and time for a named collection week, e.g. Youth week on a Sunday at 9:00.

ALTER TABLE public.weekly_collection_weeks
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_time time;

COMMENT ON COLUMN public.weekly_collection_weeks.event_date IS
  'Service or programme date for this named week, such as Youth week.';
COMMENT ON COLUMN public.weekly_collection_weeks.event_time IS
  'Service or programme time for this named week.';

NOTIFY pgrst, 'reload schema';
