import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function pngSize(path: string) {
  const png = readFileSync(path);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("favicon", () => {
  it("uses a square Church of Pentecost emblem", () => {
    expect(pngSize("src/app/icon.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("src/app/apple-icon.png")).toEqual({ width: 180, height: 180 });
    expect(pngSize("public/favicon-32.png")).toEqual({ width: 32, height: 32 });
    const ico = readFileSync("src/app/favicon.ico");
    expect(ico.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).toBe(true);
  });
});
