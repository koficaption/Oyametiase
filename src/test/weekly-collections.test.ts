import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mondayOfWeek,
  normalizeWeekLabel,
  parseMoneyInput,
  shiftWeek,
  sundaySchoolForDay,
  weekDays,
  weekTotals,
} from "@/lib/weekly-collections";
import { weeklyCollectionsSchema } from "@/lib/validations/operations";

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

  it("adds Sunday school to the church amount for Sunday and the week totals", () => {
    const days = weekDays("2026-09-14");
    const totals = weekTotals(
      days.map((day, index) => ({
        church: index === 0 ? 20 : index === 1 ? 10 : index === 6 ? 400 : 0,
        sundaySchool: index === 1 ? 50 : index === 6 ? 80 : 0,
        isSunday: day.isSunday,
      })),
    );
    expect(totals.church).toBe(430);
    expect(totals.sundaySchool).toBe(80);
    expect(totals.combined).toBe(510);
  });

  it("keeps Sunday school off every day except Sunday", () => {
    expect(sundaySchoolForDay(false, 40)).toBe(0);
    expect(sundaySchoolForDay(true, 40)).toBe(40);
  });

  it("stores a free-text week name such as Last supper week", () => {
    expect(normalizeWeekLabel("  Last   supper week ")).toBe("Last supper week");
    expect(normalizeWeekLabel("x".repeat(200)).length).toBe(120);
    const days = weekDays("2026-09-14").map((day) => ({
      occurred_on: day.iso,
      church: 0,
      sunday_school: 0,
    }));
    expect(
      weeklyCollectionsSchema.safeParse({
        week_start: "2026-09-14",
        week_label: "Last supper week",
        days,
      }).success,
    ).toBe(true);
    expect(
      weeklyCollectionsSchema.safeParse({
        week_start: "2026-09-14",
        week_label: "x".repeat(121),
        days,
      }).success,
    ).toBe(false);
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
    expect(action).toContain("sundaySchoolForDay");
    expect(action).toContain("week_label");
    expect(action).toContain("weekly_collection_weeks");
  });

  it("lets the treasurer name a week and collect Sunday school only on Sunday", () => {
    const weeks = readFileSync("supabase/migrations/20260917192707_weekly_collection_weeks.sql", "utf8");
    expect(weeks).toContain("CREATE TABLE IF NOT EXISTS public.weekly_collection_weeks");
    expect(weeks).toContain("can_read_finance");
    expect(weeks).toContain("can_write_finance");
    expect(weeks).toContain("Last supper week");
    const sheet = readFileSync("src/components/finance/weekly-collection-sheet.tsx", "utf8");
    expect(sheet).toContain("What week is this?");
    expect(sheet).toContain("Last supper week");
    expect(sheet).toContain("day.isSunday");
    expect(sheet).not.toContain('placeholder={day.isSunday ? "Children" : "0"}');
  });
});
