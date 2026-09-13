import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAudit(
  supabase: SupabaseClient,
  input: {
    action: string;
    module: string;
    recordId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.rpc("log_audit_bridge", {
    p_action: input.action,
    p_module: input.module,
    p_record_id: input.recordId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    await supabase.from("audit_logs").insert({
      action: input.action,
      module: input.module,
      record_id: input.recordId ?? null,
      metadata: input.metadata ?? {},
    });
  }
}
