"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/auth/audit";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { str } from "@/lib/forms";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return fail("Supabase is not configured. Add environment variables from .env.example.");
  }

  const parsed = loginSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail("Invalid email or password.");
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", (await supabase.auth.getClaims()).data?.claims?.sub ?? "");

  await writeAudit(supabase, { action: "login", module: "auth" });
  redirect("/app/dashboard");
}

export async function logoutAction() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  await writeAudit(supabase, { action: "logout", module: "auth" });
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail("Supabase is not configured.");
  const email = str(formData, "email");
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) return fail("Unable to send a reset email right now.");
  return ok("If an account exists, a reset link has been sent.");
}

export async function updatePasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");
  if (password.length < 10) return fail("Use at least 10 characters.");
  if (password !== confirm) return fail("Passwords do not match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail("Unable to update password. Sign in again and retry.");
  await writeAudit(supabase, { action: "password_reset", module: "auth" });
  redirect("/app/dashboard");
}
