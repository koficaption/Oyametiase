CREATE OR REPLACE FUNCTION public.log_audit_bridge(
  p_action text,
  p_module text,
  p_record_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT app_private.log_audit(p_action, p_module, p_record_id, p_metadata);
$$;

REVOKE ALL ON FUNCTION public.log_audit_bridge(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_bridge(text, text, text, jsonb) TO authenticated;
