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

  it("disambiguates welfare_cases.members via the assisted member", () => {
    const reports = readFileSync("src/lib/reports/build.ts", "utf8");
    const welfare = readFileSync("src/app/app/welfare/page.tsx", "utf8");
    expect(reports).toContain("members!welfare_cases_member_id_fkey");
    expect(welfare).toContain("members!welfare_cases_member_id_fkey");
  });
});
