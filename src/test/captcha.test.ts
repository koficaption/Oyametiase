import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captchaFailureMessage,
  isCaptchaConfigured,
  verifyCaptchaToken,
} from "@/lib/auth/captcha";

describe("server-side CAPTCHA verification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a missing token without calling Google", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "server-secret");
    const result = await verifyCaptchaToken("   ");
    expect(result).toEqual({ ok: false, reason: "missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the secret key is missing", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "public-site-key");
    expect(isCaptchaConfigured()).toBe(false);
    await expect(verifyCaptchaToken("token-from-browser")).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("accepts only a successful siteverify response from Google", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "server-secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, hostname: "localhost" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyCaptchaToken("ok-token", "1.2.3.4")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("secret=server-secret");
    expect(String(init.body)).toContain("response=ok-token");
    expect(String(init.body)).toContain("remoteip=1.2.3.4");
  });

  it("rejects expired, duplicate, failed, and provider errors", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "server-secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyCaptchaToken("old")).resolves.toEqual({ ok: false, reason: "expired" });
    await expect(verifyCaptchaToken("bad")).resolves.toEqual({ ok: false, reason: "failed" });
    await expect(verifyCaptchaToken("down")).resolves.toEqual({ ok: false, reason: "provider_error" });
    await expect(verifyCaptchaToken("offline")).resolves.toEqual({ ok: false, reason: "provider_error" });
    expect(captchaFailureMessage("missing")).toMatch(/not a robot/i);
  });

  it("never ships the secret as a public Next.js variable", () => {
    expect(process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY).toBeUndefined();
  });
});
