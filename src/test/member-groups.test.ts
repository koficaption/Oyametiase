import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MEMBER_GROUPS,
  canChooseMemberGroup,
  defaultMemberGroup,
  isMemberGroupKey,
} from "@/lib/members/groups";

describe("member groups", () => {
  it("groups the register as Men's, Women's, Youth, and Children", () => {
    expect(MEMBER_GROUPS.map((group) => group.label)).toEqual(["Men's", "Women's", "Youth", "Children"]);
    expect(MEMBER_GROUPS.map((group) => group.slug)).toEqual(["pmm", "pwm", "pym", "children"]);
    expect(isMemberGroupKey("men")).toBe(true);
    expect(isMemberGroupKey("visitors")).toBe(false);
  });

  it("lets only the Presiding Elder and Secretary switch groups", () => {
    expect(canChooseMemberGroup("presiding_elder")).toBe(true);
    expect(canChooseMemberGroup("secretary")).toBe(true);
    expect(canChooseMemberGroup("womens")).toBe(false);
    expect(defaultMemberGroup("womens")).toBe("women");
    expect(defaultMemberGroup("mens")).toBe("men");
    expect(defaultMemberGroup("youth")).toBe("youth");
    expect(defaultMemberGroup("children")).toBe("children");
  });

  it("keeps the officer list off the login page and shows the church theme instead", () => {
    const login = readFileSync("src/app/(auth)/login/page.tsx", "utf8");
    expect(login).not.toContain("Sign in as Presiding Elder");
    expect(login).toContain("themeTitle");
    expect(login).toContain("getActiveTheme");
  });
});
