import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTH_RATE_LIMITS } from "@/lib/auth/rate-limit";
import { signupSchema } from "@/lib/validations/signup";

describe("signup cannot skip the server CAPTCHA", () => {
  it("verifies the token on the server before creating an Auth user", () => {
    const action = readFileSync("src/actions/auth.ts", "utf8");
    const verifyAt = action.indexOf("verifyCaptchaToken");
    const signUpAt = action.indexOf("supabase.auth.signUp");
    expect(verifyAt).toBeGreaterThan(0);
    expect(signUpAt).toBeGreaterThan(verifyAt);
    expect(action).toContain("issueSignupTicket");
    expect(action).toContain("signup_ticket");
    expect(action).toContain("isAuthRateLimited");
    expect(action).not.toMatch(/verifyCaptchaToken[\s\S]*if \(process\.env\.NODE_ENV !== "production"\)/);
  });

  it("does not create accounts from the browser Supabase client", () => {
    const client = readFileSync("src/lib/supabase/client.ts", "utf8");
    expect(client).not.toContain("signUp");
    const register = readFileSync("src/components/auth/register-form.tsx", "utf8");
    expect(register).toContain("signupAction");
    expect(register).toContain("CaptchaField");
    expect(register).not.toContain("createBrowserClient");
    expect(readFileSync("src/components/auth/captcha-field.tsx", "utf8")).toContain(
      "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
    );
    expect(readFileSync("src/components/auth/captcha-field.tsx", "utf8")).not.toContain(
      "RECAPTCHA_SECRET_KEY",
    );
  });

  it("rate-limits signup, login, and password reset", () => {
    expect(AUTH_RATE_LIMITS.signup).toEqual({ max: 5, windowSeconds: 3600 });
    expect(AUTH_RATE_LIMITS.login).toEqual({ max: 10, windowSeconds: 900 });
    expect(AUTH_RATE_LIMITS.forgot).toEqual({ max: 5, windowSeconds: 3600 });
    const sql = readFileSync("supabase/migrations/20260916183301_signup_captcha_and_rate_limits.sql", "utf8");
    expect(sql).toContain("consume_signup_ticket");
    expect(sql).toContain("auth_rate_limited");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.issue_signup_ticket");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.issue_signup_ticket");
    expect(sql).toContain("Registration requires a verified CAPTCHA");
  });

  it("rejects duplicate identity and unsafe names on the server schema", () => {
    expect(
      signupSchema.safeParse({
        full_name: "Ama <script>",
        username: "ama",
        date_of_birth: "1990-01-01",
        email: "ama@example.com",
        phone: "0241000200",
        whatsapp_number: "0241000200",
        church_position: "Elder",
        church_responsibility: "No specific role",
        password: "AssemblyPass12",
        confirm: "AssemblyPass12",
      }).success,
    ).toBe(false);

    const parsed = signupSchema.safeParse({
      full_name: "Ama Mensah",
      username: "Ama.Mensah",
      date_of_birth: "1990-01-01",
      email: "Ama.Mensah@Example.COM",
      phone: "0241000200",
      whatsapp_number: "0241000200",
      church_position: "Elder",
      church_responsibility: "No specific role",
      password: "AssemblyPass12",
      confirm: "AssemblyPass12",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ama.mensah@example.com");
      expect(parsed.data.username).toBe("ama.mensah");
    }
  });
});
