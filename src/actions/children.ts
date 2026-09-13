"use server";

import { revalidatePath } from "next/cache";
import { requireChildrenAccess } from "@/lib/auth/session";
import { hasPermission } from "@/types/roles";
import { emptyToNull, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";

export async function saveChildAction(formData: FormData): Promise<ActionResult> {
  const user = await requireChildrenAccess();
  if (!hasPermission(user.profile.role_slug, "children.manage")) {
    return fail("You cannot change children's records.");
  }
  if (user.profile.role_slug === "department_leader") {
    const childrenDept = user.ledDepartments.find((dept) => dept.slug === "children" || dept.ministry_kind === "children");
    if (!childrenDept) return fail("You can only manage children in your own ministry.");
  }
  const supabase = await createClient();
  const payload = {
    assembly_id: user.profile.assembly_id,
    department_id: str(formData, "department_id"),
    first_name: str(formData, "first_name"),
    last_name: str(formData, "last_name"),
    gender: str(formData, "gender"),
    date_of_birth: emptyToNull(str(formData, "date_of_birth")),
    parent_member_id: emptyToNull(str(formData, "parent_member_id")),
    guardian_name: emptyToNull(str(formData, "guardian_name")),
    guardian_phone: emptyToNull(str(formData, "guardian_phone")),
    class_name: emptyToNull(str(formData, "class_name")),
    notes: emptyToNull(str(formData, "notes")),
  };
  if (!payload.first_name || !payload.last_name) return fail("Enter the child's name.");
  const { error } = await supabase.from("ministry_children").insert(payload);
  if (error) return fail("Unable to save this child record.");
  revalidatePath("/app/children");
  return ok("Child record saved.");
}
