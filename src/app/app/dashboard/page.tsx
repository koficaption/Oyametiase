import { PortalHome, type PortalStats } from "@/components/dashboards/portal-home";
import { requirePermission, userPortal } from "@/lib/auth/session";
import { getActiveTheme } from "@/lib/data/themes";
import { daysAgoIso } from "@/lib/dates";
import { firstWeekMeta, mondayOfWeek, todayIsoDate, WEEKLY_CHURCH_REF, WEEKLY_SUNDAY_SCHOOL_REF, weekDays } from "@/lib/weekly-collections";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard.view");
  const portal = userPortal(user);
  const supabase = await createClient();
  const assemblyId = user.profile.assembly_id;
  const scopedIds =
    user.profile.role_slug === "department_leader" ||
    user.profile.role_slug === "ministry_finance" ||
    user.profile.role_slug === "children_teacher"
      ? user.ledDepartmentIds
      : null;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthIso = startOfMonth.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = daysAgoIso(7);
  const monthStart = daysAgoIso(30);
  const collectionWeekStart = mondayOfWeek(todayIsoDate()) ?? todayIsoDate();
  const collectionWeekDays = weekDays(collectionWeekStart);
  const collectionWeekEnd = collectionWeekDays[6]?.iso ?? collectionWeekStart;
  const weekLabelPromise = supabase
    .from("weekly_collection_weeks")
    .select("label, event_date, event_time")
    .eq("assembly_id", assemblyId)
    .eq("week_start", collectionWeekStart)
    .maybeSingle();

  let memberQuery = supabase.from("members").select("id, membership_status, date_joined, gender").eq("assembly_id", assemblyId).is("archived_at", null);
  if (scopedIds) {
    const { data: links } = await supabase.from("department_members").select("member_id").in("department_id", scopedIds.length ? scopedIds : ["00000000-0000-0000-0000-000000000000"]);
    const ids = (links ?? []).map((row) => row.member_id);
    memberQuery = ids.length ? memberQuery.in("id", ids) : memberQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const [
    { data: members },
    { count: visitors },
    { count: followups },
    { count: welfareOpen },
    { data: announcements },
    { data: events },
    { data: attendance },
    { data: transactions },
    { count: pendingReports },
    { count: pendingApprovals },
    { count: pendingOfficerRequests },
    { count: childrenCount },
    { data: childRows },
    { count: childrenWorkers },
    { data: deptRows },
    churchTheme,
  ] = await Promise.all([
    memberQuery,
    supabase.from("visitors").select("id", { count: "exact", head: true }).eq("assembly_id", assemblyId).is("archived_at", null),
    supabase.from("member_followups").select("id", { count: "exact", head: true }).eq("assembly_id", assemblyId).in("status", ["open", "in_progress", "needs_attention"]),
    supabase.from("welfare_cases").select("id", { count: "exact", head: true }).eq("assembly_id", assemblyId).in("status", ["open", "in_review", "approved"]),
    supabase.from("announcements").select("id, title, published_at").eq("assembly_id", assemblyId).is("archived_at", null).order("published_at", { ascending: false }).limit(5),
    supabase.from("events").select("id, title, starts_at, venue, department_id").eq("assembly_id", assemblyId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("attendance").select("attendance_date, status, department_id").eq("assembly_id", assemblyId).eq("status", "present").gte("attendance_date", monthStart),
    supabase.from("financial_transactions").select("id, amount, type, occurred_on, department_id, reference, description, financial_categories(name, slug)").eq("assembly_id", assemblyId).is("archived_at", null).order("occurred_on", { ascending: false }).limit(200),
    supabase.from("department_reports").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).or("approval_status.eq.pending,account_status.eq.pending"),
    supabase.from("ministry_children").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("ministry_children").select("class_name").is("archived_at", null),
    supabase.from("workers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("department_members").select("department_id, departments(name)").limit(400),
    getActiveTheme(supabase),
  ]);
  const { data: weekRow } = await weekLabelPromise;

  const scopedEvents = scopedIds
    ? (events ?? []).filter((event) => !event.department_id || scopedIds.includes(event.department_id))
    : events ?? [];
  const scopedAttendance = scopedIds
    ? (attendance ?? []).filter((row) => !row.department_id || scopedIds.includes(row.department_id))
    : attendance ?? [];

  const categoryName = (row: { financial_categories?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null }) => {
    const cat = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
    return (cat?.slug ?? cat?.name ?? "").toLowerCase();
  };

  const isMinistryLeader = user.profile.role_slug === "department_leader" || user.profile.role_slug === "ministry_finance";
  const txnRows = (transactions ?? []).filter((row) =>
    isMinistryLeader ? Boolean(row.department_id && scopedIds?.includes(row.department_id)) : row.department_id == null,
  );
  const metaFromMoney = firstWeekMeta(
    txnRows
      .filter(
        (row) =>
          (row.reference === WEEKLY_CHURCH_REF || row.reference === WEEKLY_SUNDAY_SCHOOL_REF) &&
          row.occurred_on >= collectionWeekStart &&
          row.occurred_on <= collectionWeekEnd,
      )
      .map((row) => row.description),
  );
  const ministryRows = (transactions ?? []).filter((row) => row.department_id != null);
  const sumWhere = (predicate: (row: (typeof txnRows)[number]) => boolean) =>
    txnRows.filter(predicate).reduce((sum, row) => sum + Number(row.amount), 0);

  const stats: PortalStats = {
    totalMembers: members?.length ?? 0,
    activeMembers: members?.filter((row) => row.membership_status === "active").length ?? 0,
    newMembers: members?.filter((row) => row.date_joined && row.date_joined >= monthIso).length ?? 0,
    visitors: visitors ?? 0,
    newConverts: members?.filter((row) => row.membership_status === "new_convert").length ?? 0,
    attendanceToday: scopedAttendance.filter((row) => row.attendance_date === today).length,
    attendanceWeek: scopedAttendance.filter((row) => row.attendance_date >= weekStart).length,
    attendanceMonth: scopedAttendance.length,
    pendingFollowups: followups ?? 0,
    welfareOpen: welfareOpen ?? 0,
    pendingReports: pendingReports ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    pendingOfficerRequests: pendingOfficerRequests ?? 0,
    childrenCount: childrenCount ?? 0,
    childrenClasses: new Set((childRows ?? []).map((row) => row.class_name).filter(Boolean)).size,
    childrenWorkers: childrenWorkers ?? 0,
    tithes: sumWhere((row) => row.type === "income" && categoryName(row).includes("tithe")),
    offerings: sumWhere((row) => row.type === "income" && categoryName(row).includes("offering")),
    donations: sumWhere((row) => row.type === "income" && categoryName(row).includes("donation")),
    otherIncome: sumWhere((row) => row.type === "income" && !/(tithe|offering|donation)/.test(categoryName(row))),
    income: sumWhere((row) => row.type === "income"),
    expense: sumWhere((row) => row.type === "expense"),
    ministryIncome: ministryRows.filter((row) => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0),
    ministryExpense: ministryRows.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0),
    announcements: announcements ?? [],
    events: scopedEvents,
    recentTransactions: txnRows.slice(0, 8).map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      type: row.type,
      occurred_on: row.occurred_on,
    })),
    weekChurch: txnRows
      .filter(
        (row) =>
          row.reference === WEEKLY_CHURCH_REF &&
          row.occurred_on >= collectionWeekStart &&
          row.occurred_on <= collectionWeekEnd,
      )
      .reduce((sum, row) => sum + Number(row.amount), 0),
    weekSundaySchool: txnRows
      .filter(
        (row) =>
          row.reference === WEEKLY_SUNDAY_SCHOOL_REF &&
          row.occurred_on === collectionWeekEnd,
      )
      .reduce((sum, row) => sum + Number(row.amount), 0),
    weekLabel: weekRow?.label || metaFromMoney.label,
  };

  const attendanceTrend = Object.values(
    scopedAttendance.reduce<Record<string, { label: string; value: number }>>((acc, row) => {
      acc[row.attendance_date] = acc[row.attendance_date] ?? { label: row.attendance_date, value: 0 };
      acc[row.attendance_date].value += 1;
      return acc;
    }, {}),
  ).slice(-8);

  const incomeTrend = Object.values(
    txnRows
      .filter((row) => row.type === "income")
      .reduce<Record<string, { label: string; value: number }>>((acc, row) => {
        const key = row.occurred_on.slice(0, 7);
        acc[key] = acc[key] ?? { label: key, value: 0 };
        acc[key].value += Number(row.amount);
        return acc;
      }, {}),
  );

  const monthTrend = (predicate: (row: (typeof txnRows)[number]) => boolean) =>
    Object.values(
      txnRows
        .filter(predicate)
        .reduce<Record<string, { label: string; value: number }>>((acc, row) => {
          const key = row.occurred_on.slice(0, 7);
          acc[key] = acc[key] ?? { label: key, value: 0 };
          acc[key].value += Number(row.amount);
          return acc;
        }, {}),
    );

  const expenseTrend = monthTrend((row) => row.type === "expense");
  const titheTrend = monthTrend((row) => row.type === "income" && categoryName(row).includes("tithe"));
  const offeringTrend = monthTrend((row) => row.type === "income" && categoryName(row).includes("offering"));

  const departmentStats = Object.values(
    (deptRows ?? []).reduce<Record<string, { label: string; value: number }>>((acc, row) => {
      const dept = Array.isArray(row.departments) ? row.departments[0] : row.departments;
      const label = dept?.name ?? "Unassigned";
      acc[label] = acc[label] ?? { label, value: 0 };
      acc[label].value += 1;
      return acc;
    }, {}),
  );

  return (
    <PortalHome
      portal={portal}
      name={user.profile.full_name}
      ministryName={user.ledDepartments[0]?.name}
      stats={stats}
      attendanceTrend={attendanceTrend}
      incomeTrend={incomeTrend}
      expenseTrend={expenseTrend}
      titheTrend={titheTrend}
      offeringTrend={offeringTrend}
      departmentStats={departmentStats}
      churchTheme={churchTheme}
    />
  );
}
