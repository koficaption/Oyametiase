"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/auth/audit";
import { captchaFailureMessage, verifyCaptchaToken } from "@/lib/auth/captcha";
import { AUTH_RATE_LIMIT_MESSAGE, isAuthRateLimited } from "@/lib/auth/rate-limit";
import { clientIpFromHeaders, hashClientIp } from "@/lib/auth/request-ip";
import { issueSignupTicket, profileIdentityTaken } from "@/lib/auth/signup-ticket";
import { isApprovedAccount, suggestedSystemRole } from "@/lib/church-directory";
import { isOfficerRole, type RoleSlug } from "@/types/roles";
import { fail, ok, zodError, type ActionResult } from "@/lib/validations/common";
import { loginIdentifierSchema, signupSchema } from "@/lib/validations/signup";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/env";
import { str } from "@/lib/forms";
import { publicAppOrigin } from "@/lib/site-url";

async function clientFingerprint() {
  const ip = clientIpFromHeaders(await headers());
  return { ip, ipHash: hashClientIp(ip) };
}

async function rejectIfRateLimited(action: "signup" | "login" | "forgot"): Promise<ActionResult | null> {
  if (!hasServiceRoleKey()) {
    if (action === "signup") {
      return fail("Registration is temporarily unavailable. Add the server service role key.");
    }
    return null;
  }
  try {
    const { ipHash } = await clientFingerprint();
    if (await isAuthRateLimited(action, ipHash)) return fail(AUTH_RATE_LIMIT_MESSAGE);
    return null;
  } catch {
    if (action === "signup") return fail("Registration is temporarily unavailable. Try again later.");
    return null;
  }
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return fail("Supabase is not configured. Add environment variables from .env.example.");
  }

  const limited = await rejectIfRateLimited("login");
  if (limited) return limited;

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
    .select("account_status, approval_status, is_active, role_slug")
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

  if (!isOfficerRole(profile?.role_slug as RoleSlug) || !isApprovedAccount(profile?.account_status, profile?.approval_status)) {
    redirect("/officer-access");
  }
  redirect("/app/dashboard");
}

export async function signupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return fail("Supabase is not configured. Add environment variables from .env.example.");
  }

  if (str(formData, "fax_number")) {
    return fail("Unable to submit this registration.");
  }

  const limited = await rejectIfRateLimited("signup");
  if (limited) return limited;

  const captchaToken = str(formData, "captcha_token") || str(formData, "g-recaptcha-response");
  const { ip } = await clientFingerprint();
  const captcha = await verifyCaptchaToken(captchaToken, ip);
  if (!captcha.ok) {
    return fail(captchaFailureMessage(captcha.reason), { captcha_token: [captchaFailureMessage(captcha.reason)] });
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

  if (!hasServiceRoleKey()) {
    return fail("Registration is temporarily unavailable. Add the server service role key.");
  }

  let ticket: string;
  try {
    const taken = await profileIdentityTaken(parsed.data.email, parsed.data.username);
    if (taken.emailTaken) {
      return fail("An account with this email already exists. Sign in instead.", {
        email: ["An account with this email already exists. Sign in instead."],
      });
    }
    if (taken.usernameTaken) {
      return fail("This username is already taken. Choose another one.", {
        username: ["This username is already taken. Choose another one."],
      });
    }

    ticket = await issueSignupTicket({
      email: parsed.data.email,
      username: parsed.data.username,
      captchaToken,
      source: "captcha",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "expired") {
      return fail(captchaFailureMessage("expired"), { captcha_token: [captchaFailureMessage("expired")] });
    }
    return fail("Unable to submit this registration.");
  }

  const supabase = await createClient();
  const requested = suggestedSystemRole(parsed.data.church_position, parsed.data.church_responsibility);
  const origin = await publicAppOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/officer-access`,
      data: {
        registration: "public",
        signup_ticket: ticket,
        full_name: parsed.data.full_name,
        username: parsed.data.username,
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
    if (error.message.toLowerCase().includes("captcha") || error.message.toLowerCase().includes("username")) {
      return fail(error.message);
    }
    return fail("Unable to submit this registration.");
  }

  if (data.user && !data.session) {
    return ok("Request received. Confirm your email if asked. Open Assign officers in the Presiding Elder menu to give this person an office before they can sign in.");
  }

  redirect("/officer-access");
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
  const limited = await rejectIfRateLimited("forgot");
  if (limited) return limited;
  const email = str(formData, "email");
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return fail("Enter a valid email address.");

  const supabase = await createClient();
  const origin = await publicAppOrigin();
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
  if (password.length > 128) return fail("Password is too long.");
  if (password !== confirm) return fail("Passwords do not match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail("Unable to update password. Sign in again and retry.");
  await writeAudit(supabase, { action: "password_reset", module: "auth" });
  redirect("/app/dashboard");
}
