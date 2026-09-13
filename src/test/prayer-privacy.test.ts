import { describe, expect, it } from "vitest";
import type { PrayerPrivacy } from "@/types/database";
import type { RoleSlug } from "@/types/roles";

function canReadPrayer(input: {
  role: RoleSlug;
  privacy: PrayerPrivacy;
  isOwner: boolean;
  isPrayerTeam: boolean;
}) {
  if (input.isOwner) return true;
  if (input.privacy === "private") return false;
  if (input.privacy === "presiding_elder") return input.role === "presiding_elder";
  if (input.privacy === "authorized_leaders") {
    return input.role === "presiding_elder" || input.role === "secretary";
  }
  if (input.privacy === "prayer_team") {
    return input.role === "presiding_elder" || input.isPrayerTeam;
  }
  return false;
}

describe("prayer privacy", () => {
  it("never reveals a private request just because the viewer is an administrator", () => {
    expect(
      canReadPrayer({
        role: "presiding_elder",
        privacy: "private",
        isOwner: false,
        isPrayerTeam: false,
      }),
    ).toBe(false);
    expect(
      canReadPrayer({
        role: "secretary",
        privacy: "private",
        isOwner: false,
        isPrayerTeam: false,
      }),
    ).toBe(false);
    expect(
      canReadPrayer({
        role: "treasurer",
        privacy: "private",
        isOwner: false,
        isPrayerTeam: false,
      }),
    ).toBe(false);
  });

  it("lets the author read their own private request", () => {
    expect(
      canReadPrayer({
        role: "member",
        privacy: "private",
        isOwner: true,
        isPrayerTeam: false,
      }),
    ).toBe(true);
  });

  it("keeps the Treasurer out of prayer-team requests", () => {
    expect(
      canReadPrayer({
        role: "treasurer",
        privacy: "prayer_team",
        isOwner: false,
        isPrayerTeam: false,
      }),
    ).toBe(false);
  });
});
