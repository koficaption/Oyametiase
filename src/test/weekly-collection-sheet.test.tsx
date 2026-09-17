import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WeeklyCollectionSheet } from "@/components/finance/weekly-collection-sheet";
import { weekDays } from "@/lib/weekly-collections";

vi.mock("@/actions/operations", () => ({
  saveWeeklyCollectionsAction: async () => ({ ok: true, message: "saved" }),
}));

vi.mock("next/link", () => ({
  default({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

const days = weekDays("2026-09-14").map((day) => ({
  ...day,
  church: day.label === "Sunday" ? 400 : 0,
  sundaySchool: day.isSunday ? 80 : 0,
}));

describe("weekly collection sheet UI", () => {
  it("names the week and keeps Sunday school on Sunday only", async () => {
    const user = userEvent.setup();
    render(
      <WeeklyCollectionSheet
        weekStart="2026-09-14"
        weekLabel=""
        prevWeek="2026-09-07"
        nextWeek="2026-09-21"
        days={days}
        month="2026-09"
        monthDays={[
          { iso: "2026-09-06", church: 50, sundaySchool: 0 },
          { iso: "2026-09-20", church: 400, sundaySchool: 80 },
        ]}
        savedMonth={{ church: 100, sundaySchool: 20 }}
        canWrite
        filterLinks={[{ href: "/app/finance/weekly", label: "Weekly" }]}
      />,
    );

    const weekName = screen.getByLabelText("What week is this?");
    expect(weekName).toHaveAttribute("placeholder", "Youth week");
    await user.type(weekName, "Youth week");
    expect(screen.getByText("Youth week")).toBeInTheDocument();
    expect(screen.queryByLabelText("Service date")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Time")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Date for Monday")).toHaveValue("2026-09-14");
    expect(screen.getByLabelText("Date for Sunday")).toHaveValue("2026-09-20");
    expect(screen.queryByLabelText("Month to total")).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Calendar for September 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Monday, 14 Sept 2026, this week/ })).toHaveAttribute(
      "href",
      "/app/finance/weekly?week=2026-09-14&month=2026-09",
    );
    expect(screen.getByRole("link", { name: /Sunday, 20 Sept 2026, this week, GHS 480/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sunday, 6 Sept 2026, GHS 50/ })).toHaveAttribute(
      "href",
      "/app/finance/weekly?week=2026-08-31&month=2026-09",
    );
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute(
      "href",
      "/app/finance/weekly?week=2026-09-14&month=2026-10",
    );
    expect(screen.getByText("Month total · September 2026")).toBeInTheDocument();

    expect(screen.getByLabelText("Sunday school money for Sunday")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sunday school money for Monday")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sunday school money for Saturday")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Church money for Monday")).toBeInTheDocument();
    expect(screen.getByLabelText("Church money for Sunday")).toBeInTheDocument();
  });
});
