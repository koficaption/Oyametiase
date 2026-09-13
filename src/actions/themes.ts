"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/session";
import { emptyToNull, opt, str } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/validations/common";

export async function saveChurchThemeAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("themes.manage");
  const year = Number(str(formData, "year"));
  const title = str(formData, "title");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail("Enter a valid year.");
  if (title.length < 8) return fail("Enter the official theme title.");

  const supabase = await createClient();
  const id = opt(formData, "id");
  const payload = {
    assembly_id: user.profile.assembly_id,
    year,
    title,
    scripture: emptyToNull(str(formData, "scripture")),
    description: emptyToNull(str(formData, "description")),
    is_active: str(formData, "is_active") === "true",
    archived_at: str(formData, "is_active") === "true" ? null : undefined,
    created_by: user.id,
  };

  const { error } = id
    ? await supabase
        .from("church_themes")
        .update({
          year: payload.year,
          title: payload.title,
          scripture: payload.scripture,
          description: payload.description,
          is_active: payload.is_active,
          ...(payload.is_active ? { archived_at: null } : {}),
        })
        .eq("id", id)
    : await supabase.from("church_themes").insert({
        assembly_id: payload.assembly_id,
        year: payload.year,
        title: payload.title,
        scripture: payload.scripture,
        description: payload.description,
        is_active: payload.is_active,
        created_by: payload.created_by,
      });

  if (error) {
    if (error.code === "23505") return fail("A theme already exists for that year.");
    return fail("Unable to save the church theme.");
  }
  await writeAudit(supabase, { action: "theme.save", module: "themes", metadata: { year, title } });
  revalidatePath("/app/themes");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  revalidatePath("/app/documents");
  return ok(id ? "Theme updated." : "Theme added.");
}

export async function setActiveThemeAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("themes.manage");
  const id = str(formData, "id");
  if (!id) return fail("Select a theme.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("church_themes")
    .update({ is_active: true, archived_at: null })
    .eq("id", id)
    .eq("assembly_id", user.profile.assembly_id);
  if (error) return fail("Unable to set the current year.");
  await writeAudit(supabase, { action: "theme.activate", module: "themes", recordId: id });
  revalidatePath("/app/themes");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  return ok("Current church year updated.");
}

export async function archiveThemeAction(formData: FormData): Promise<ActionResult> {
  await requirePermission("themes.manage");
  const id = str(formData, "id");
  const restore = str(formData, "restore") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("church_themes")
    .update(restore ? { archived_at: null } : { archived_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return fail("Unable to update the theme archive.");
  revalidatePath("/app/themes");
  revalidatePath("/app/dashboard");
  return ok(restore ? "Theme restored." : "Theme archived.");
}
