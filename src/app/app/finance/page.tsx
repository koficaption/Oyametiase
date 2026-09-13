import { categoryLabel, FinanceBook } from "@/components/finance/finance-book";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Assembly finance" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("finance.view");
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : "all";
  const supabase = await createClient();
  const [{ data: allTransactions }, { data: categories }] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("*, financial_categories(name, slug)")
      .is("department_id", null)
      .is("archived_at", null)
      .order("occurred_on", { ascending: false })
      .limit(80),
    supabase.from("financial_categories").select("id, name, type"),
  ]);
  const rows = allTransactions ?? [];
  const transactions = rows.filter((row) => {
    if (kind === "tithes") return categoryLabel(row).includes("tithe");
    if (kind === "offerings") return categoryLabel(row).includes("offering");
    if (kind === "donations") return categoryLabel(row).includes("donation");
    if (kind === "income") return row.type === "income";
    if (kind === "expenses") return row.type === "expense";
    return true;
  });

  return (
    <FinanceBook
      title="Assembly finance"
      description="Main church tithes, offerings, donations, and expenses. Ministry money is kept on separate books."
      transactions={transactions}
      allTransactions={rows}
      categories={categories ?? []}
      canWrite={hasPermission(user.profile.role_slug, "finance.manage")}
      writeHint="You can review assembly reports. Only the Treasurer records main-church transactions."
    />
  );
}
