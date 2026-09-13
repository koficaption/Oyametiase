-- Private storage buckets. No public ACLs for pastoral or financial files.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('member-photos', 'member-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('event-media', 'event-media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('announcement-media', 'announcement-media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('assembly-assets', 'assembly-assets', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('finance-documents', 'finance-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('welfare-documents', 'welfare-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('member-documents', 'member-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_member_photos_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'member-photos');

CREATE POLICY storage_member_photos_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-photos' AND app_private.is_leadership());

CREATE POLICY storage_member_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'member-photos' AND app_private.is_leadership())
  WITH CHECK (bucket_id = 'member-photos' AND app_private.is_leadership());

CREATE POLICY storage_event_media_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-media');

CREATE POLICY storage_event_media_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'event-media' AND app_private.is_leadership())
  WITH CHECK (bucket_id = 'event-media' AND app_private.is_leadership());

CREATE POLICY storage_announcement_media_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'announcement-media');

CREATE POLICY storage_announcement_media_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'announcement-media' AND (app_private.is_leadership() OR app_private.has_role(ARRAY['department_leader'])))
  WITH CHECK (bucket_id = 'announcement-media' AND (app_private.is_leadership() OR app_private.has_role(ARRAY['department_leader'])));

CREATE POLICY storage_assembly_assets_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assembly-assets');

CREATE POLICY storage_assembly_assets_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'assembly-assets' AND app_private.is_admin())
  WITH CHECK (bucket_id = 'assembly-assets' AND app_private.is_admin());

CREATE POLICY storage_documents_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.storage_path = name
        AND app_private.can_read_document(d)
    )
  );

CREATE POLICY storage_documents_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND app_private.is_leadership())
  WITH CHECK (bucket_id = 'documents' AND app_private.is_leadership());

CREATE POLICY storage_finance_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'finance-documents' AND app_private.can_read_finance());

CREATE POLICY storage_finance_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'finance-documents' AND app_private.can_write_finance())
  WITH CHECK (bucket_id = 'finance-documents' AND app_private.can_write_finance());

CREATE POLICY storage_welfare_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'welfare-documents' AND app_private.can_read_welfare());

CREATE POLICY storage_welfare_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'welfare-documents' AND app_private.can_read_welfare())
  WITH CHECK (bucket_id = 'welfare-documents' AND app_private.can_read_welfare());

CREATE POLICY storage_member_docs_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'member-documents'
    AND (
      app_private.is_leadership()
      OR (storage.foldername(name))[1] = app_private.member_id()::text
    )
  );

CREATE POLICY storage_member_docs_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'member-documents' AND app_private.is_leadership())
  WITH CHECK (bucket_id = 'member-documents' AND app_private.is_leadership());

-- Limited directory for roles that must not see pastoral notes / emergency contacts.
CREATE VIEW public.member_directory
WITH (security_invoker = true)
AS
SELECT
  id,
  assembly_id,
  member_code,
  first_name,
  middle_name,
  last_name,
  gender,
  membership_status,
  primary_department_id,
  photo_url,
  date_joined
FROM public.members
WHERE archived_at IS NULL;

GRANT SELECT ON public.member_directory TO authenticated;

-- Treasurer member visibility is limited: they may see directory rows they can already
-- read through members RLS. They do not get a bypass around pastoral notes.

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
      WHEN app_private.has_role(ARRAY['treasurer', 'worker']) THEN EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = target
          AND m.archived_at IS NULL
          AND m.membership_status IN ('active', 'new_convert', 'inactive')
      )
      ELSE false
    END;
$$;

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
