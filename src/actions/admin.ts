"use server";

import { revalidatePath } from "next/cache";
import { ASSEMBLY_NAME, CHURCH_NAME } from "@/lib/assembly";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/session";
import { inferGender, splitFullName } from "@/lib/church-directory";
import { emptyToNull, opt, str } from "@/lib/forms";
import { publicAppOrigin } from "@/lib/site-url";
import { issueSignupTicket } from "@/lib/auth/signup-ticket";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";
import { ROLES, type RoleSlug } from "@/types/roles";

export async function saveDepartmentAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("departments.manage");
  const supabase = await createClient();
  const name = str(formData, "name");
  if (name.length < 2) return fail("Department name is required.");
  const slug = str(formData, "slug") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    name,
    slug,
    description: emptyToNull(str(formData, "description")),
    meeting_day: emptyToNull(str(formData, "meeting_day")),
    meeting_time: emptyToNull(str(formData, "meeting_time")),
    leader_id: emptyToNull(str(formData, "leader_id")),
    assistant_leader_id: emptyToNull(str(formData, "assistant_leader_id")),
    is_active: str(formData, "is_active") !== "false",
  };
  const { error } = id
    ? await supabase.from("departments").update(payload).eq("id", id)
    : await supabase.from("departments").insert(payload);
  if (error) return fail("Unable to save the department.");
  revalidatePath("/app/departments");
  return ok("Department saved.");
}

export async function assignDepartmentMemberAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("departments.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("department_members").upsert({
    department_id: str(formData, "department_id"),
    member_id: str(formData, "member_id"),
    role_in_department: emptyToNull(str(formData, "role_in_department")),
  });
  if (error) return fail("Unable to assign this member.");
  revalidatePath("/app/departments");
  return ok("Member assigned.");
}

export async function saveWorkerAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("workers.manage");
  const supabase = await createClient();
  const payload = {
    assembly_id: user.profile.assembly_id,
    member_id: str(formData, "member_id"),
    position_id: str(formData, "position_id"),
    department_id: emptyToNull(str(formData, "department_id")),
    start_date: str(formData, "start_date") || new Date().toISOString().slice(0, 10),
    end_date: emptyToNull(str(formData, "end_date")),
    status: str(formData, "status") || "active",
    contact_phone: emptyToNull(str(formData, "contact_phone")),
    contact_email: emptyToNull(str(formData, "contact_email")),
    notes: emptyToNull(str(formData, "notes")),
  };
  if (!payload.member_id || !payload.position_id) return fail("Member and position are required.");
  const id = opt(formData, "id");
  const { error } = id
    ? await supabase.from("workers").update(payload).eq("id", id)
    : await supabase.from("workers").insert(payload);
  if (error) return fail("Unable to save the worker record.");
  revalidatePath("/app/workers");
  return ok("Worker record saved.");
}

export async function savePositionAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const supabase = await createClient();
  const name = str(formData, "name");
  if (!name) return fail("Position name is required.");
  const { error } = await supabase.from("positions").insert({
    assembly_id: user.profile.assembly_id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: emptyToNull(str(formData, "description")),
  });
  if (error) return fail("Unable to add the position.");
  revalidatePath("/app/settings");
  return ok("Position added.");
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("users.manage");
  const email = str(formData, "email").toLowerCase();
  const fullName = str(formData, "full_name");
  const role = str(formData, "role_slug") as RoleSlug;
  const memberId = emptyToNull(str(formData, "member_id"));
  if (!email.includes("@")) return fail("Enter a valid email address.");
  if (!ROLES.includes(role)) return fail("Choose a valid role.");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Add SUPABASE_SERVICE_ROLE_KEY on the server to send invitations.");
  }
  const origin = await publicAppOrigin();
  let ticket: string;
  try {
    ticket = await issueSignupTicket({
      email,
      username: (fullName || email).split("@")[0]?.replace(/[^a-zA-Z0-9._]/g, "") || "officer",
      source: "invite",
    });
  } catch {
    return fail("Unable to start this invitation. Try again.");
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, registration: "invite", signup_ticket: ticket },
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error || !data.user) return fail(error?.message ?? "Unable to invite this user.");
  await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role_slug: role },
  });

  const supabase = await createClient();
  await supabase.from("profiles").upsert({
    id: data.user.id,
    assembly_id: actor.profile.assembly_id,
    member_id: memberId,
    role_slug: role,
    full_name: fullName || email,
    email,
    is_active: true,
    invited_at: new Date().toISOString(),
    account_status: "active",
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: actor.id,
  });
  await writeAudit(supabase, {
    action: "user.invite",
    module: "users",
    recordId: data.user.id,
    metadata: { role },
  });
  revalidatePath("/app/users");
  return ok("Invitation sent.");
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("users.manage");
  const role = str(formData, "role_slug") as RoleSlug;
  if (!ROLES.includes(role)) return fail("Invalid role.");
  const userId = str(formData, "user_id");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role_slug: role }).eq("id", userId);
  if (error) return fail("Unable to change this role.");
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role_slug: role } });
  } catch {
    // profiles.role_slug is authoritative; app_metadata is only used when a profile is created.
  }
  await writeAudit(supabase, { action: "user.role", module: "users", recordId: userId, metadata: { role } });
  revalidatePath("/app/users");
  return ok("Role updated.");
}

