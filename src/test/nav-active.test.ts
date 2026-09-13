import { describe, expect, it } from "vitest";
import { isNavActive } from "@/lib/nav-active";
import { filterFinanceRows, isFinanceBookSlug } from "@/lib/finance-books";
import { navForPortal } from "@/lib/navigation";

const treasurerHrefs = navForPortal("treasurer").map((item) => item.href);
const childrenHrefs = navForPortal("children").map((item) => item.href);
const youthHrefs = navForPortal("youth").map((item) => item.href);

describe("isNavActive", () => {
  it("selects only Tithes on the tithes book, not every finance item", () => {
    const active = treasurerHrefs.filter((href) =>
      isNavActive(href, "/app/finance/tithes", "", treasurerHrefs),
    );
    expect(active).toEqual(["/app/finance/tithes"]);
  });

  it("selects only Transactions on the assembly finance list", () => {
    const active = treasurerHrefs.filter((href) =>
      isNavActive(href, "/app/finance", "", treasurerHrefs),
    );
    expect(active).toEqual(["/app/finance"]);
  });

  it("does not mark finance books active on the dashboard", () => {
    const active = treasurerHrefs.filter((href) =>
      isNavActive(href, "/app/dashboard", "", treasurerHrefs),
    );
    expect(active).toEqual(["/app/dashboard"]);
  });

  it("selects only Parents / Guardians when that section is open", () => {
    const active = childrenHrefs.filter((href) =>
      isNavActive(href, "/app/children", "section=guardians", childrenHrefs),
    );
    expect(active).toEqual(["/app/children?section=guardians"]);
  });

  it("selects only Evangelism when that department focus is open", () => {
    const active = youthHrefs.filter((href) =>
      isNavActive(href, "/app/departments", "focus=evangelism", youthHrefs),
    );
    expect(active).toEqual(["/app/departments?focus=evangelism"]);
  });
});

describe("finance books", () => {
  it("recognizes treasurer book slugs and filters rows", () => {
    expect(isFinanceBookSlug("tithes")).toBe(true);
    expect(isFinanceBookSlug("all")).toBe(false);
    const rows = [
      { type: "income", financial_categories: { slug: "tithes", name: "Tithes" } },
      { type: "income", financial_categories: { slug: "offerings", name: "Offerings" } },
      { type: "expense", financial_categories: { slug: "utilities", name: "Utilities" } },
    ];
    expect(filterFinanceRows(rows, "tithes")).toHaveLength(1);
    expect(filterFinanceRows(rows, "income")).toHaveLength(2);
    expect(filterFinanceRows(rows, "expenses")).toHaveLength(1);
    expect(filterFinanceRows(rows, "all")).toHaveLength(3);
  });
});
