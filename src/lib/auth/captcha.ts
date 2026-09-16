const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export type CaptchaFailureReason =
  | "missing"
  | "not_configured"
  | "expired"
  | "failed"
  | "provider_error";

export type CaptchaResult =
  | { ok: true }
  | { ok: false; reason: CaptchaFailureReason };

type SiteVerifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export function recaptchaSiteKey() {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
}

export function recaptchaSecretKey() {
  return process.env.RECAPTCHA_SECRET_KEY?.trim() || "";
}

export function isCaptchaConfigured() {
  return Boolean(recaptchaSiteKey() && recaptchaSecretKey());
}

export function captchaFailureMessage(reason: CaptchaFailureReason) {
  if (reason === "missing") return "Confirm you are not a robot before creating an account.";
  if (reason === "expired") return "The robot check expired. Tick the box again and retry.";
  if (reason === "not_configured") {
    return "Registration is temporarily unavailable. The robot check is not configured on the server.";
  }
  if (reason === "provider_error") {
    return "The robot check could not be verified. Wait a moment and try again.";
  }
  return "The robot check failed. Tick the box and try again.";
}

export async function verifyCaptchaToken(
  token: string,
  remoteIp?: string | null,
): Promise<CaptchaResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "missing" };

  const secret = recaptchaSecretKey();
  if (!secret || secret.startsWith("NEXT_PUBLIC_")) {
    return { ok: false, reason: "not_configured" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  let payload: SiteVerifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, reason: "provider_error" };
    payload = (await response.json()) as SiteVerifyResponse;
  } catch {
    return { ok: false, reason: "provider_error" };
  }

  if (payload.success === true) return { ok: true };

  const codes = payload["error-codes"] ?? [];
  if (codes.includes("timeout-or-duplicate")) return { ok: false, reason: "expired" };
  if (codes.includes("missing-input-response") || codes.includes("invalid-input-response")) {
    return { ok: false, reason: "failed" };
  }
  if (codes.includes("missing-input-secret") || codes.includes("invalid-input-secret")) {
    return { ok: false, reason: "not_configured" };
  }
  return { ok: false, reason: "failed" };
}
