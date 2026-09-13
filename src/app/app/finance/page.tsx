import { redirect } from "next/navigation";
import { isFinanceBookSlug } from "@/lib/finance-books";
import { AssemblyFinanceBook } from "./assembly-finance-book";

export const metadata = { title: "Assembly finance" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : "";
  if (isFinanceBookSlug(kind)) {
    redirect(`/app/finance/${kind}`);
  }
  return <AssemblyFinanceBook kind="all" />;
}
