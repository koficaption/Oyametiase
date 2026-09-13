import { describe, expect, it } from "vitest";
import { navForPortal } from "@/lib/navigation";
import { PORTAL_CHROME, resolvePortal, type LedDepartment } from "@/types/portals";

const pwm: LedDepartment = { id: "1", name: "PWM", slug: "pwm", ministry_kind: "pwm", logo_url: null };
const pmm: LedDepartment = { id: "2", name: "PMM", slug: "pmm", ministry_kind: "pmm", logo_url: null };
const pym: LedDepartment = { id: "3", name: "PYM", slug: "pym", ministry_kind: "pym", logo_url: null };
const children: LedDepartment = { id: "4", name: "Children", slug: "children", ministry_kind: "children", logo_url: null };

describe("portal resolution", () => {
  it("keeps the Presiding Elder on the assembly portal even if they lead PMM", () => {
    expect(resolvePortal("presiding_elder", [pmm])).toBe("presiding_elder");
  });

  it("maps ministry leaders to their own portals", () => {
    expect(resolvePortal("department_leader", [pwm])).toBe("womens");
    expect(resolvePortal("department_leader", [pmm])).toBe("mens");
    expect(resolvePortal("department_leader", [pym])).toBe("youth");
    expect(resolvePortal("department_leader", [children])).toBe("children");
  });

  it("does not give ordinary members a CMS portal", () => {
    expect(resolvePortal("member")).toBe("member");
    expect(navForPortal("member")).toEqual([]);
  });

  it("gives the Presiding Elder church theme and full assembly navigation", () => {
    const hrefs = navForPortal("presiding_elder").map((item) => item.href);
    expect(hrefs).toContain("/app/themes");
    expect(hrefs).toContain("/app/reports");
    expect(hrefs).toContain("/app/approvals");
    expect(navForPortal("secretary").map((item) => item.href)).not.toContain("/app/themes");
    expect(navForPortal("treasurer").map((item) => item.href)).not.toContain("/app/themes");
    expect(navForPortal("presiding_elder").map((item) => item.href)).toContain("/app/notifications");
    expect(navForPortal("secretary").map((item) => item.href)).toContain("/app/notifications");
    expect(navForPortal("womens").map((item) => item.href)).toContain("/app/notifications");
  });

  it("gives each officer desk a different name and colour", () => {
    expect(PORTAL_CHROME.presiding_elder.desk).toContain("Assembly");
    expect(PORTAL_CHROME.secretary.desk).toContain("Records");
    expect(PORTAL_CHROME.treasurer.desk).toContain("treasury");
    expect(PORTAL_CHROME.womens.desk).toContain("Women");
    expect(PORTAL_CHROME.treasurer.sidebar).not.toBe(PORTAL_CHROME.secretary.sidebar);
    expect(PORTAL_CHROME.womens.sidebar).not.toBe(PORTAL_CHROME.mens.sidebar);
  });

  it("keeps the Treasurer on finance navigation only", () => {
    const hrefs = navForPortal("treasurer").map((item) => item.href);
    expect(hrefs.every((href) => href.startsWith("/app/dashboard") || href.includes("finance") || href.includes("documents") || href.includes("reports") || href.includes("notifications") || href.includes("portal"))).toBe(true);
    expect(hrefs).not.toContain("/app/department-finance");
    expect(hrefs.some((href) => href.includes("members"))).toBe(false);
  });

  it("gives the Treasurer a distinct path for each finance book", () => {
    const hrefs = navForPortal("treasurer").map((item) => item.href);
    expect(hrefs).toContain("/app/finance/tithes");
    expect(hrefs).toContain("/app/finance/offerings");
    expect(hrefs).toContain("/app/finance/donations");
    expect(hrefs).toContain("/app/finance/income");
    expect(hrefs).toContain("/app/finance/expenses");
    expect(hrefs).toContain("/app/finance");
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.some((href) => href.includes("kind="))).toBe(false);
  });

  it("does not reuse the same path for Children register, guardians, and classes", () => {
    const hrefs = navForPortal("children").map((item) => item.href);
    expect(hrefs).toContain("/app/children");
    expect(hrefs).toContain("/app/children?section=guardians");
    expect(hrefs).toContain("/app/children?section=classes");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives ministry leaders their own finance page, not assembly treasury", () => {
    const hrefs = navForPortal("womens").map((item) => item.href);
    expect(hrefs).toContain("/app/department-finance");
    expect(hrefs).not.toContain("/app/finance");
    expect(navForPortal("womens").some((item) => item.label === "Women Members")).toBe(true);
    expect(navForPortal("children").map((item) => item.href)).toContain("/app/department-finance");
    expect(navForPortal("treasurer").map((item) => item.href)).not.toContain("/app/department-finance");
    expect(navForPortal("ministry_finance").map((item) => item.href)).toContain("/app/department-finance");
    expect(navForPortal("ministry_finance").map((item) => item.href)).not.toContain("/app/members");
    expect(navForPortal("children_teacher").map((item) => item.href)).toContain("/app/children");
    expect(navForPortal("children_teacher").map((item) => item.href)).not.toContain("/app/department-finance");
  });
});

