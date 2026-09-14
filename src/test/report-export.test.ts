import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { reportPdf } from "@/lib/reports/export";
import type { BuiltReport } from "@/lib/reports/types";

const sample: BuiltReport = {
  type: "membership",
  title: "Membership Report",
  churchName: "The Church of Pentecost",
  assemblyName: "Oyame Tease Assembly",
  year: 2026,
  periodLabel: "Year 2026",
  from: "2026-01-01",
  to: "2026-12-31",
  generatedAt: "2026-09-13T00:00:00.000Z",
  preparedBy: "Secretary",
  approvedBy: "Presiding Elder",
  theme: {
    year: 2026,
    title: "The Church Unleashed to Transform Society Through the Gospel and the Power of the Holy Spirit.",
    scripture: null,
    description: null,
  },
  sections: [
    {
      title: "Membership statistics",
      stats: [{ label: "Total members", value: "12" }],
    },
  ],
};

describe("formal reports", () => {
  it("uses the Pentecost emblem and a watermark, not Pentecost colour bars", () => {
    const source = readFileSync("src/lib/reports/export.ts", "utf8");
    expect(source).toContain("cop-emblem.png");
    expect(source).toContain("opacity: 0.08");
    expect(source).not.toContain("[0, 80, 200]");
    expect(source).not.toContain("[255, 209, 0]");
    expect(source).not.toContain("FF0B2447");
  });

  it("builds a PDF letterhead", async () => {
    const buffer = await reportPdf(sample);
    const header = Buffer.from(buffer).subarray(0, 4).toString("utf8");
    expect(header).toBe("%PDF");
  });
});
