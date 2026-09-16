import { createAdminClient } from "@/lib/supabase/admin";

export const AUTH_RATE_LIMITS = {
  signup: { max: 5, windowSeconds: 3600 },
  login: { max: 10, windowSeconds: 900 },
  forgot: { max: 5, windowSeconds: 3600 },
} as const;

export type AuthRateAction = keyof typeof AUTH_RATE_LIMITS;

export const AUTH_RATE_LIMIT_MESSAGE = "Too many attempts from this network. Wait and try again.";

export async function isAuthRateLimited(action: AuthRateAction, ipHash: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("auth_rate_limited", {
    p_action: action,
    p_ip_hash: ipHash,
  });
  if (error) {
    throw new Error(error.message || "Unable to check rate limits.");
  }
  return data === true;
}
