import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Reports" };

const REPORTS = [
  { key: "membership", label: "Membership", permission: "reports.admin" as const },
  { key: "attendance", label: "Attendance", permission: "reports.admin" as const },
  { key: "visitors", label: "Visitors", permission: "reports.admin" as const },
  { key: "departments", label: "Departments", permission: "reports.admin" as const },
  { key: "finance", label: "Finance", permission: "reports.finance" as const },
  { key: "welfare", label: "Welfare", permission: "reports.welfare" as const },
];

export default async function ReportsPage() {
  const user = await requireUser();
  const canDepartment = hasPermission(user.profile.role_slug, "reports.department") || hasPermission(user.profile.role_slug, "reports.admin");
  const available = REPORTS.filter((report) => hasPermission(user.profile.role_slug, report.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="The Presiding Elder reviews assembly and ministry reports. Department leaders submit from Departments." />
      {canDepartment ? (
        <p className="rounded-xl border bg-card p-4 text-sm">
          Ministry reports are submitted from <a className="underline" href="/app/departments">Departments</a> and reviewed under{" "}
          {hasPermission(user.profile.role_slug, "approvals.view") ? <a className="underline" href="/app/approvals">Approvals</a> : "Approvals (Presiding Elder)."}.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {available.map((report) => (
          <div key={report.key} className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">{report.label}</h2>
            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/app/reports/${report.key}/export?format=pdf`}>PDF</Link>
              </Button>
              <Button asChild>
                <Link href={`/app/reports/${report.key}/export?format=xlsx`}>Excel</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
