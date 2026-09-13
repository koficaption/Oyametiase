"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { emptyToNull, opt, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import { memberSchema, memberSelfUpdateSchema } from "@/lib/validations/members";

function memberPayload(formData: FormData) {
  return {
    first_name: str(formData, "first_name"),
    middle_name: opt(formData, "middle_name"),
    last_name: str(formData, "last_name"),
    gender: str(formData, "gender"),
    date_of_birth: opt(formData, "date_of_birth"),
    phone: opt(formData, "phone"),
    email: opt(formData, "email"),
    residential_address: opt(formData, "residential_address"),
    occupation: opt(formData, "occupation"),
    marital_status: opt(formData, "marital_status"),
    date_joined: opt(formData, "date_joined"),
    membership_status: str(formData, "membership_status"),
    baptism_status: str(formData, "baptism_status"),
    baptism_date: opt(formData, "baptism_date"),
    primary_department_id: opt(formData, "primary_department_id"),
    previous_assembly: opt(formData, "previous_assembly"),
    transfer_notes: opt(formData, "transfer_notes"),
    emergency_contact_name: opt(formData, "emergency_contact_name"),
    emergency_relationship: opt(formData, "emergency_relationship"),
    emergency_phone: opt(formData, "emergency_phone"),
    notes: opt(formData, "notes"),
  };
}

export async function createMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requirePermission("members.manage");
  const parsed = memberSchema.safeParse(memberPayload(formData));
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .insert({
      assembly_id: user.profile.assembly_id,
      first_name: parsed.data.first_name,
      middle_name: emptyToNull(parsed.data.middle_name),
      last_name: parsed.data.last_name,
      gender: parsed.data.gender,
      date_joined: emptyToNull(parsed.data.date_joined),
      membership_status: parsed.data.membership_status,
      baptism_status: parsed.data.baptism_status,
      baptism_date: emptyToNull(parsed.data.baptism_date),
      primary_department_id: emptyToNull(parsed.data.primary_department_id),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return fail("Unable to create the member record.");

  const { error: confidentialError } = await supabase.from("member_confidential").upsert({
    member_id: data.id,
    phone: emptyToNull(parsed.data.phone),
    email: emptyToNull(parsed.data.email),
    residential_address: emptyToNull(parsed.data.residential_address),
    date_of_birth: emptyToNull(parsed.data.date_of_birth),
    occupation: emptyToNull(parsed.data.occupation),
    marital_status: parsed.data.marital_status ?? null,
    emergency_contact_name: emptyToNull(parsed.data.emergency_contact_name),
    emergency_relationship: emptyToNull(parsed.data.emergency_relationship),
    emergency_phone: emptyToNull(parsed.data.emergency_phone),
    notes: emptyToNull(parsed.data.notes),
    previous_assembly: emptyToNull(parsed.data.previous_assembly),
    transfer_notes: emptyToNull(parsed.data.transfer_notes),
  });

  if (confidentialError) return fail("Member created, but confidential details could not be saved.");

  if (parsed.data.primary_department_id) {
    await supabase.from("department_members").upsert({
      department_id: parsed.data.primary_department_id,
      member_id: data.id,
    });
  }

  await writeAudit(supabase, { action: "member.create", module: "members", recordId: data.id });
  revalidatePath("/app/members");
  return ok("Member registered.", { id: data.id });
}

export async function updateMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requirePermission("members.manage");
  const id = str(formData, "id");
  const parsed = memberSchema.safeParse(memberPayload(formData));
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({
      first_name: parsed.data.first_name,
      middle_name: emptyToNull(parsed.data.middle_name),
      last_name: parsed.data.last_name,
      gender: parsed.data.gender,
      date_joined: emptyToNull(parsed.data.date_joined),
      membership_status: parsed.data.membership_status,
      baptism_status: parsed.data.baptism_status,
      baptism_date: emptyToNull(parsed.data.baptism_date),
      primary_department_id: emptyToNull(parsed.data.primary_department_id),
      updated_by: user.id,
    })
    .eq("id", id);

  if (error) return fail("Unable to update the member record.");

  await supabase.from("member_confidential").upsert({
    member_id: id,
    phone: emptyToNull(parsed.data.phone),
    email: emptyToNull(parsed.data.email),
    residential_address: emptyToNull(parsed.data.residential_address),
    date_of_birth: emptyToNull(parsed.data.date_of_birth),
    occupation: emptyToNull(parsed.data.occupation),
    marital_status: parsed.data.marital_status ?? null,
    emergency_contact_name: emptyToNull(parsed.data.emergency_contact_name),
    emergency_relationship: emptyToNull(parsed.data.emergency_relationship),
    emergency_phone: emptyToNull(parsed.data.emergency_phone),
    notes: emptyToNull(parsed.data.notes),
    previous_assembly: emptyToNull(parsed.data.previous_assembly),
    transfer_notes: emptyToNull(parsed.data.transfer_notes),
  });

  await writeAudit(supabase, { action: "member.update", module: "members", recordId: id });
  revalidatePath("/app/members");
  revalidatePath(`/app/members/${id}`);
  return ok("Member updated.");
}

export async function archiveMemberAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("members.manage");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ archived_at: new Date().toISOString(), membership_status: "inactive" })
    .eq("id", id);
  if (error) return fail("Unable to archive this member.");
  await writeAudit(supabase, { action: "member.archive", module: "members", recordId: id });
  revalidatePath("/app/members");
  return ok("Member archived.");
}

export async function updateOwnProfileAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.member) return fail("No member profile is linked to this account.");
  const parsed = memberSelfUpdateSchema.safeParse({
    phone: opt(formData, "phone"),
    email: opt(formData, "email"),
    residential_address: opt(formData, "residential_address"),
    occupation: opt(formData, "occupation"),
    emergency_contact_name: opt(formData, "emergency_contact_name"),
    emergency_relationship: opt(formData, "emergency_relationship"),
    emergency_phone: opt(formData, "emergency_phone"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("member_confidential").upsert({
    member_id: user.member.id,
    ...parsed.data,
  });
  if (error) return fail("Unable to update your profile.");
  revalidatePath("/app/portal");
  return ok("Your profile was updated.");
}
