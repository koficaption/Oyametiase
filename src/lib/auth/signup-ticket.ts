import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function issueSignupTicket(input: {
  email: string;
  username: string;
  captchaToken?: string;
  source: "captcha" | "invite";
}) {
  const admin = createAdminClient();
  const captchaHash =
    input.source === "captcha" && input.captchaToken
      ? `captcha:${createHash("sha256").update(input.captchaToken).digest("hex")}`
      : `invite:${randomUUID()}`;

  const { data, error } = await admin.rpc("issue_signup_ticket", {
    p_email: input.email,
    p_username: input.username,
    p_captcha_hash: captchaHash,
    p_ttl_seconds: input.source === "invite" ? 3600 : 600,
  });

  if (error || typeof data !== "string") {
    const message = error?.message?.toLowerCase() ?? "";
    if (message.includes("duplicate") || message.includes("unique")) {
      throw new Error("expired");
    }
    throw new Error(error?.message || "Unable to start registration.");
  }

  return data;
}

export async function profileIdentityTaken(email: string, username: string) {
  const admin = createAdminClient();
  const [{ data: emailRow }, { data: usernameRow }] = await Promise.all([
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
    admin.from("profiles").select("id").eq("username", username).maybeSingle(),
  ]);
  return {
    emailTaken: Boolean(emailRow?.id),
    usernameTaken: Boolean(usernameRow?.id),
  };
}
