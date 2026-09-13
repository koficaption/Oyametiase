import { categoryLabel, type FinanceRow } from "@/components/finance/finance-book";

export const FINANCE_BOOK_KINDS = ["tithes", "offerings", "donations", "income", "expenses"] as const;

export type FinanceBookSlug = (typeof FINANCE_BOOK_KINDS)[number];
export type FinanceBookKind = FinanceBookSlug | "all";

export const FINANCE_BOOK_META: Record<FinanceBookKind, { title: string; description: string }> = {
  all: {
    title: "Assembly finance",
    description: "Every assembly tithe, offering, donation, and expense on one list. Ministry money stays on separate books.",
  },
  tithes: {
    title: "Tithes",
    description: "Members' tithes recorded for the assembly. Ministry books stay separate.",
  },
  offerings: {
    title: "Offerings",
    description: "Sunday and special offerings for the assembly.",
  },
  donations: {
    title: "Donations",
    description: "Gifts and donations given to the assembly.",
  },
  income: {
    title: "Income",
    description: "All money coming into the assembly books.",
  },
  expenses: {
    title: "Expenses",
    description: "Money paid out from the assembly books.",
  },
};

export function isFinanceBookSlug(value: string): value is FinanceBookSlug {
  return (FINANCE_BOOK_KINDS as readonly string[]).includes(value);
}

export function filterFinanceRows<T extends Pick<FinanceRow, "type" | "financial_categories">>(
  rows: T[],
  kind: FinanceBookKind,
): T[] {
  if (kind === "tithes") return rows.filter((row) => categoryLabel(row).includes("tithe"));
  if (kind === "offerings") return rows.filter((row) => categoryLabel(row).includes("offering"));
  if (kind === "donations") return rows.filter((row) => categoryLabel(row).includes("donation"));
  if (kind === "income") return rows.filter((row) => row.type === "income");
  if (kind === "expenses") return rows.filter((row) => row.type === "expense");
  return rows;
}

export function financeBookHref(kind: FinanceBookKind) {
  return kind === "all" ? "/app/finance" : `/app/finance/${kind}`;
}

export const ASSEMBLY_FINANCE_FILTERS = [
  { href: "/app/finance/tithes", label: "Tithes" },
  { href: "/app/finance/offerings", label: "Offerings" },
  { href: "/app/finance/donations", label: "Donations" },
  { href: "/app/finance/income", label: "Income" },
  { href: "/app/finance/expenses", label: "Expenses" },
  { href: "/app/finance", label: "All transactions" },
];
