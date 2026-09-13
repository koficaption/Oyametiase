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
  const available = REPORTS.filter((report) => hasPermission(user.profile.role_slug, report.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Assembly reports" description="Exports are generated on the server from live database records." />
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
