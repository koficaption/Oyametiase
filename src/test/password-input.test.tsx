import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/ui/password-input";

describe("password visibility", () => {
  it("hides the password until the eye is tapped and keeps what was typed", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="password" name="password" aria-label="Password" />);
    const field = screen.getByLabelText("Password");
    await user.type(field, "secret-word");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveValue("secret-word");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");
    expect(field).toHaveValue("secret-word");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveValue("secret-word");
  });

  it("is used on login, register, and password reset", () => {
    for (const file of [
      "src/components/auth/login-form.tsx",
      "src/components/auth/register-form.tsx",
      "src/app/(auth)/update-password/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("PasswordInput");
      expect(source).not.toMatch(/type="password"/);
    }
  });
});

describe("typing speed", () => {
  it("does not stamp the webfont onto every HTML node", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain("sourceSans.variable");
    expect(layout).not.toContain("sourceSans.className");
    expect(layout).not.toContain("Source_Code_Pro");
  });

  it("keeps form fields on a system font without extra word spacing", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("ui-sans-serif, system-ui");
    expect(css).toMatch(/input,\s*select,\s*textarea[\s\S]*word-spacing:\s*normal/);
    expect(css).not.toContain("word-spacing: 0.1em");
  });
});
