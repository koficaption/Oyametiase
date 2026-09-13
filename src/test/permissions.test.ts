import { describe, expect, it } from "vitest";
import {
  hasPermission,
  ROLE_PERMISSIONS,
  type Permission,
  type RoleSlug,
} from "@/types/roles";

describe("authorization matrix", () => {
  it("gives the Presiding Elder assembly oversight without cashier write access", () => {
    expect(hasPermission("presiding_elder", "users.manage")).toBe(true);
    expect(hasPermission("presiding_elder", "audit.view")).toBe(true);
    expect(hasPermission("presiding_elder", "finance.view")).toBe(true);
    expect(hasPermission("presiding_elder", "finance.manage")).toBe(false);
    expect(hasPermission("presiding_elder", "finance.department")).toBe(true);
    expect(hasPermission("presiding_elder", "settings.manage")).toBe(true);
    expect(hasPermission("presiding_elder", "themes.manage")).toBe(true);
    expect(hasPermission("presiding_elder", "reports.admin")).toBe(true);
    expect(hasPermission("presiding_elder", "reports.finance")).toBe(true);
    expect(hasPermission("presiding_elder", "reports.welfare")).toBe(true);
  });

  it("keeps the Secretary off unrestricted finance", () => {
    expect(hasPermission("secretary", "members.manage")).toBe(true);
    expect(hasPermission("presiding_elder", "members.manage")).toBe(true);
    expect(hasPermission("secretary", "reports.admin")).toBe(true);
    expect(hasPermission("secretary", "finance.view")).toBe(false);
    expect(hasPermission("secretary", "finance.manage")).toBe(false);
    expect(hasPermission("secretary", "finance.department")).toBe(false);
    expect(hasPermission("secretary", "users.manage")).toBe(false);
    expect(hasPermission("secretary", "welfare.view")).toBe(false);
    expect(hasPermission("secretary", "prayer.moderate")).toBe(false);
    expect(hasPermission("secretary", "settings.manage")).toBe(false);
    expect(hasPermission("secretary", "audit.view")).toBe(false);
    expect(hasPermission("secretary", "themes.manage")).toBe(false);
    expect(hasPermission("secretary", "reports.finance")).toBe(false);
    expect(hasPermission("secretary", "reports.welfare")).toBe(false);
  });

  it("limits the Treasurer to finance work", () => {
    expect(hasPermission("treasurer", "finance.manage")).toBe(true);
    expect(hasPermission("treasurer", "finance.department")).toBe(false);
    expect(hasPermission("treasurer", "members.view")).toBe(false);
    expect(hasPermission("treasurer", "members.sensitive")).toBe(false);
    expect(hasPermission("treasurer", "prayer.moderate")).toBe(false);
    expect(hasPermission("treasurer", "settings.manage")).toBe(false);
    expect(hasPermission("treasurer", "users.manage")).toBe(false);
    expect(hasPermission("treasurer", "reports.finance")).toBe(true);
    expect(hasPermission("treasurer", "reports.welfare")).toBe(true);
    expect(hasPermission("treasurer", "reports.admin")).toBe(false);
    expect(hasPermission("treasurer", "welfare.view")).toBe(false);
    expect(hasPermission("treasurer", "themes.manage")).toBe(false);
  });

  it("does not give department leaders assembly-wide sensitive access", () => {
    expect(hasPermission("department_leader", "members.view")).toBe(true);
    expect(hasPermission("department_leader", "members.manage")).toBe(false);
    expect(hasPermission("member", "members.manage")).toBe(false);
    expect(hasPermission("department_leader", "finance.view")).toBe(false);
    expect(hasPermission("department_leader", "finance.manage")).toBe(false);
    expect(hasPermission("department_leader", "finance.department")).toBe(true);
    expect(hasPermission("department_leader", "welfare.view")).toBe(false);
    expect(hasPermission("department_leader", "reports.department")).toBe(true);
    expect(hasPermission("department_leader", "users.manage")).toBe(false);
  });

  it("limits ministry financial secretaries to ministry books", () => {
    expect(hasPermission("ministry_finance", "finance.department")).toBe(true);
    expect(hasPermission("ministry_finance", "finance.view")).toBe(false);
    expect(hasPermission("ministry_finance", "finance.manage")).toBe(false);
    expect(hasPermission("ministry_finance", "members.view")).toBe(false);
    expect(hasPermission("ministry_finance", "users.manage")).toBe(false);
  });

  it("limits children's teachers to class records", () => {
    expect(hasPermission("children_teacher", "children.view")).toBe(true);
    expect(hasPermission("children_teacher", "children.manage")).toBe(false);
    expect(hasPermission("children_teacher", "finance.department")).toBe(false);
    expect(hasPermission("children_teacher", "members.manage")).toBe(false);
  });

  it("keeps members in the portal", () => {
    expect(hasPermission("member", "prayer.submit")).toBe(true);
    expect(hasPermission("member", "members.view")).toBe(false);
    expect(hasPermission("member", "finance.view")).toBe(false);
    expect(hasPermission("member", "audit.view")).toBe(false);
    expect(hasPermission("member", "settings.manage")).toBe(false);
    expect(hasPermission("member", "reports.admin")).toBe(false);
    expect(hasPermission("member", "reports.finance")).toBe(false);
    expect(hasPermission("member", "themes.manage")).toBe(false);
  });

  it("never allows a member to escalate through the client permission map", () => {
    const memberPerms = ROLE_PERMISSIONS.member;
    const forbidden: Permission[] = ["users.manage", "finance.manage", "audit.view"];
    for (const permission of forbidden) {
      expect(memberPerms).not.toContain(permission);
    }
  });

  it("rejects unknown roles", () => {
    expect(hasPermission("bishop" as RoleSlug, "users.manage")).toBe(false);
  });
});
