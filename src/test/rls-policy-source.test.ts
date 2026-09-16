import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rls = readFileSync("supabase/migrations/20260913000002_rls_helpers_and_policies.sql", "utf8");
const portals = readFileSync("supabase/migrations/20260913000006_portals_children_approvals.sql", "utf8");
const departmentFinance = readFileSync("supabase/migrations/20260913000007_department_finance.sql", "utf8");
const registration = readFileSync("supabase/migrations/20260913000008_registration_approval.sql", "utf8");
const openAccess = readFileSync("supabase/migrations/20260913170023_open_registration_access.sql", "utf8");
const officerOnly = readFileSync("supabase/migrations/20260913172050_officer_only_registration.sql", "utf8");
const themes = readFileSync("supabase/migrations/20260913000009_church_themes_and_reports.sql", "utf8");
const publicTheme = readFileSync("supabase/migrations/20260913233300_public_active_church_theme.sql", "utf8");

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

  it("isolates ministry money from assembly treasury", () => {
    expect(departmentFinance).toContain("ADD COLUMN IF NOT EXISTS department_id");
    expect(departmentFinance).toContain("can_read_transaction");
    expect(departmentFinance).toContain("can_write_transaction");
    expect(departmentFinance).toContain("leads_department");
    expect(departmentFinance).toContain("txn.department_id IS NULL");
    expect(departmentFinance).toContain("department_leader");
  });

  it("records church office on public sign-ups without reading user_metadata roles", () => {
    expect(registration).toContain("'member'");
    expect(registration).toContain("requested_system_role");
    expect(registration).toContain("church_position");
    expect(registration).toContain("church_responsibility");
    expect(registration).toContain("Only the Presiding Elder can change roles");
    expect(registration).toContain("lookup_login_email");
  });

  it("opens public accounts immediately and bootstraps the first real Presiding Elder", () => {
    expect(openAccess).toContain("assigned_role := 'presiding_elder'");
    expect(openAccess).toContain("%@oyametiase.local");
    expect(openAccess).toContain("account_status SET DEFAULT 'active'");
    expect(openAccess).toContain("approval_status SET DEFAULT 'approved'");
    expect(openAccess).not.toContain("raw_user_meta_data->>'role");
    expect(officerOnly).toContain("assigned_status text := 'pending'");
    expect(officerOnly).toContain("assigned_role := 'presiding_elder'");
  });

  it("stores church themes by year and limits writes to the Presiding Elder", () => {
    expect(themes).toContain("CREATE TABLE IF NOT EXISTS public.church_themes");
    expect(themes).toContain("UNIQUE (assembly_id, year)");
    expect(themes).toContain("The Church Unleashed to Transform Society Through the Gospel and the Power of the Holy Spirit.");
    expect(themes).toContain("ensure_single_active_theme");
    expect(themes).toContain("app_private.is_admin()");
    expect(themes).toContain("welfare_payments");
    expect(themes).toContain("can_write_welfare");
    expect(themes).toContain("treasurer");
    expect(publicTheme).toContain("church_themes_public_active");
    expect(publicTheme).toContain("GRANT SELECT ON public.church_themes TO anon");
  });

  it("isolates children records and approvals", () => {
    expect(portals).toContain("ministry_children");
    expect(portals).toContain("can_read_children");
    expect(portals).toContain("CREATE TABLE IF NOT EXISTS public.approvals");
    expect(portals).not.toContain("WHEN app_private.has_role(ARRAY['treasurer']) THEN EXISTS");
  });
});
