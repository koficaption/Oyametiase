import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Church of Pentecost colours", () => {
  it("uses the emblem royal blue, gold, navy and red", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("#0050c8");
    expect(css).toContain("#ffd100");
    expect(css).toContain("#0a2266");
    expect(css).toContain("#e30613");
    expect(css).toContain("--cop-blue");
    expect(css).toContain("--cop-gold");
  });
});