export async function setUserActiveAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("users.manage");
  const userId = str(formData, "user_id");
  const isActive = str(formData, "is_active") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    is_active: isActive,
    account_status: isActive ? "active" : "suspended",
  }).eq("id", userId);
  if (error) return fail("Unable to update the user.");
  if (!isActive) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.signOut(userId, "global");
    } catch {
      return fail("User disabled locally. Add SUPABASE_SERVICE_ROLE_KEY to revoke their Auth sessions.");
    }
  }
  await writeAudit(supabase, {
    action: isActive ? "user.enable" : "user.disable",
    module: "users",
    recordId: userId,
  });
  revalidatePath("/app/users");
  return ok(isActive ? "User re-enabled." : "User disabled.");
}

export async function resetUserAccessAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("users.manage");
  const email = str(formData, "email");
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Add SUPABASE_SERVICE_ROLE_KEY on the server to send password reset emails.");
  }
  const origin = await publicAppOrigin();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) return fail("Unable to send a reset link.");
  return ok("Password reset email sent.");
}

export async function updateChurchOfficeAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("users.manage");
  const userId = str(formData, "user_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      church_position: str(formData, "church_position"),
      church_responsibility: str(formData, "church_responsibility"),
      assigned_department_id: emptyToNull(str(formData, "assigned_department_id")),
    })
    .eq("id", userId);
  if (error) return fail("Unable to update church office.");
  await writeAudit(supabase, { action: "user.office", module: "users", recordId: userId });
  revalidatePath("/app/users");
  return ok("Church position and responsibility updated.");
}

export async function reviewRegistrationAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("users.manage");
  const userId = str(formData, "user_id");
  const decision = str(formData, "decision");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return fail("Registration not found.");

  if (decision === "reject") {
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: "rejected",
        account_status: "rejected",
        is_active: false,
        approved_at: new Date().toISOString(),
        approved_by: actor.id,
      })
      .eq("id", userId);
    if (error) return fail("Unable to reject this registration.");
    await writeAudit(supabase, { action: "user.reject", module: "users", recordId: userId });
    revalidatePath("/app/users");
    return ok("Registration rejected.");
  }

  const role = str(formData, "role_slug") as RoleSlug;
  if (!ROLES.includes(role)) return fail("Assign a valid system role.");
  const churchPosition = str(formData, "church_position") || profile.church_position || "Member";
  const churchResponsibility = str(formData, "church_responsibility") || profile.church_responsibility || "No specific role";
  const departmentId = emptyToNull(str(formData, "assigned_department_id"));

  let memberId = profile.member_id as string | null;
  if (!memberId) {
    const names = splitFullName(profile.full_name);
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        assembly_id: actor.profile.assembly_id,
        first_name: names.first_name,
        last_name: names.last_name,
        gender: inferGender(churchPosition, churchResponsibility),
        membership_status: "active",
        baptism_status: "unknown",
        primary_department_id: departmentId,
        created_by: actor.id,
      })
      .select("id")
      .single();
    if (memberError || !member) return fail("Approved, but a member record could not be created. Try again.");
    memberId = member.id;
    await supabase.from("member_confidential").upsert({
      member_id: memberId,
      phone: profile.phone,
      email: profile.email,
      date_of_birth: profile.date_of_birth,
    });
  }

  if (departmentId && memberId) {
    await supabase.from("department_members").upsert(
      {
        department_id: departmentId,
        member_id: memberId,
        role_in_department: churchResponsibility,
      },
      { onConflict: "department_id,member_id" },
    );
    if (role === "department_leader") {
      const { data: dept } = await supabase
        .from("departments")
        .select("id, leader_id, assistant_leader_id")
        .eq("id", departmentId)
        .maybeSingle();
      if (dept && !dept.leader_id) {
        await supabase.from("departments").update({ leader_id: memberId }).eq("id", dept.id);
      } else if (dept && !dept.assistant_leader_id && dept.leader_id !== memberId) {
        await supabase.from("departments").update({ assistant_leader_id: memberId }).eq("id", dept.id);
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role_slug: role,
      church_position: churchPosition,
      church_responsibility: churchResponsibility,
      assigned_department_id: departmentId,
      member_id: memberId,
      approval_status: "approved",
      account_status: "active",
      is_active: true,
      approved_at: new Date().toISOString(),
      approved_by: actor.id,
    })
    .eq("id", userId);
  if (error) return fail("Unable to approve this registration.");

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role_slug: role, provisioned_by: "admin" } });
  } catch {
    // profiles.role_slug is authoritative.
  }

  await writeAudit(supabase, {
    action: "user.approve",
    module: "users",
    recordId: userId,
    metadata: { role, churchPosition, churchResponsibility },
  });
  revalidatePath("/app/users");
  return ok("Account approved. The member can now open their assigned portal.");
}

