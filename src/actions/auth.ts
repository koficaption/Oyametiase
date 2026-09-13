"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/auth/audit";
import { isApprovedAccount, suggestedSystemRole } from "@/lib/church-directory";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import { loginIdentifierSchema, signupSchema } from "@/lib/validations/signup";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { str } from "@/lib/forms";

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return fail("Supabase is not configured. Add environment variables from .env.example.");
  }

  const parsed = loginIdentifierSchema.safeParse({
    identifier: str(formData, "identifier") || str(formData, "email"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const identifier = parsed.data.identifier;
  let email = identifier;
  if (!identifier.includes("@")) {
    const { data } = await supabase.rpc("lookup_login_email", { identifier });
    if (typeof data !== "string" || !data.includes("@")) {
      return fail("Invalid email, username, or password.");
    }
    email = data;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    return fail("Invalid email, username, or password.");
  }

  const userId = (await supabase.auth.getClaims()).data?.claims?.sub ?? "";
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status, approval_status, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.account_status === "rejected") {
    await supabase.auth.signOut();
    return fail("This registration was not approved. Contact the Presiding Elder.");
  }
  if (profile?.account_status === "suspended" || profile?.is_active === false) {
    await supabase.auth.signOut();
    return fail("This account is suspended. Contact the Presiding Elder.");
  }

  await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  await writeAudit(supabase, { action: "login", module: "auth" });

  if (!isApprovedAccount(profile?.account_status, profile?.approval_status)) {
    redirect("/pending-approval");
  }
  redirect("/app/dashboard");
}

export async function signupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return fail("Supabase is not configured. Add environment variables from .env.example.");
  }

  const parsed = signupSchema.safeParse({
    full_name: str(formData, "full_name"),
    username: str(formData, "username"),
    date_of_birth: str(formData, "date_of_birth"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    whatsapp_number: str(formData, "whatsapp_number"),
    church_position: str(formData, "church_position"),
    church_responsibility: str(formData, "church_responsibility"),
    password: str(formData, "password"),
    confirm: str(formData, "confirm"),
  });
  if (!parsed.success) return zodError(parsed.error);

  const supabase = await createClient();
  const requested = suggestedSystemRole(parsed.data.church_position, parsed.data.church_responsibility);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/app/dashboard`,
      data: {
        registration: "public",
        full_name: parsed.data.full_name,
        username: parsed.data.username.toLowerCase(),
        date_of_birth: parsed.data.date_of_birth,
        phone: parsed.data.phone,
        whatsapp_number: parsed.data.whatsapp_number,
        church_position: parsed.data.church_position,
        church_responsibility: parsed.data.church_responsibility,
        requested_system_role: requested,
      },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return fail("An account with this email already exists. Sign in instead.");
    }
    return fail(error.message || "Unable to submit this registration.");
  }

  if (data.user && !data.session) {
    return ok("Account created. Confirm your email if asked, then sign in.");
  }

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
