import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PostgREST relationship embeds", () => {
  it("disambiguates members.departments via primary_department_id", () => {
    const queries = readFileSync("src/lib/data/queries.ts", "utf8");
    const profile = readFileSync("src/app/app/members/[id]/page.tsx", "utf8");
    expect(queries).toContain("departments!primary_department_id(name)");
    expect(profile).toContain("departments!primary_department_id(name)");
    expect(queries).not.toContain('select("*, departments(name)"');
  });
});