export async function saveSettingsAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("assemblies")
    .update({
      church_name: str(formData, "church_name") || CHURCH_NAME,
      assembly_name: str(formData, "assembly_name") || ASSEMBLY_NAME,
      phone: emptyToNull(str(formData, "phone")),
      email: emptyToNull(str(formData, "email")),
      address: emptyToNull(str(formData, "address")),
      location: emptyToNull(str(formData, "location")),
    })
    .eq("id", user.profile.assembly_id);
  if (error) return fail("Unable to save assembly settings.");
  await writeAudit(supabase, { action: "settings.update", module: "settings" });
  revalidatePath("/app/settings");
  return ok("Settings saved.");
}

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.manage");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
  if (file.size > 20 * 1024 * 1024) return fail("Files must be 20MB or smaller.");
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (!allowed.includes(file.type)) return fail("This file type is not allowed.");

  const category = str(formData, "category") || "administrative";
  const bucket = category === "financial" ? "finance-documents" : "documents";
  const path = `${user.profile.assembly_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return fail("Unable to store the document.");

  const { error } = await supabase.from("documents").insert({
    assembly_id: user.profile.assembly_id,
    title: str(formData, "title") || file.name,
    category,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    visibility: str(formData, "visibility") || "leadership",
    uploaded_by: user.id,
  });
  if (error) return fail("File uploaded, but the document record could not be saved.");
  revalidatePath("/app/documents");
  return ok("Document uploaded.");
}

export async function submitDepartmentReportAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("departments.view");
  const departmentId = str(formData, "department_id");
  if (
    user.profile.role_slug === "department_leader" &&
    departmentId &&
    !user.ledDepartmentIds.includes(departmentId)
  ) {
    return fail("You can only submit a report for your own ministry.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("department_reports").insert({
    assembly_id: user.profile.assembly_id,
    department_id: departmentId,
    title: str(formData, "title"),
    content: str(formData, "content"),
    period_start: emptyToNull(str(formData, "period_start")),
    period_end: emptyToNull(str(formData, "period_end")),
    submitted_by: user.id,
    status: "submitted",
  });
  if (error) return fail("Unable to submit the department report.");
  revalidatePath("/app/departments");
  return ok("Report submitted to assembly leadership.");
}

export async function saveDepartmentActivityAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("departments.view");
  const supabase = await createClient();
  const { error } = await supabase.from("department_activities").insert({
    department_id: str(formData, "department_id"),
    title: str(formData, "title"),
    description: emptyToNull(str(formData, "description")),
    activity_date: str(formData, "activity_date") || new Date().toISOString().slice(0, 10),
  });
  if (error) return fail("Unable to save the activity.");
  revalidatePath("/app/departments");
  return ok("Activity recorded.");
}
