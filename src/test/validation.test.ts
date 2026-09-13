import { describe, expect, it } from "vitest";
import { memberSchema, memberSelfUpdateSchema } from "@/lib/validations/members";
import { attendanceSchema, transactionSchema, visitorSchema } from "@/lib/validations/operations";

describe("member validation", () => {
  it("creates a valid member payload", () => {
    const result = memberSchema.safeParse({
      first_name: "Akosua",
      last_name: "Asante",
      gender: "female",
      membership_status: "active",
      baptism_status: "baptized",
      email: "akosua@example.com",
      phone: "+233201234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = memberSchema.safeParse({
      first_name: "Akosua",
      last_name: "Asante",
      gender: "female",
      membership_status: "active",
      baptism_status: "baptized",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("limits self-service edits to permitted fields", () => {
    const result = memberSelfUpdateSchema.safeParse({
      phone: "+233201234567",
      email: "member@example.com",
    });
    expect(result.success).toBe(true);
    expect(memberSelfUpdateSchema.safeParse({ membership_status: "deceased" }).success).toBe(true);
    expect(memberSelfUpdateSchema.parse({ membership_status: "deceased" })).not.toHaveProperty(
      "membership_status",
    );
  });
});

describe("attendance validation", () => {
  it("requires at least one record", () => {
    const result = attendanceSchema.safeParse({
      attendance_date: "2026-09-13",
      records: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts member and walk-in visitor records together", () => {
    const result = attendanceSchema.safeParse({
      attendance_date: "2026-09-13",
      records: [
        { member_id: "11111111-1111-4111-8111-111111111111", status: "present" },
        { visitor_name: "Grace Nkrumah", status: "present" },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("finance validation", () => {
  it("rejects zero and negative amounts", () => {
    expect(
      transactionSchema.safeParse({
        occurred_on: "2026-09-13",
        type: "income",
        category_id: "11111111-1111-4111-8111-111111111111",
        amount: 0,
        payment_method: "cash",
      }).success,
    ).toBe(false);
  });

  it("accepts a tithe record", () => {
    expect(
      transactionSchema.safeParse({
        occurred_on: "2026-09-13",
        type: "income",
        category_id: "11111111-1111-4111-8111-111111111111",
        amount: 250,
        payment_method: "mobile_money",
      }).success,
    ).toBe(true);
  });
});

describe("visitor validation", () => {
  it("registers a visitor follow-up payload", () => {
    const result = visitorSchema.safeParse({
      full_name: "Samuel Oppong",
      date_visited: "2026-09-12",
      follow_up_status: "new",
      phone: "+233241000101",
    });
    expect(result.success).toBe(true);
  });
});
