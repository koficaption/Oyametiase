import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssembly } from "@/lib/data/queries";
import { getThemeForYear } from "@/lib/data/themes";
import { ageOn, money, periodLabel, resolvePeriod } from "@/lib/reports/period";
import { canViewReportSection, scopedReportDepartmentId } from "@/lib/reports/permissions";
import {
  EMPTY_PERIOD,
  type BuiltReport,
  type ReportFilters,
  type ReportSection,
  type ReportType,
} from "@/lib/reports/types";
import type { CurrentUser } from "@/types/database";

type AnyClient = SupabaseClient;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function emptySection(title: string): ReportSection {
  return { title, empty: true, note: EMPTY_PERIOD };
}

function statsSection(title: string, stats: { label: string; value: string }[]): ReportSection {
  if (!stats.length || stats.every((item) => item.value === "0" || item.value === money(0))) {
    return emptySection(title);
  }
  return { title, stats };
}

function tableSection(title: string, columns: string[], rows: (string | number)[][]): ReportSection {
  if (!rows.length) return emptySection(title);
  return { title, columns, rows };
}

function categorySlug(row: { financial_categories?: { slug?: string; name?: string } | { slug?: string; name?: string }[] | null }) {
  const cat = one(row.financial_categories);
  return (cat?.slug ?? cat?.name ?? "").toLowerCase();
}

async function ministryMemberIds(supabase: AnyClient, slugs: string[]) {
  const { data: depts } = await supabase.from("departments").select("id, slug").in("slug", slugs);
  const ids = (depts ?? []).map((row) => row.id);
  if (!ids.length) return { departmentIds: [] as string[], memberIds: new Set<string>(), bySlug: {} as Record<string, string> };
  const { data: links } = await supabase.from("department_members").select("member_id, department_id").in("department_id", ids);
  const bySlug: Record<string, string> = {};
  for (const dept of depts ?? []) bySlug[dept.slug] = dept.id;
  return {
    departmentIds: ids,
    memberIds: new Set((links ?? []).map((row) => row.member_id)),
    bySlug,
  };
}

export async function buildReport(
  supabase: AnyClient,
  user: CurrentUser,
  filters: ReportFilters,
): Promise<BuiltReport> {
  const period = resolvePeriod(filters);
  const assembly = await getAssembly(supabase);
  const theme = await getThemeForYear(supabase, filters.year);
  const role = user.profile.role_slug;
  const departmentId = scopedReportDepartmentId(user, filters.departmentId);
  const sections: ReportSection[] = [];
  let restrictedNote: string | undefined;

  const include = (type: ReportType) => {
    if (canViewReportSection(role, type)) return true;
    restrictedNote = "Some sections are hidden because they are outside your responsibility.";
    return false;
  };

  if (filters.type === "membership" || filters.type === "annual") {
    if (include("membership")) sections.push(...(await membershipSections(supabase, user, period, departmentId)));
  }
  if (filters.type === "attendance" || filters.type === "annual") {
    if (include("attendance")) sections.push(...(await attendanceSections(supabase, user, period, departmentId)));
  }
  if (filters.type === "visitors" || filters.type === "annual") {
    if (include("visitors")) sections.push(...(await visitorSections(supabase, user, period)));
  }
  if (filters.type === "welfare" || filters.type === "annual") {
    if (include("welfare")) sections.push(...(await welfareSections(supabase, user, period)));
  }
  if (filters.type === "finance" || filters.type === "annual") {
    if (include("finance")) sections.push(...(await financeSections(supabase, user, period, filters.type === "finance" ? departmentId : null)));
  }
  if (filters.type === "department" || filters.type === "annual") {
    if (include("department")) sections.push(...(await departmentSections(supabase, user, period, departmentId)));
  }
  if (filters.type === "annual") {
    sections.push(...(await annualExtraSections(supabase, user, period, departmentId)));
    if (filters.remarks) {
      sections.push({ title: "Notes / remarks", note: filters.remarks });
    }
  }

  const heading =
    filters.type === "annual"
      ? `ANNUAL CHURCH REPORT – ${filters.year}`
      : `${filters.type.toUpperCase()} REPORT – ${periodLabel(filters)}`;

  return {
    type: filters.type,
    title: heading,
    churchName: assembly?.church_name ?? "The Church of Pentecost",
    assemblyName: assembly?.assembly_name ?? "Oyame Tiase Assembly",
    year: filters.year,
    periodLabel: periodLabel(filters),
    from: period.from,
    to: period.to,
    theme: theme
      ? { year: theme.year, title: theme.title, scripture: theme.scripture, description: theme.description }
      : null,
    generatedAt: new Date().toISOString(),
    preparedBy: user.profile.full_name,
    approvedBy: "Presiding Elder",
    remarks: filters.remarks,
    sections: sections.length ? sections : [emptySection("Report")],
    restrictedNote,
  };
}

