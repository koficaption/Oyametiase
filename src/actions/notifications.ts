"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";

export async function markNotificationReadAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return fail("Unable to update notification.");
  revalidatePath("/app");
  return ok();
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) return fail("Unable to mark notifications as read.");
  revalidatePath("/app");
  return ok();
}

export async function notifyUserForMember(input: {
  memberId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
}) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, assembly_id")
    .eq("member_id", input.memberId)
    .maybeSingle();
  if (!profile) return;
  await supabase.from("notifications").insert({
    assembly_id: profile.assembly_id,
    user_id: profile.id,
    title: input.title,
    body: input.body,
    type: input.type,
    link: input.link ?? null,
  });
}
