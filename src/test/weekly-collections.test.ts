import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mondayOfWeek,
  parseMoneyInput,
  shiftWeek,
  weekDays,
  weekTotals,
} from "@/lib/weekly-collections";

describe("weekly collection sheet", () => {
  it("starts the week on Monday and ends on Sunday", () => {
    expect(mondayOfWeek("2026-09-16")).toBe("2026-09-14");
    expect(mondayOfWeek("2026-09-14")).toBe("2026-09-14");
    expect(mondayOfWeek("2026-09-20")).toBe("2026-09-14");
    const days = weekDays("2026-09-16");
    expect(days.map((day) => day.label)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(days[0].iso).toBe("2026-09-14");
    expect(days[6].iso).toBe("2026-09-20");
    expect(days[6].isSunday).toBe(true);
    expect(shiftWeek("2026-09-14", 1)).toBe("2026-09-21");
  });

  it("adds Sunday school to the church amount for the day and week totals", () => {
    const totals = weekTotals([
      { church: 20, sundaySchool: 0 },
      { church: 10, sundaySchool: 0 },
      { church: 0, sundaySchool: 0 },
      { church: 0, sundaySchool: 0 },
      { church: 0, sundaySchool: 0 },
      { church: 0, sundaySchool: 0 },
      { church: 400, sundaySchool: 80 },
    ]);
    expect(totals.church).toBe(430);
    expect(totals.sundaySchool).toBe(80);
    expect(totals.combined).toBe(510);
  });

  it("treats a blank cell as zero and rejects a negative amount", () => {
    expect(parseMoneyInput("")).toBe(0);
    expect(parseMoneyInput(" 12.50 ")).toBe(12.5);
    expect(parseMoneyInput("-1")).toBeNull();
  });

  it("keeps Sunday school on the assembly books, not a separate ministry book", () => {
    const sql = readFileSync("supabase/migrations/20260917191553_sunday_school_offerings_category.sql", "utf8");
    expect(sql).toContain("sunday-school-offerings");
    expect(sql).toContain("Sunday school offerings");
    const action = readFileSync("src/actions/operations.ts", "utf8");
    expect(action).toContain("saveWeeklyCollectionsAction");
    expect(action).toContain("requirePermission(\"finance.manage\")");
    expect(action).toContain("WEEKLY_SUNDAY_SCHOOL_REF");
  });
});
