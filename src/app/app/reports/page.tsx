import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportPreview } from "@/components/reports/report-preview";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitDepartmentReportAction } from "@/actions/admin";
import { requireUser } from "@/lib/auth/session";
import { formAction } from "@/lib/forms";
import { buildReport } from "@/lib/reports/build";
import { currentReportYear, firstParam, parseReportType } from "@/lib/reports/period";
import { allowedReportTypes, canGenerateReport, scopedReportDepartmentId } from "@/lib/reports/permissions";
import { REPORT_LABELS, type ReportFilters, type ReportType } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const available = allowedReportTypes(user.profile.role_slug);
  if (!available.length) redirect("/unauthorized");

  const params = await searchParams;
  const requested = parseReportType(firstParam(params.type)) ?? available[0];
  const type: ReportType = canGenerateReport(user.profile.role_slug, requested) ? requested : available[0];
  const year = Number(firstParam(params.year) ?? currentReportYear());
  const monthRaw = firstParam(params.month);
  const month = monthRaw ? Number(monthRaw) : undefined;
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const remarks = firstParam(params.remarks);
  const requestedDept = firstParam(params.department);
  const departmentId = scopedReportDepartmentId(user, requestedDept) ?? undefined;
  const generated = firstParam(params.generate) === "1";

  const supabase = await createClient();
  let departments: { id: string; name: string }[] = [];
  if (user.profile.role_slug === "presiding_elder" || user.profile.role_slug === "secretary") {
    const { data } = await supabase.from("departments").select("id, name").is("archived_at", null).order("name");
    departments = data ?? [];
  } else if (user.ledDepartments.length) {
    departments = user.ledDepartments.map((dept) => ({ id: dept.id, name: dept.name }));
  }

  const filters: ReportFilters = {
    type,
    year: Number.isInteger(year) ? year : currentReportYear(),
    month: month && month >= 1 && month <= 12 ? month : undefined,
    from,
    to,
    departmentId,
    remarks,
  };

  const report = generated ? await buildReport(supabase, user, filters) : null;
  const query = new URLSearchParams();
  query.set("type", type);
  query.set("year", String(filters.year));
  if (filters.month) query.set("month", String(filters.month));
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (departmentId) query.set("department", departmentId);
  if (remarks) query.set("remarks", remarks);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate reports from live church records. Empty periods show “No data available for this period.” The selected year’s official theme is attached automatically."
      />
      {user.profile.role_slug === "department_leader" && user.ledDepartments[0] ? (
        <form action={formAction(submitDepartmentReportAction)} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Submit ministry report to the Presiding Elder</h2>
          <input type="hidden" name="department_id" value={user.ledDepartments[0].id} />
          <Input name="title" required placeholder="Monthly attendance, activities, membership changes" />
          <Textarea name="content" required placeholder="Activities, membership changes, program report, challenges, recommendations" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="period_start" type="date" />
            <Input name="period_end" type="date" />
          </div>
          <Button type="submit">Submit to Presiding Elder</Button>
        </form>
      ) : null}
      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Report type</span>
          <select name="type" defaultValue={type} className="h-9 w-full rounded-lg border bg-background px-2">
            {available.map((item) => (
              <option key={item} value={item}>{REPORT_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Year</span>
          <Input name="year" type="number" min={2000} max={2100} defaultValue={filters.year} required />
        </label>
        <label className="space-y-1 text-sm">
          <span>Month (optional)</span>
          <select name="month" defaultValue={filters.month ? String(filters.month) : ""} className="h-9 w-full rounded-lg border bg-background px-2">
            <option value="">Whole year</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(Date.UTC(2026, index, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" })}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>From date</span>
          <Input name="from" type="date" defaultValue={from ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span>To date</span>
          <Input name="to" type="date" defaultValue={to ?? ""} />
        </label>
        {departments.length ? (
          <label className="space-y-1 text-sm">
            <span>Department</span>
            <select
              name="department"
              defaultValue={departmentId ?? ""}
              className="h-9 w-full rounded-lg border bg-background px-2"
              disabled={user.ledDepartments.length === 1 && user.profile.role_slug !== "presiding_elder"}
            >
              {user.profile.role_slug === "presiding_elder" || user.profile.role_slug === "secretary" ? (
                <option value="">All / assembly</option>
              ) : null}
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {type === "annual" ? (
          <label className="space-y-1 text-sm md:col-span-2 xl:col-span-3">
            <span>Notes / remarks</span>
            <Textarea name="remarks" defaultValue={remarks ?? ""} placeholder="Optional remarks for the annual report" />
          </label>
        ) : null}
        <input type="hidden" name="generate" value="1" />
        <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-3">
          <Button type="submit">Generate report</Button>
        </div>
      </form>
      {report ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/app/reports/${type}/export?format=pdf&${query.toString()}`}>Download PDF</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/reports/${type}/export?format=xlsx&${query.toString()}`}>Download Excel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/reports/${type}/export?format=csv&${query.toString()}`}>Download CSV</Link>
            </Button>
          </div>
          <ReportPreview report={report} />
        </div>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Choose the year, optional month or date range, and report type, then generate. A 2026 annual report uses the 2026 theme; a 2027 report uses the 2027 theme once leadership has entered it.
        </p>
      )}
    </div>
  );
}
