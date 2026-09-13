import { requestApprovalAction, reviewApprovalAction, reviewDepartmentReportAction } from "@/actions/approvals";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { formAction } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const user = await requirePermission("approvals.view");
  const supabase = await createClient();
  const [{ data: approvals }, { data: reports }] = await Promise.all([
    supabase.from("approvals").select("*").order("created_at", { ascending: false }).limit(40),
    supabase.from("department_reports").select("id, title, content, status, created_at, departments(name)").order("created_at", { ascending: false }).limit(20),
  ]);
  const canReview = hasPermission(user.profile.role_slug, "approvals.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review important changes. Everyday records do not need approval."
      />
      <form action={formAction(requestApprovalAction)} className="grid gap-3 rounded-xl border bg-card p-4">
        <select name="kind" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="member_status">Member status change</option>
          <option value="welfare">Important welfare request</option>
          <option value="leadership">Department leadership change</option>
          <option value="announcement">Important announcement</option>
          <option value="finance_adjustment">Financial adjustment</option>
        </select>
        <Input name="title" required placeholder="What needs review?" />
        <Textarea name="summary" placeholder="Details" />
        <Button type="submit">Submit for review</Button>
      </form>
      <section className="space-y-3">
        <h2 className="font-semibold">Waiting and recent decisions</h2>
        {approvals?.map((item) => (
          <div key={item.id} className="rounded-xl border bg-card p-4">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-muted-foreground">{item.kind} · {item.status}</div>
            {item.summary ? <p className="mt-2 text-sm">{item.summary}</p> : null}
            {canReview && item.status === "pending" ? (
              <form action={formAction(reviewApprovalAction)} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="approval_id" value={item.id} />
                <Input name="review_notes" placeholder="Notes" />
                <Button name="status" value="approved" type="submit">Approve</Button>
                <Button name="status" value="rejected" type="submit" variant="outline">Reject</Button>
              </form>
            ) : null}
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Department reports</h2>
        {reports?.map((report) => {
          const dept = Array.isArray(report.departments) ? report.departments[0] : report.departments;
          return (
            <div key={report.id} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{report.title}</div>
              <div className="text-sm text-muted-foreground">{dept?.name} · {report.status}</div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{report.content}</p>
              {canReview && report.status === "submitted" ? (
                <form action={formAction(reviewDepartmentReportAction)} className="mt-3 flex gap-2">
                  <input type="hidden" name="report_id" value={report.id} />
                  <Input name="review_notes" placeholder="Review notes" />
                  <Button type="submit">Mark reviewed</Button>
                </form>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
