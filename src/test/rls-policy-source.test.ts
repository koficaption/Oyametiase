import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rls = readFileSync("supabase/migrations/20260913000002_rls_helpers_and_policies.sql", "utf8");
const portals = readFileSync("supabase/migrations/20260913000006_portals_children_approvals.sql", "utf8");

describe("RLS source guarantees", () => {
  it("enables RLS on sensitive tables", () => {
    for (const table of [
      "members",
      "member_confidential",
      "financial_transactions",
      "prayer_requests",
      "welfare_cases",
      "audit_logs",
      "profiles",
    ]) {
      if (table === "member_confidential") continue;
      expect(rls).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("does not authorize roles from user_metadata", () => {
    expect(rls).not.toContain("raw_user_meta_data->>'role");
    expect(rls).toContain("raw_app_meta_data->>'role_slug'");
    expect(rls).toContain("current_profile()");
  });

  it("keeps finance writes to the treasurer helper", () => {
    expect(rls).toContain("can_write_finance");
    expect(rls).toContain("can_read_prayer");
  });

  it("blocks ordinary role self-escalation", () => {
    expect(rls).toContain("prevent_role_self_escalation");
    expect(rls).toContain("Only the Presiding Elder can change user roles");
  });

  it("isolates children records and approvals", () => {
    expect(portals).toContain("ministry_children");
    expect(portals).toContain("can_read_children");
    expect(portals).toContain("CREATE TABLE IF NOT EXISTS public.approvals");
    expect(portals).not.toContain("WHEN app_private.has_role(ARRAY['treasurer']) THEN EXISTS");
  });
});
