import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe("independent green and white scrolling", () => {
  it("locks the app shell to the viewport so the window does not scroll both panes", () => {
    const layout = readFileSync("src/app/app/layout.tsx", "utf8");
    expect(layout).toContain("h-svh");
    expect(layout).toContain("overflow-hidden");
    expect(layout).not.toContain("min-h-screen");
    expect(layout).toMatch(/data-scroll-pane="main"/);
    expect(layout).toMatch(/overflow-y-auto/);
    expect(layout).toMatch(/overscroll-contain/);
  });

  it("lets the green sidebar scroll its own nav without moving the white pane", () => {
    const sidebar = readFileSync("src/components/layout/app-sidebar.tsx", "utf8");
    expect(sidebar).toMatch(/data-scroll-pane="sidebar"/);
    expect(sidebar).toContain("h-full");
    expect(sidebar).toContain("overflow-hidden");
    expect(sidebar).toMatch(/overflow-y-auto/);
    expect(sidebar).toMatch(/overscroll-contain/);
  });

  it("lets the mobile green menu scroll inside the sheet", () => {
    const mobile = readFileSync("src/components/layout/mobile-nav.tsx", "utf8");
    expect(mobile).toContain("overflow-hidden");
    expect(mobile).toMatch(/overflow-y-auto/);
    expect(mobile).toMatch(/overscroll-contain/);
  });

  it("renders the treasurer green pane as a height-locked overflow column", () => {
    render(
      <AppSidebar
        role="treasurer"
        portal="treasurer"
        churchName="The Church of Pentecost"
        assemblyName="Onyame Tease Assembly"
      />,
    );
    const sidebar = document.querySelector('[data-scroll-pane="sidebar"]');
    expect(sidebar).toBeTruthy();
    expect(sidebar).toHaveAttribute("data-scroll-pane", "sidebar");
    expect(sidebar).toHaveClass("h-full", "overflow-hidden");
    const nav = sidebar!.querySelector("nav");
    expect(nav).toHaveClass("overflow-y-auto", "overscroll-contain", "min-h-0");
  });
});
