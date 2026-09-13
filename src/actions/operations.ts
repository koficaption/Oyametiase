"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { emptyToNull, opt, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import {
  announcementSchema,
  eventSchema,
  followupSchema,
  prayerSchema,
  transactionSchema,
  welfareSchema,
} from "@/lib/validations/operations";

export async function saveEventAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("events.manage");
  const parsed = eventSchema.safeParse({
    title: str(formData, "title"),
    description: opt(formData, "description"),
    starts_at: str(formData, "starts_at"),
    ends_at: opt(formData, "ends_at"),
    venue: opt(formData, "venue"),
    organizer_id: opt(formData, "organizer_id"),
    department_id: opt(formData, "department_id"),
    status: str(formData, "status") || "scheduled",
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    ends_at: emptyToNull(parsed.data.ends_at),
    organizer_id: emptyToNull(parsed.data.organizer_id),
    department_id: emptyToNull(parsed.data.department_id),
    created_by: user.id,
  };
  const query = id
    ? supabase.from("events").update(payload).eq("id", id).select("id").single()
    : supabase.from("events").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error || !data) return fail("Unable to save the event.");
  await writeAudit(supabase, { action: id ? "event.update" : "event.create", module: "events", recordId: data.id });
  revalidatePath("/app/events");
  return ok("Event saved.");
}

export async function saveAnnouncementAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("announcements.manage");
  const parsed = announcementSchema.safeParse({
    title: str(formData, "title"),
    content: str(formData, "content"),
    category: str(formData, "category") || "general",
    audience: str(formData, "audience") || "everyone",
    department_id: opt(formData, "department_id"),
    published_at: opt(formData, "published_at"),
    expires_at: opt(formData, "expires_at"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    department_id: emptyToNull(parsed.data.department_id),
    published_at: parsed.data.published_at || new Date().toISOString(),
    expires_at: emptyToNull(parsed.data.expires_at),
    author_id: user.id,
  };
  const { data, error } = id
    ? await supabase.from("announcements").update(payload).eq("id", id).select("id").single()
    : await supabase.from("announcements").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to publish the announcement.");
  await writeAudit(supabase, {
    action: "announcement.publish",
    module: "announcements",
    recordId: data.id,
  });
  const { data: profiles } = await supabase.from("profiles").select("id, assembly_id").eq("is_active", true);
  if (profiles?.length) {
    await supabase.from("notifications").insert(
      profiles.map((profile) => ({
        assembly_id: profile.assembly_id,
        user_id: profile.id,
        title: parsed.data.title,
        body: "A new church announcement has been published.",
        type: "announcement",
        link: "/app/announcements",
      })),
    );
  }
  revalidatePath("/app/announcements");
  return ok("Announcement published.");
}

export async function submitPrayerAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = prayerSchema.safeParse({
    title: str(formData, "title"),
    request: str(formData, "request"),
    privacy_level: str(formData, "privacy_level") || "prayer_team",
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("prayer_requests").insert({
    assembly_id: user.profile.assembly_id,
    member_id: user.member?.id ?? null,
    submitted_by: user.id,
    ...parsed.data,
  });
  if (error) return fail("Unable to submit the prayer request.");
  revalidatePath("/app/prayer-requests");
  return ok("Prayer request submitted.");
}

export async function updatePrayerStatusAction(formData: FormData): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prayer_requests")
    .update({ status: str(formData, "status") })
    .eq("id", str(formData, "id"));
  if (error) return fail("Unable to update this prayer request.");
  await writeAudit(supabase, {
    action: "prayer.status",
    module: "prayer_requests",
    recordId: str(formData, "id"),
  });
  revalidatePath("/app/prayer-requests");
  return ok("Prayer request updated.");
}

export async function saveWelfareAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("welfare.manage");
  const parsed = welfareSchema.safeParse({
    member_id: opt(formData, "member_id"),
    category: str(formData, "category"),
    description: str(formData, "description"),
    assistance_requested: opt(formData, "assistance_requested"),
    assistance_provided: opt(formData, "assistance_provided"),
    amount: opt(formData, "amount") ? Number(str(formData, "amount")) : undefined,
    responsible_officer_id: opt(formData, "responsible_officer_id"),
    status: str(formData, "status") || "open",
    notes: opt(formData, "notes"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    member_id: emptyToNull(parsed.data.member_id),
    responsible_officer_id: emptyToNull(parsed.data.responsible_officer_id),
    created_by: user.id,
  };
  const { data, error } = id
    ? await supabase.from("welfare_cases").update(payload).eq("id", id).select("id").single()
    : await supabase.from("welfare_cases").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to save the welfare case.");
  await writeAudit(supabase, { action: "welfare.save", module: "welfare", recordId: data.id });
  revalidatePath("/app/welfare");
  return ok("Welfare case saved.");
}

export async function saveTransactionAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("finance.manage");
  const parsed = transactionSchema.safeParse({
    occurred_on: str(formData, "occurred_on"),
    type: str(formData, "type"),
    category_id: str(formData, "category_id"),
    amount: Number(str(formData, "amount")),
    description: opt(formData, "description"),
    payment_method: str(formData, "payment_method") || "cash",
    reference: opt(formData, "reference"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    ...parsed.data,
    recorded_by: user.id,
  };
  const { data, error } = id
    ? await supabase.from("financial_transactions").update(payload).eq("id", id).select("id").single()
    : await supabase.from("financial_transactions").insert(payload).select("id").single();
  if (error || !data) return fail("Unable to save the transaction.");
  await writeAudit(supabase, {
    action: id ? "finance.update" : "finance.create",
    module: "finance",
    recordId: data.id,
  });
  revalidatePath("/app/finance");
  return ok("Transaction saved.");
}

export async function saveFollowupAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("followups.manage");
  const parsed = followupSchema.safeParse({
    member_id: str(formData, "member_id"),
    follow_up_type: str(formData, "follow_up_type") || "new_member",
    assigned_to: opt(formData, "assigned_to"),
    status: str(formData, "status") || "open",
    progress: opt(formData, "progress"),
    notes: opt(formData, "notes"),
    next_contact_on: opt(formData, "next_contact_on"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_followups")
    .insert({
      assembly_id: user.profile.assembly_id,
      ...parsed.data,
      assigned_to: emptyToNull(parsed.data.assigned_to),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail("Unable to create the follow-up.");
  revalidatePath("/app/follow-ups");
  return ok("Follow-up created.");
}

export async function addFollowupAttemptAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("followups.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("member_followup_attempts").insert({
    followup_id: str(formData, "followup_id"),
    attempt_date: str(formData, "attempt_date") || new Date().toISOString().slice(0, 10),
    method: str(formData, "method") || "phone",
    notes: str(formData, "notes"),
  });
  if (error) return fail("Unable to record the contact attempt.");
  revalidatePath("/app/follow-ups");
  return ok("Contact attempt recorded.");
}
