import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSEMBLY_LOCATION, ASSEMBLY_NAME, ASSEMBLY_SLUG } from "@/lib/assembly";

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (/\.(ts|tsx|md|sql)$/.test(name)) acc.push(path);
  }
  return acc;
}

describe("assembly name", () => {
  it("is Onyame Tease Assembly", () => {
    expect(ASSEMBLY_NAME).toBe("Onyame Tease Assembly");
    expect(ASSEMBLY_LOCATION).toBe("Onyame Tease");
    expect(ASSEMBLY_SLUG).toBe("onyame-tease");
    expect(ASSEMBLY_NAME).not.toMatch(/Tiase/i);
    expect(ASSEMBLY_NAME).not.toMatch(/\bOyame\b/i);
  });

  it("does not show Oyame or Tiase on user-facing surfaces", () => {
    const files = [
      ...walk("src/app"),
      ...walk("src/components"),
      ...walk("src/lib"),
      ...walk("src/actions"),
      "README.md",
      "docs/ARCHITECTURE.md",
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/Oyame Tiase/i);
      expect(text, file).not.toMatch(/\bOyame\b/);
    }
  });

  it("renames the live assembly row in a follow-up migration", () => {
    const sql = readFileSync("supabase/migrations/20260914074500_onyame_tease_assembly_name.sql", "utf8");
    expect(sql).toContain("Onyame Tease Assembly");
    expect(sql).toContain("UPDATE public.assemblies");
    expect(sql).toContain("UPDATE public.church_themes");
  });
});
