import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  encodeWeekMeta,
  firstWeekMeta,
  formatWeekMeta,
  liveMonthTotals,
  mondayOfWeek,
  monthBounds,
  normalizeWeekLabel,
  normalizeWeekTime,
  parseMoneyInput,
  parseWeekMetaFromDescription,
  shiftWeek,
  sundayOfWeek,
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
    const crossing = weekDays("2026-09-28");
    expect(crossing.map((day) => day.iso)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(monthBounds("2026-09")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
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

  it("adds a week total and a month total when the week crosses the end of the month", () => {
    const crossing = weekDays("2026-09-28").map((day, index) => ({
      iso: day.iso,
      church: index === 2 ? 30 : index === 3 ? 40 : 10,
      sundaySchool: day.isSunday ? 5 : 0,
      isSunday: day.isSunday,
    }));
    const week = weekTotals(crossing);
    expect(week.church).toBe(30 + 40 + 50);
    expect(week.sundaySchool).toBe(5);
    const september = liveMonthTotals({
      month: "2026-09",
      savedMonth: { church: 100, sundaySchool: 0 },
      originalDays: crossing.map((day) => ({ iso: day.iso, church: 0, sundaySchool: 0 })),
      liveDays: crossing,
    });
    expect(september.church).toBe(100 + 10 + 10 + 30);
    expect(september.sundaySchool).toBe(0);
    const october = liveMonthTotals({
      month: "2026-10",
      savedMonth: { church: 0, sundaySchool: 0 },
      originalDays: crossing.map((day) => ({ iso: day.iso, church: 0, sundaySchool: 0 })),
      liveDays: crossing,
    });
    expect(october.church).toBe(40 + 10 + 10 + 10);
    expect(october.sundaySchool).toBe(5);
  });

  it("keeps Sunday school off every day except Sunday", () => {
    expect(sundaySchoolForDay(false, 40)).toBe(0);
    expect(sundaySchoolForDay(true, 40)).toBe(40);
  });

  it("stores a free-text week name, date, and time such as Youth week", () => {
    expect(normalizeWeekLabel("  Youth   week ")).toBe("Youth week");
    expect(normalizeWeekLabel("Last supper week")).toBe("Last supper week");
    expect(normalizeWeekTime("")).toBe("");
    expect(normalizeWeekTime("9:00")).toBe("09:00");
    expect(normalizeWeekTime("09:00:00")).toBe("09:00");
    expect(normalizeWeekTime("25:00")).toBeNull();
    expect(sundayOfWeek("2026-09-14")).toBe("2026-09-20");
    expect(formatWeekMeta({ label: "Youth week", date: "2026-09-20", time: "09:00" })).toContain("Youth week");
    expect(formatWeekMeta({ label: "Youth week", date: "2026-09-20", time: "09:00" })).toContain("2026");
    expect(encodeWeekMeta("Weekly church collection · Sunday", { label: "Youth week", date: "2026-09-20", time: "09:00" })).toContain(
      "Youth week",
    );
    expect(parseWeekMetaFromDescription("Weekly church collection · Sunday | Youth week | 2026-09-20 | 09:00")).toEqual({
      label: "Youth week",
      date: "2026-09-20",
      time: "09:00",
    });
    expect(firstWeekMeta(["Weekly church collection · Monday", "Sunday school (children) · Sunday | Youth week | 2026-09-20 | 09:00"]).label).toBe(
      "Youth week",
    );
    const days = weekDays("2026-09-14").map((day) => ({
      occurred_on: day.iso,
      church: 0,
      sunday_school: 0,
    }));
    expect(
      weeklyCollectionsSchema.safeParse({
        week_start: "2026-09-14",
        week_label: "Youth week",
        week_date: "2026-09-20",
        week_time: "09:00",
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
    expect(
      weeklyCollectionsSchema.safeParse({
        week_start: "2026-09-14",
        week_label: "Youth week",
        week_time: "25:00",
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
    expect(action).toContain("week_date");
    expect(action).toContain("week_time");
    expect(action).toContain("encodeWeekMeta");
    expect(action).not.toContain("Week money saved, but the week name, date, or time could not be stored");
  });

  it("lets the treasurer name a week and collect Sunday school only on Sunday", () => {
    const weeks = readFileSync("supabase/migrations/20260917192707_weekly_collection_weeks.sql", "utf8");
    expect(weeks).toContain("CREATE TABLE IF NOT EXISTS public.weekly_collection_weeks");
    expect(weeks).toContain("can_read_finance");
    expect(weeks).toContain("can_write_finance");
    expect(weeks).toContain("Last supper week");
    const sheet = readFileSync("src/components/finance/weekly-collection-sheet.tsx", "utf8");
    expect(sheet).toContain("What week is this?");
    expect(sheet).toContain("Youth week");
    expect(sheet).toContain('id="week_date"');
    expect(sheet).toContain('id="week_time"');
    expect(sheet).toContain('type="date"');
    expect(sheet).toContain('type="time"');
    const datetime = readFileSync("supabase/migrations/20260917194200_weekly_collection_week_date_time.sql", "utf8");
    expect(datetime).toContain("event_date");
    expect(datetime).toContain("event_time");
    expect(sheet).toContain("Date for");
    expect(sheet).toContain("Month to total");
    expect(sheet).toContain("liveMonthTotals");
    expect(sheet).not.toContain('placeholder={day.isSunday ? "Children" : "0"}');
  });
});
