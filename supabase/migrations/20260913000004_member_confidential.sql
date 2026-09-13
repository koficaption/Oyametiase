-- Split pastoral / contact fields so a Treasurer cannot SELECT them
-- even if they can see a member directory row for tithe recording.

CREATE TABLE public.member_confidential (
  member_id uuid PRIMARY KEY REFERENCES public.members (id) ON DELETE CASCADE,
  phone text,
  email citext,
  residential_address text,
  date_of_birth date,
  occupation text,
  marital_status public.marital_status,
  emergency_contact_name text,
  emergency_relationship text,
  emergency_phone text,
  notes text,
  previous_assembly text,
  transfer_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER member_confidential_updated_at
  BEFORE UPDATE ON public.member_confidential
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.member_confidential (
  member_id, phone, email, residential_address, date_of_birth, occupation,
  marital_status, emergency_contact_name, emergency_relationship, emergency_phone,
  notes, previous_assembly, transfer_notes
)
SELECT
  id, phone, email, residential_address, date_of_birth, occupation,
  marital_status, emergency_contact_name, emergency_relationship, emergency_phone,
  notes, previous_assembly, transfer_notes
FROM public.members;

ALTER TABLE public.members
  DROP COLUMN phone,
  DROP COLUMN email,
  DROP COLUMN residential_address,
  DROP COLUMN date_of_birth,
  DROP COLUMN occupation,
  DROP COLUMN marital_status,
  DROP COLUMN emergency_contact_name,
  DROP COLUMN emergency_relationship,
  DROP COLUMN emergency_phone,
  DROP COLUMN notes,
  DROP COLUMN previous_assembly,
  DROP COLUMN transfer_notes;

CREATE OR REPLACE FUNCTION public.sync_member_confidential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.member_confidential (member_id)
  VALUES (NEW.id)
  ON CONFLICT (member_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER members_confidential_row
  AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_confidential();

ALTER TABLE public.member_confidential ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_confidential_select ON public.member_confidential
  FOR SELECT TO authenticated
  USING (
    app_private.is_leadership()
    OR member_id = app_private.member_id()
  );

CREATE POLICY member_confidential_write ON public.member_confidential
  FOR ALL TO authenticated
  USING (
    app_private.is_leadership()
    OR member_id = app_private.member_id()
  )
  WITH CHECK (
    app_private.is_leadership()
    OR member_id = app_private.member_id()
  );

-- Members may update only a subset of their confidential fields (enforced in actions too).
