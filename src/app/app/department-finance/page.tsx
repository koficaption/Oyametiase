import { categoryLabel, FinanceBook } from "@/components/finance/finance-book";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ministry finance" };

export default async function DepartmentFinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("finance.department");
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : "all";
  const selectedDept = typeof params.department === "string" ? params.department : "";
  const isElder = user.profile.role_slug === "presiding_elder";
  const ledIds = user.ledDepartmentIds;
  const supabase = await createClient();

  const [{ data: allTransactions }, { data: categories }, { data: departments }] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("*, financial_categories(name, slug), departments(name)")
      .not("department_id", "is", null)
      .is("archived_at", null)
      .order("occurred_on", { ascending: false })
      .limit(120),
    supabase.from("financial_categories").select("id, name, type"),
    isElder
      ? supabase.from("departments").select("id, name").is("archived_at", null).eq("is_active", true).order("name")
      : Promise.resolve({ data: user.ledDepartments.map((dept) => ({ id: dept.id, name: dept.name })) }),
  ]);

  const scoped = (allTransactions ?? []).filter((row) => {
    if (isElder) return !selectedDept || row.department_id === selectedDept;
    return row.department_id && ledIds.includes(row.department_id);
  });
  const transactions = scoped.filter((row) => {
    if (kind === "tithes") return categoryLabel(row).includes("tithe");
    if (kind === "offerings") return categoryLabel(row).includes("offering");
    if (kind === "donations") return categoryLabel(row).includes("donation");
    if (kind === "income") return row.type === "income";
    if (kind === "expenses") return row.type === "expense";
    return true;
  });

  const ministryName = user.ledDepartments[0]?.name ?? "Ministry";
  const canWrite = user.profile.role_slug === "department_leader" && ledIds.length > 0;
  const defaultDepartmentId = !isElder && ledIds.length === 1 ? ledIds[0] : null;
  const filterLinks = isElder
    ? [
        { href: "/app/department-finance", label: "All ministries" },
        ...(departments ?? []).map((department) => ({
          href: `/app/department-finance?department=${department.id}`,
          label: department.name,
        })),
      ]
    : [
        { href: "/app/department-finance", label: "All" },
        { href: "/app/department-finance?kind=income", label: "Income" },
        { href: "/app/department-finance?kind=expenses", label: "Expenses" },
      ];

  return (
    <FinanceBook
      title={isElder ? "Department finance" : `${ministryName} finance`}
      description={
        isElder
          ? "Each ministry keeps its own books, apart from assembly tithes and offerings. You may review every ministry. Leaders record their own money."
          : `${ministryName} money stays in this ministry. Assembly tithes and other departments are not on this page.`
      }
      transactions={transactions}
      allTransactions={scoped}
      categories={categories ?? []}
      departments={canWrite && ledIds.length > 1 ? user.ledDepartments.map((dept) => ({ id: dept.id, name: dept.name })) : undefined}
      canWrite={canWrite}
      writeHint={
        isElder
          ? "The Presiding Elder reviews ministry books. Only that ministry's leader records transactions."
          : "You can review this ministry's books."
      }
      showDepartmentColumn={isElder}
      defaultDepartmentId={defaultDepartmentId}
      filterLinks={filterLinks}
    />
  );
}
