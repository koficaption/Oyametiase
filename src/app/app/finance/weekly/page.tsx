import { WeeklyCollectionSheet } from "@/components/finance/weekly-collection-sheet";
import { requirePermission } from "@/lib/auth/session";
import { ASSEMBLY_FINANCE_FILTERS } from "@/lib/finance-books";
import { createClient } from "@/lib/supabase/server";
import {
  mondayOfWeek,
  shiftWeek,
  todayIsoDate,
  WEEKLY_CHURCH_REF,
  WEEKLY_SUNDAY_SCHOOL_REF,
  weekDays,
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
  const sunday = days[6]?.iso ?? weekStart;
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_transactions")
    .select("occurred_on, amount, reference")
    .eq("assembly_id", user.profile.assembly_id)
    .is("department_id", null)
    .is("archived_at", null)
    .in("reference", [WEEKLY_CHURCH_REF, WEEKLY_SUNDAY_SCHOOL_REF])
    .gte("occurred_on", weekStart)
    .lte("occurred_on", sunday);

  const amounts = days.map((day) => {
    const rows = (data ?? []).filter((row) => row.occurred_on === day.iso);
    return {
      ...day,
      church: rows
        .filter((row) => row.reference === WEEKLY_CHURCH_REF)
        .reduce((sum, row) => sum + Number(row.amount), 0),
      sundaySchool: rows
        .filter((row) => row.reference === WEEKLY_SUNDAY_SCHOOL_REF)
        .reduce((sum, row) => sum + Number(row.amount), 0),
    };
  });

  return (
    <WeeklyCollectionSheet
      key={weekStart}
      weekStart={weekStart}
      prevWeek={shiftWeek(weekStart, -1) ?? weekStart}
      nextWeek={shiftWeek(weekStart, 1) ?? weekStart}
      days={amounts}
      canWrite={hasPermission(user.profile.role_slug, "finance.manage")}
      filterLinks={ASSEMBLY_FINANCE_FILTERS}
    />
  );
}
