-- The login page shows the official church theme before anyone signs in.
DROP POLICY IF EXISTS church_themes_public_active ON public.church_themes;
CREATE POLICY church_themes_public_active ON public.church_themes
  FOR SELECT TO anon
  USING (is_active = true AND archived_at IS NULL);

GRANT SELECT ON public.church_themes TO anon;
