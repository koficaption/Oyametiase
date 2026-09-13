import { describe, expect, it } from "vitest";
import { periodLabel, resolvePeriod } from "@/lib/reports/period";
import { allowedReportTypes, canGenerateReport } from "@/lib/reports/permissions";
import { EMPTY_PERIOD } from "@/lib/reports/types";

describe("report filters and permissions", () => {
  it("resolves year, month, and date range windows", () => {
    expect(resolvePeriod({ year: 2026 })).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(resolvePeriod({ year: 2026, month: 2 })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(resolvePeriod({ year: 2027, from: "2027-03-01", to: "2027-03-31" })).toEqual({
      from: "2027-03-01",
      to: "2027-03-31",
    });
    expect(periodLabel({ year: 2026 })).toBe("Year 2026");
  });

  it("keeps report generation on the correct offices", () => {
    expect(canGenerateReport("presiding_elder", "annual")).toBe(true);
    expect(canGenerateReport("presiding_elder", "finance")).toBe(true);
    expect(canGenerateReport("secretary", "membership")).toBe(true);
    expect(canGenerateReport("secretary", "finance")).toBe(false);
    expect(canGenerateReport("secretary", "welfare")).toBe(false);
    expect(canGenerateReport("treasurer", "finance")).toBe(true);
    expect(canGenerateReport("treasurer", "welfare")).toBe(true);
    expect(canGenerateReport("treasurer", "membership")).toBe(false);
    expect(canGenerateReport("department_leader", "department")).toBe(true);
    expect(canGenerateReport("department_leader", "finance")).toBe(false);
    expect(canGenerateReport("member", "annual")).toBe(false);
    expect(allowedReportTypes("member")).toEqual([]);
  });

  it("uses a clear empty-period message instead of invented numbers", () => {
    expect(EMPTY_PERIOD).toBe("No data available for this period.");
  });
});
