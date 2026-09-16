import { createHash } from "node:crypto";

export function clientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return ip;
}

export function hashClientIp(ip: string) {
  const salt = process.env.RECAPTCHA_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "auth-ip";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}
