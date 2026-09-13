import { saveTransactionAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formAction } from "@/lib/forms";

export type FinanceCategory = { id: string; name: string; type: string };
export type FinanceDepartment = { id: string; name: string };
export type FinanceRow = {
  id: string;
  transaction_code: string;
  occurred_on: string;
  type: string;
  amount: number | string;
  payment_method: string;
  department_id?: string | null;
  financial_categories?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  departments?: { name?: string } | { name?: string }[] | null;
};

export function categoryLabel(row: Pick<FinanceRow, "financial_categories">) {
  const category = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
  return `${category?.slug ?? ""} ${category?.name ?? ""}`.toLowerCase();
}

export function departmentLabel(row: Pick<FinanceRow, "departments">) {
  const department = Array.isArray(row.departments) ? row.departments[0] : row.departments;
  return department?.name ?? "Ministry";
}

export function FinanceBook({
  title,
  description,
  transactions,
  allTransactions,
  categories,
  departments,
  canWrite,
  writeHint,
  showDepartmentColumn,
  defaultDepartmentId,
  filterLinks,
}: {
  title: string;
  description: string;
  transactions: FinanceRow[];
  allTransactions: FinanceRow[];
  categories: FinanceCategory[];
  departments?: FinanceDepartment[];
  canWrite: boolean;
  writeHint: string;
  showDepartmentColumn?: boolean;
  defaultDepartmentId?: string | null;
  filterLinks?: { href: string; label: string }[];
}) {
  const income = allTransactions.filter((row) => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const expense = allTransactions.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const tithes = allTransactions.filter((row) => categoryLabel(row).includes("tithe")).reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      {filterLinks && filterLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {filterLinks.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full border px-3 py-1 hover:bg-muted">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Income" value={`GHS ${income.toLocaleString()}`} />
        <StatCard label="Expenses" value={`GHS ${expense.toLocaleString()}`} />
        <StatCard label="Tithes" value={`GHS ${tithes.toLocaleString()}`} />
        <StatCard label="Balance" value={`GHS ${(income - expense).toLocaleString()}`} />
      </div>
      {canWrite ? (
        <form action={formAction(saveTransactionAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          {defaultDepartmentId ? <input type="hidden" name="department_id" value={defaultDepartmentId} /> : null}
          {departments && departments.length > 1 && !defaultDepartmentId ? (
            <select name="department_id" required className="h-8 rounded-lg border bg-background px-2 text-sm md:col-span-2">
              <option value="">Ministry</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          ) : null}
          <Input name="occurred_on" type="date" required />
          <select name="type" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select name="category_id" required className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.type})
              </option>
            ))}
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
        <p className="text-sm text-muted-foreground">{writeHint}</p>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Date</th>
              {showDepartmentColumn ? <th className="px-3 py-2">Ministry</th> : null}
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => {
              const category = Array.isArray(row.financial_categories) ? row.financial_categories[0] : row.financial_categories;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.transaction_code}</td>
                  <td className="px-3 py-2">{row.occurred_on}</td>
                  {showDepartmentColumn ? <td className="px-3 py-2">{departmentLabel(row)}</td> : null}
                  <td className="px-3 py-2">
                    {category?.name} · {row.type}
                  </td>
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
