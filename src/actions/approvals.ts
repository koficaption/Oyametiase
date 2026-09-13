"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { emptyToNull, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";

export async function requestApprovalAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const kind = str(formData, "kind");
  const allowed = ["member_status", "welfare", "leadership", "announcement", "finance_adjustment"];
  if (!allowed.includes(kind)) return fail("Choose a valid approval type.");
  const supabase = await createClient();
  const { error } = await supabase.from("approvals").insert({
    assembly_id: user.profile.assembly_id,
    kind,
    title: str(formData, "title"),
    summary: emptyToNull(str(formData, "summary")),
    requested_by: user.id,
  });
  if (error) return fail("Unable to submit this approval request.");
  revalidatePath("/app/approvals");
  return ok("Submitted for Presiding Elder review.");
}

export async function reviewApprovalAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("approvals.manage");
  const status = str(formData, "status");
  if (status !== "approved" && status !== "rejected") return fail("Choose approve or reject.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("approvals")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: emptyToNull(str(formData, "review_notes")),
    })
    .eq("id", str(formData, "approval_id"));
  if (error) return fail("Unable to update this approval.");
  revalidatePath("/app/approvals");
  return ok(status === "approved" ? "Approved." : "Rejected.");
}

export async function reviewDepartmentReportAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("approvals.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("department_reports")
    .update({
      status: "reviewed",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: emptyToNull(str(formData, "review_notes")),
    })
    .eq("id", str(formData, "report_id"));
  if (error) return fail("Unable to mark this report as reviewed.");
  revalidatePath("/app/approvals");
  revalidatePath("/app/reports");
  return ok("Department report reviewed.");
}
