"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/session";
import { emptyToNull, opt, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import { visitorSchema } from "@/lib/validations/operations";
import { notifyUserForMember } from "@/actions/notifications";

function visitorPayload(formData: FormData) {
  return {
    full_name: str(formData, "full_name"),
    phone: opt(formData, "phone"),
    email: opt(formData, "email"),
    location: opt(formData, "location"),
    date_visited: str(formData, "date_visited"),
    service_id: opt(formData, "service_id"),
    how_heard: opt(formData, "how_heard"),
    prayer_request: opt(formData, "prayer_request"),
    assigned_to: opt(formData, "assigned_to"),
    follow_up_status: str(formData, "follow_up_status") || "new",
    notes: opt(formData, "notes"),
  };
}

export async function createVisitorAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("visitors.manage");
  const parsed = visitorSchema.safeParse(visitorPayload(formData));
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visitors")
    .insert({
      assembly_id: user.profile.assembly_id,
      ...parsed.data,
      service_id: emptyToNull(parsed.data.service_id),
      assigned_to: emptyToNull(parsed.data.assigned_to),
      created_by: user.id,
    })
    .select("id, assigned_to, full_name")
    .single();
  if (error || !data) return fail("Unable to register the visitor.");
  if (data.assigned_to) {
    await notifyUserForMember({
      memberId: data.assigned_to,
      title: "New visitor assigned",
      body: `${data.full_name} has been assigned to you for follow-up.`,
      type: "followup",
      link: `/app/visitors/${data.id}`,
    });
  }
  await writeAudit(supabase, { action: "visitor.create", module: "visitors", recordId: data.id });
  revalidatePath("/app/visitors");
  return ok("Visitor registered.");
}

export async function updateVisitorAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("visitors.manage");
  const id = str(formData, "id");
  const parsed = visitorSchema.safeParse(visitorPayload(formData));
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("visitors")
    .update({
      ...parsed.data,
      service_id: emptyToNull(parsed.data.service_id),
      assigned_to: emptyToNull(parsed.data.assigned_to),
    })
    .eq("id", id);
  if (error) return fail("Unable to update the visitor.");
  await writeAudit(supabase, { action: "visitor.update", module: "visitors", recordId: id });
  revalidatePath("/app/visitors");
  return ok("Visitor updated.");
}

export async function addVisitorFollowupAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("followups.manage");
  const visitorId = str(formData, "visitor_id");
  const notes = str(formData, "notes");
  const supabase = await createClient();
  const { error } = await supabase.from("visitor_followups").insert({
    visitor_id: visitorId,
    follow_up_date: str(formData, "follow_up_date") || new Date().toISOString().slice(0, 10),
    method: str(formData, "method") || "phone",
    notes,
  });
  if (error) return fail("Unable to save the follow-up note.");
  await supabase
    .from("visitors")
    .update({ follow_up_status: str(formData, "follow_up_status") || "contacted" })
    .eq("id", visitorId);
  revalidatePath("/app/visitors");
  return ok("Follow-up recorded.");
}

export async function convertVisitorAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("visitors.manage");
  const visitorId = str(formData, "visitor_id");
  const memberId = str(formData, "member_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("visitors")
    .update({ converted_member_id: memberId, follow_up_status: "joined" })
    .eq("id", visitorId);
  if (error) return fail("Unable to link this visitor to a member.");
  revalidatePath("/app/visitors");
  return ok("Visitor marked as joined.");
}