async function membershipSections(
  supabase: AnyClient,
  user: CurrentUser,
  period: { from: string; to: string },
  departmentId: string | null,
) {
  let memberQuery = supabase
    .from("members")
    .select("id, first_name, last_name, gender, membership_status, date_joined, archived_at, created_at, primary_department_id")
    .eq("assembly_id", user.profile.assembly_id);
  if (departmentId) {
    const { data: links } = await supabase.from("department_members").select("member_id").eq("department_id", departmentId);
    const ids = (links ?? []).map((row) => row.member_id);
    memberQuery = ids.length ? memberQuery.in("id", ids) : memberQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: members } = await memberQuery;
  const rows = members ?? [];
  const active = rows.filter((row) => !row.archived_at);
  const { memberIds: youthIds } = await ministryMemberIds(supabase, ["pym"]);
  const { memberIds: childrenDeptIds } = await ministryMemberIds(supabase, ["children"]);
  const { data: childrenRows } = await supabase.from("ministry_children").select("id, first_name, last_name, gender, archived_at").is("archived_at", null);
  const childrenCount = childrenRows?.length ?? 0;

  let dobMap = new Map<string, string | null>();
  if (user.profile.role_slug === "presiding_elder" || user.profile.role_slug === "secretary") {
    const { data: confidential } = await supabase
      .from("member_confidential")
      .select("member_id, date_of_birth")
      .in("member_id", active.map((row) => row.id).concat("00000000-0000-0000-0000-000000000000"));
    dobMap = new Map((confidential ?? []).map((row) => [row.member_id, row.date_of_birth]));
  }

  const isChild = (id: string) => {
    if (childrenDeptIds.has(id)) return true;
    const age = ageOn(dobMap.get(id), period.to);
    return age != null && age < 13;
  };
  const isYouth = (id: string) => {
    if (youthIds.has(id)) return true;
    const age = ageOn(dobMap.get(id), period.to);
    return age != null && age >= 13 && age <= 35 && !isChild(id);
  };

  const men = active.filter((row) => row.gender === "male" && !isChild(row.id)).length;
  const women = active.filter((row) => row.gender === "female" && !isChild(row.id)).length;
  const youth = active.filter((row) => isYouth(row.id)).length;
  const newMembers = active.filter((row) => row.date_joined && row.date_joined >= period.from && row.date_joined <= period.to);
  const left = rows.filter((row) => {
    const leftStatus = ["transferred", "deceased", "inactive"].includes(row.membership_status);
    const archivedInPeriod = Boolean(row.archived_at && row.archived_at.slice(0, 10) >= period.from && row.archived_at.slice(0, 10) <= period.to);
    return leftStatus || archivedInPeriod;
  });

  const stats = [
    { label: "Total members", value: String(active.length) },
    { label: "Men", value: String(men) },
    { label: "Women", value: String(women) },
    { label: "Youth", value: String(youth) },
    { label: "Children", value: String(childrenCount || active.filter((row) => isChild(row.id)).length) },
    { label: "New members", value: String(newMembers.length) },
    { label: "Left / transferred", value: String(left.length) },
  ];

  return [
    statsSection("Membership statistics", stats),
    tableSection(
      "New members",
      ["Name", "Gender", "Joined", "Status"],
      newMembers.map((row) => [`${row.first_name} ${row.last_name}`, row.gender, row.date_joined ?? "", row.membership_status]),
    ),
    tableSection(
      "Members who left or transferred",
      ["Name", "Status"],
      left.map((row) => [`${row.first_name} ${row.last_name}`, row.membership_status]),
    ),
  ];
}

