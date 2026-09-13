import { saveTransactionAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const user = await requirePermission("finance.view");
  const supabase = await createClient();
  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase.from("financial_transactions").select("*, financial_categories(name)").is("archived_at", null).order("occurred_on", { ascending: false }).limit(50),
    supabase.from("financial_categories").select("id, name, type"),
  ]);
  const income = transactions?.filter((row) => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const expense = transactions?.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const tithes = transactions?.filter((row) => {
    const category = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
    return category?.name === "Tithes";
  }).reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const canWrite = hasPermission(user.profile.role_slug, "finance.manage");

  return (
    <div className="space-y-6">
      <PageHeader title="Assembly finance" description="Tithes, offerings, donations, and expenses. Restricted to finance officers and the Presiding Elder." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Income" value={`GHS ${income.toLocaleString()}`} />
        <StatCard label="Expenses" value={`GHS ${expense.toLocaleString()}`} />
        <StatCard label="Tithes" value={`GHS ${tithes.toLocaleString()}`} />
        <StatCard label="Balance" value={`GHS ${(income - expense).toLocaleString()}`} />
      </div>
      {canWrite ? (
        <form action={formAction(saveTransactionAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <Input name="occurred_on" type="date" required />
          <select name="type" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select name="category_id" required className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">Category</option>
            {categories?.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.type})</option>)}
          </select>
          <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" required />
          <select name="payment_method" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
          <Input name="reference" placeholder="Reference" />
          <Input name="description" placeholder="Description" className="md:col-span-2" />
          <Button type="submit">Record transaction</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">You can review reports. Only the Treasurer records transactions.</p>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((row) => {
              const category = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.transaction_code}</td>
                  <td className="px-3 py-2">{row.occurred_on}</td>
                  <td className="px-3 py-2">{category?.name} · {row.type}</td>
                  <td className="px-3 py-2">GHS {Number(row.amount).toLocaleString()}</td>
                  <td className="px-3 py-2 capitalize">{row.payment_method.replace("_", " ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
