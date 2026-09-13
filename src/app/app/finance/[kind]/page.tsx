import { notFound } from "next/navigation";
import { FINANCE_BOOK_META, isFinanceBookSlug } from "@/lib/finance-books";
import { AssemblyFinanceBook } from "../assembly-finance-book";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  return { title: isFinanceBookSlug(kind) ? FINANCE_BOOK_META[kind].title : "Finance" };
}

export default async function FinanceKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isFinanceBookSlug(kind)) notFound();
  return <AssemblyFinanceBook kind={kind} />;
}