async function attendanceSections(
  supabase: AnyClient,
  user: CurrentUser,
  period: { from: string; to: string },
  departmentId: string | null,
) {
  let query = supabase
    .from("attendance")
    .select("id, attendance_date, status, member_id, visitor_id, department_id, members(gender, first_name, last_name, primary_department_id)")
    .eq("assembly_id", user.profile.assembly_id)
    .gte("attendance_date", period.from)
    .lte("attendance_date", period.to)
    .is("archived_at", null);
  if (departmentId) query = query.eq("department_id", departmentId);
  const { data } = await query;
  const rows = data ?? [];
  if (!rows.length) return [emptySection("Attendance statistics")];

  const { memberIds: youthIds } = await ministryMemberIds(supabase, ["pym"]);
  const { memberIds: childrenIds } = await ministryMemberIds(supabase, ["children"]);
  const present = rows.filter((row) => row.status === "present");
  const visitors = present.filter((row) => row.visitor_id).length;
  let men = 0;
  let women = 0;
  let youth = 0;
  let children = 0;
  for (const row of present) {
    if (row.visitor_id) continue;
    const member = one(row.members);
    if (member?.gender === "male") men += 1;
    if (member?.gender === "female") women += 1;
    if (row.member_id && youthIds.has(row.member_id)) youth += 1;
    if (row.member_id && childrenIds.has(row.member_id)) children += 1;
  }
  const percent = rows.length ? Math.round((present.length / rows.length) * 100) : 0;
  const byDate = Object.values(
    present.reduce<Record<string, number>>((acc, row) => {
      acc[row.attendance_date] = (acc[row.attendance_date] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const byMonthMap = present.reduce<Record<string, number>>((acc, row) => {
    const key = row.attendance_date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return [
    statsSection("Attendance statistics", [
      { label: "Total attendance (present)", value: String(present.length) },
      { label: "Men", value: String(men) },
      { label: "Women", value: String(women) },
      { label: "Youth", value: String(youth) },
      { label: "Children", value: String(children) },
      { label: "Visitors", value: String(visitors) },
      { label: "Attendance percentage", value: `${percent}%` },
    ]),
    tableSection(
      "Attendance by date",
      ["Date", "Present"],
      Object.entries(
        present.reduce<Record<string, number>>((acc, row) => {
          acc[row.attendance_date] = (acc[row.attendance_date] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([date, count]) => [date, count]),
    ),
    tableSection(
      "Attendance by month",
      ["Month", "Present"],
      Object.entries(byMonthMap).map(([month, count]) => [month, count]),
    ),
    byDate.length ? { title: "Coverage", note: `${present.length} present of ${rows.length} recorded marks.` } : emptySection("Coverage"),
  ];
}

async function visitorSections(supabase: AnyClient, user: CurrentUser, period: { from: string; to: string }) {
  const { data } = await supabase
    .from("visitors")
    .select("full_name, date_visited, follow_up_status")
    .eq("assembly_id", user.profile.assembly_id)
    .gte("date_visited", period.from)
    .lte("date_visited", period.to)
    .is("archived_at", null)
    .order("date_visited", { ascending: false });
  const rows = data ?? [];
  return [
    statsSection("Visitor statistics", [{ label: "Number of visitors", value: String(rows.length) }]),
    tableSection(
      "Visitors",
      ["Name", "Date visited", "Follow-up status"],
      rows.map((row) => [row.full_name, row.date_visited, row.follow_up_status.replaceAll("_", " ")]),
    ),
  ];
}

async function welfareSections(supabase: AnyClient, user: CurrentUser, period: { from: string; to: string }) {
  const welfareSelect =
    "id, category, status, amount, description, created_at, members!welfare_cases_member_id_fkey(first_name, last_name)";
  let { data: cases, error: welfareError } = await supabase
    .from("welfare_cases")
    .select(welfareSelect)
    .eq("assembly_id", user.profile.assembly_id)
    .is("archived_at", null);
  if (welfareError) {
    const fallback = await supabase
      .from("welfare_cases")
      .select("id, category, status, amount, description, created_at")
      .eq("assembly_id", user.profile.assembly_id)
      .is("archived_at", null);
    cases = fallback.data;
  }
  const inPeriod = (cases ?? []).filter((row) => {
    const created = String(row.created_at ?? "").slice(0, 10);
    return !created || (created >= period.from && created <= period.to);
  });
  const caseIds = inPeriod.map((row) => row.id);
  const { data: payments } = caseIds.length
    ? await supabase
        .from("welfare_payments")
        .select("case_id, amount, paid_on, notes")
        .eq("assembly_id", user.profile.assembly_id)
        .gte("paid_on", period.from)
        .lte("paid_on", period.to)
        .in("case_id", caseIds)
    : { data: [] as { case_id: string; amount: number; paid_on: string; notes: string | null }[] };

  const expected = inPeriod.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const paidFromLedger = (payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const paidFromStatus = inPeriod
    .filter((row) => ["provided", "closed"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const paid = paidFromLedger > 0 ? paidFromLedger : paidFromStatus;
  const unpaid = Math.max(expected - paid, 0);

  return [
    statsSection("Welfare statistics", [
      { label: "Total expected payments", value: money(expected) },
      { label: "Total paid", value: money(paid) },
      { label: "Total unpaid", value: money(unpaid) },
      { label: "Amount collected", value: money(paid) },
      { label: "Outstanding amount", value: money(unpaid) },
    ]),
    tableSection(
      "Welfare cases",
      ["Member", "Category", "Status", "Expected"],
      inPeriod.map((row) => {
        const member = one(row.members);
        return [
          member ? `${member.first_name} ${member.last_name}` : "Unnamed",
          row.category,
          row.status.replaceAll("_", " "),
          money(Number(row.amount ?? 0)),
        ];
      }),
    ),
    tableSection(
      "Payment records",
      ["Date", "Amount", "Notes"],
      (payments ?? []).map((row) => [row.paid_on, money(Number(row.amount)), row.notes ?? ""]),
    ),
  ];
}

async function financeSections(
  supabase: AnyClient,
  user: CurrentUser,
  period: { from: string; to: string },
  departmentId: string | null,
) {
  let query = supabase
    .from("financial_transactions")
    .select("amount, type, occurred_on, payment_method, description, transaction_code, department_id, financial_categories(name, slug)")
    .eq("assembly_id", user.profile.assembly_id)
    .gte("occurred_on", period.from)
    .lte("occurred_on", period.to)
    .is("archived_at", null);
  if (user.profile.role_slug === "treasurer" || !departmentId) {
    query = query.is("department_id", null);
  } else {
    query = query.eq("department_id", departmentId);
  }
  const { data } = await query;
  const rows = data ?? [];
  const incomeRows = rows.filter((row) => row.type === "income");
  const expenseRows = rows.filter((row) => row.type === "expense");
  const sumCat = (test: RegExp, type: "income" | "expense") =>
    rows
      .filter((row) => row.type === type && test.test(categorySlug(row)))
      .reduce((sum, row) => sum + Number(row.amount), 0);
  const tithes = sumCat(/tithe/, "income");
  const offerings = sumCat(/offering/, "income");
  const donations = sumCat(/donation/, "income");
  const welfare = sumCat(/welfare/, "expense") + sumCat(/welfare/, "income");
  const otherIncome = incomeRows
    .filter((row) => !/(tithe|offering|donation|welfare)/.test(categorySlug(row)))
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const income = incomeRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const expenses = expenseRows.reduce((sum, row) => sum + Number(row.amount), 0);

  return [
    statsSection("Financial summary", [
      { label: "Tithes", value: money(tithes) },
      { label: "Offerings", value: money(offerings) },
      { label: "Welfare", value: money(welfare) },
      { label: "Donations", value: money(donations) },
      { label: "Other income", value: money(otherIncome) },
      { label: "Expenses", value: money(expenses) },
      { label: "Total income", value: money(income) },
      { label: "Total expenses", value: money(expenses) },
      { label: "Balance", value: money(income - expenses) },
    ]),
    tableSection(
      "Transactions",
      ["Code", "Date", "Type", "Category", "Amount"],
      rows.map((row) => [
        row.transaction_code,
        row.occurred_on,
        row.type,
        one(row.financial_categories)?.name ?? "",
        money(Number(row.amount)),
      ]),
    ),
  ];
}

async function departmentSections(
  supabase: AnyClient,
  user: CurrentUser,
  period: { from: string; to: string },
  departmentId: string | null,
) {
  let deptQuery = supabase.from("departments").select("id, name, slug").is("archived_at", null);
  if (departmentId) deptQuery = deptQuery.eq("id", departmentId);
  else deptQuery = deptQuery.in("slug", ["pwm", "pmm", "pym", "children"]);
  const { data: depts } = await deptQuery;
  if (!depts?.length) return [emptySection("Department statistics")];

  const { data: links } = await supabase
    .from("department_members")
    .select("department_id, member_id, members(first_name, last_name, gender, membership_status, date_joined, archived_at)")
    .in("department_id", depts.map((dept) => dept.id));
  const { data: activities } = await supabase
    .from("department_activities")
    .select("department_id, title, activity_date")
    .in("department_id", depts.map((dept) => dept.id))
    .gte("activity_date", period.from)
    .lte("activity_date", period.to);
  const { data: submitted } = await supabase
    .from("department_reports")
    .select("department_id, title, content, status, created_at, departments(name)")
    .in("department_id", depts.map((dept) => dept.id))
    .order("created_at", { ascending: false });

  const sections: ReportSection[] = [];
  for (const dept of depts) {
    const people = (links ?? []).filter((row) => row.department_id === dept.id);
    const members = people
      .map((row) => one(row.members))
      .filter((member): member is NonNullable<typeof member> => Boolean(member && !member.archived_at));
    const newMembers = members.filter((row) => row.date_joined && row.date_joined >= period.from && row.date_joined <= period.to);
    const deptActivities = (activities ?? []).filter((row) => row.department_id === dept.id);
    sections.push(
      statsSection(`${dept.name} statistics`, [
        { label: "Members", value: String(members.length) },
        { label: "New members", value: String(newMembers.length) },
        { label: "Activities", value: String(deptActivities.length) },
      ]),
    );
    sections.push(
      tableSection(
        `${dept.name} activities`,
        ["Date", "Activity"],
        deptActivities.map((row) => [row.activity_date, row.title]),
      ),
    );
  }

  const reports = (submitted ?? []).filter((row) => {
    const created = row.created_at.slice(0, 10);
    return created >= period.from && created <= period.to;
  });
  sections.push(
    tableSection(
      "Submitted ministry reports",
      ["Ministry", "Title", "Status"],
      reports.map((row) => [one(row.departments)?.name ?? "", row.title, row.status ?? "submitted"]),
    ),
  );
  return sections;
}

async function annualExtraSections(
  supabase: AnyClient,
  user: CurrentUser,
  period: { from: string; to: string },
  departmentId: string | null,
) {
  let eventQuery = supabase
    .from("events")
    .select("title, starts_at, venue, status, department_id")
    .eq("assembly_id", user.profile.assembly_id)
    .gte("starts_at", `${period.from}T00:00:00`)
    .lte("starts_at", `${period.to}T23:59:59`)
    .is("archived_at", null)
    .order("starts_at");
  if (departmentId) eventQuery = eventQuery.eq("department_id", departmentId);
  const { data: events } = await eventQuery;
  return [
    tableSection(
      "Major programs / events",
      ["Date", "Program", "Venue", "Status"],
      (events ?? []).map((row) => [row.starts_at.slice(0, 10), row.title, row.venue ?? "", row.status]),
    ),
  ];
}
