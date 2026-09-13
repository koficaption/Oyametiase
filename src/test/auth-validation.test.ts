import { describe, expect, it } from "vitest";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe("authentication payloads", () => {
  it("accepts a normal login", () => {
    expect(
      loginSchema.safeParse({
        email: "elder@oyametiase.local",
        password: "DevPassword123!",
      }).success,
    ).toBe(true);
  });

  it("rejects a short password and an invalid email", () => {
    expect(loginSchema.safeParse({ email: "elder", password: "short" }).success).toBe(false);
  });
});
