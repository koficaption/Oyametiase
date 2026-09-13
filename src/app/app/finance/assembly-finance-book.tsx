import { FinanceBook } from "@/components/finance/finance-book";
import { requirePermission } from "@/lib/auth/session";
import { ASSEMBLY_FINANCE_FILTERS, FINANCE_BOOK_META, filterFinanceRows, financeBookHref, type FinanceBookKind } from "@/lib/finance-books";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/types/roles";

export async function AssemblyFinanceBook({ kind }: { kind: FinanceBookKind }) {
  const user = await requirePermission("finance.view");
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
  const meta = FINANCE_BOOK_META[kind];

  return (
    <FinanceBook
      title={meta.title}
      description={meta.description}
      transactions={filterFinanceRows(rows, kind)}
      allTransactions={rows}
      categories={categories ?? []}
      canWrite={hasPermission(user.profile.role_slug, "finance.manage")}
      writeHint="You can review assembly reports. Only the Treasurer records main-church transactions."
      filterLinks={ASSEMBLY_FINANCE_FILTERS}
      activeHref={financeBookHref(kind)}
    />
  );
}
