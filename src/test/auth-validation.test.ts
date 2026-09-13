import { describe, expect, it } from "vitest";
import { loginIdentifierSchema } from "@/lib/validations/signup";

describe("authentication payloads", () => {
  it("accepts a normal login", () => {
    expect(
      loginIdentifierSchema.safeParse({
        identifier: "elder@oyametiase.local",
        password: "DevPassword123!",
      }).success,
    ).toBe(true);
  });

  it("accepts a username login", () => {
    expect(
      loginIdentifierSchema.safeParse({
        identifier: "elder",
        password: "DevPassword123!",
      }).success,
    ).toBe(true);
  });

  it("rejects a short password", () => {
    expect(loginIdentifierSchema.safeParse({ identifier: "elder", password: "short" }).success).toBe(false);
  });
});

