import { WeeklyCollectionSheet } from "@/components/finance/weekly-collection-sheet";
import { requirePermission } from "@/lib/auth/session";
import { ASSEMBLY_FINANCE_FILTERS } from "@/lib/finance-books";
import { createClient } from "@/lib/supabase/server";
import {
  firstWeekMeta,
  mondayOfWeek,
  monthBounds,
  monthKey,
  monthTotalsFromEntries,
  parseMonthKey,
  shiftWeek,
  sundayOfWeek,
  sundaySchoolForDay,
  todayIsoDate,
  WEEKLY_CHURCH_REF,
  WEEKLY_SUNDAY_SCHOOL_REF,
  weekDays,
  type MonthDayAmount,
} from "@/lib/weekly-collections";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Weekly collections" };
export const dynamic = "force-dynamic";

export default async function WeeklyCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("finance.view");
  const params = await searchParams;
  const requested = typeof params.week === "string" ? params.week : todayIsoDate();
  const weekStart = mondayOfWeek(requested) ?? mondayOfWeek(todayIsoDate()) ?? todayIsoDate();
  const days = weekDays(weekStart);
  const sunday = sundayOfWeek(weekStart);
  const selectedMonth =
    (typeof params.month === "string" ? parseMonthKey(params.month) : null) ?? monthKey(sunday);
  const month = monthBounds(selectedMonth) ?? monthBounds(monthKey(todayIsoDate()))!;
  const supabase = await createClient();
  const [{ data }, weekQuery, { data: monthRows }] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("occurred_on, amount, reference, description")
      .eq("assembly_id", user.profile.assembly_id)
      .is("department_id", null)
      .is("archived_at", null)
      .in("reference", [WEEKLY_CHURCH_REF, WEEKLY_SUNDAY_SCHOOL_REF])
      .gte("occurred_on", weekStart)
      .lte("occurred_on", sunday),
    supabase
      .from("weekly_collection_weeks")
      .select("label, event_date, event_time")
      .eq("assembly_id", user.profile.assembly_id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("financial_transactions")
      .select("occurred_on, amount, reference")
      .eq("assembly_id", user.profile.assembly_id)
      .is("department_id", null)
      .is("archived_at", null)
      .in("reference", [WEEKLY_CHURCH_REF, WEEKLY_SUNDAY_SCHOOL_REF])
      .gte("occurred_on", month.start)
      .lte("occurred_on", month.end),
  ]);

  const amounts = days.map((day) => {
    const rows = (data ?? []).filter((row) => row.occurred_on === day.iso);
    return {
      ...day,
      church: rows
        .filter((row) => row.reference === WEEKLY_CHURCH_REF)
        .reduce((sum, row) => sum + Number(row.amount), 0),
      sundaySchool: sundaySchoolForDay(
        day.isSunday,
        rows
          .filter((row) => row.reference === WEEKLY_SUNDAY_SCHOOL_REF)
          .reduce((sum, row) => sum + Number(row.amount), 0),
      ),
    };
  });

  const weekRow = weekQuery.error ? null : weekQuery.data;
  const metaFromMoney = firstWeekMeta((data ?? []).map((row) => row.description));
  const monthEntries = new Map<string, MonthDayAmount>();
  for (const row of monthRows ?? []) {
    const current = monthEntries.get(row.occurred_on) ?? { iso: row.occurred_on, church: 0, sundaySchool: 0 };
    if (row.reference === WEEKLY_CHURCH_REF) current.church += Number(row.amount);
    if (row.reference === WEEKLY_SUNDAY_SCHOOL_REF) current.sundaySchool += Number(row.amount);
    monthEntries.set(row.occurred_on, current);
  }
  const savedMonth = monthTotalsFromEntries([...monthEntries.values()], selectedMonth);

  return (
    <WeeklyCollectionSheet
      key={`${weekStart}:${selectedMonth}`}
      weekStart={weekStart}
      weekLabel={weekRow?.label || metaFromMoney.label}
      weekDate={weekRow?.event_date || metaFromMoney.date}
      weekTime={weekRow?.event_time || metaFromMoney.time}
      prevWeek={shiftWeek(weekStart, -1) ?? weekStart}
      nextWeek={shiftWeek(weekStart, 1) ?? weekStart}
      days={amounts}
      month={selectedMonth}
      savedMonth={savedMonth}
      canWrite={hasPermission(user.profile.role_slug, "finance.manage")}
      filterLinks={ASSEMBLY_FINANCE_FILTERS}
    />
  );
}
