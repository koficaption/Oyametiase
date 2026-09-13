import { describe, expect, it } from "vitest";
import { isApprovedAccount, suggestedSystemRole } from "@/lib/church-directory";
import { signupSchema } from "@/lib/validations/signup";

describe("registration requests", () => {
  it("stores position and responsibility separately and does not grant PE access from the form", () => {
    expect(suggestedSystemRole("Presiding Elder", "No specific role")).toBe("member");
    expect(suggestedSystemRole("Elder", "Youth Ministry Leader")).toBe("department_leader");
    expect(suggestedSystemRole("Deaconess", "Women's Ministry Financial Secretary")).toBe("ministry_finance");
    expect(suggestedSystemRole("Member", "No specific role")).toBe("member");
  });

  it("accepts a complete registration payload", () => {
    const result = signupSchema.safeParse({
      full_name: "John Mensah",
      username: "john.mensah",
      date_of_birth: "1990-03-12",
      email: "john.mensah@example.com",
      phone: "+233241000200",
      whatsapp_number: "+233241000200",
      church_position: "Elder",
      church_responsibility: "Youth Ministry Leader",
      password: "AssemblyPass12",
      confirm: "AssemblyPass12",
    });
    expect(result.success).toBe(true);
  });

  it("lets pending and active accounts into the portal, but not rejected ones", () => {
    expect(isApprovedAccount("pending", "pending")).toBe(true);
    expect(isApprovedAccount("active", "approved")).toBe(true);
    expect(isApprovedAccount("rejected", "rejected")).toBe(false);
    expect(isApprovedAccount("suspended", "approved")).toBe(false);
  });

  it("rejects a short password and a missing church position", () => {
    expect(
      signupSchema.safeParse({
        full_name: "Mary",
        username: "mary",
        date_of_birth: "1992-01-01",
        email: "mary@example.com",
        phone: "0241000201",
        whatsapp_number: "0241000201",
        church_position: "Deaconess",
        church_responsibility: "No specific role",
        password: "short",
        confirm: "short",
      }).success,
    ).toBe(false);
  });
});
