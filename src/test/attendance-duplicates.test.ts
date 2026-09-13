import { describe, expect, it } from "vitest";

function attendanceKey(input: {
  memberId?: string | null;
  visitorId?: string | null;
  date: string;
  serviceId?: string | null;
  eventId?: string | null;
}) {
  const subject = input.memberId ? `member:${input.memberId}` : `visitor:${input.visitorId}`;
  return [subject, input.date, input.serviceId ?? "none", input.eventId ?? "none"].join("|");
}

describe("attendance uniqueness", () => {
  it("treats the same member, date, and service as a duplicate", () => {
    const first = attendanceKey({
      memberId: "m1",
      date: "2026-09-13",
      serviceId: "sunday",
    });
    const second = attendanceKey({
      memberId: "m1",
      date: "2026-09-13",
      serviceId: "sunday",
    });
    expect(first).toBe(second);
  });

  it("allows the same member at a different service on the same day", () => {
    const sunday = attendanceKey({ memberId: "m1", date: "2026-09-13", serviceId: "sunday" });
    const midweek = attendanceKey({ memberId: "m1", date: "2026-09-13", serviceId: "midweek" });
    expect(sunday).not.toBe(midweek);
  });

  it("does not require a fake member account for a visitor", () => {
    const visitor = attendanceKey({
      visitorId: "v1",
      date: "2026-09-13",
      serviceId: "sunday",
    });
    expect(visitor.startsWith("visitor:")).toBe(true);
  });
});
