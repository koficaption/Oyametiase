import { describe, expect, it } from "vitest";
import { navForPortal } from "@/lib/navigation";
import { resolvePortal, type LedDepartment } from "@/types/portals";

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

  it("does not put members on an administration dashboard", () => {
    expect(resolvePortal("member")).toBe("member");
    expect(navForPortal("member").some((item) => item.href === "/app/finance")).toBe(false);
    expect(navForPortal("member").some((item) => item.href === "/app/users")).toBe(false);
  });

  it("keeps the Treasurer on finance navigation only", () => {
    const hrefs = navForPortal("treasurer").map((item) => item.href);
    expect(hrefs.every((href) => href.startsWith("/app/dashboard") || href.includes("finance") || href.includes("documents") || href.includes("reports"))).toBe(true);
    expect(hrefs.some((href) => href.includes("members"))).toBe(false);
  });

  it("does not show finance to a Women's leader", () => {
    expect(navForPortal("womens").some((item) => item.href.includes("finance"))).toBe(false);
    expect(navForPortal("womens").some((item) => item.label === "Women Members")).toBe(true);
  });
});
