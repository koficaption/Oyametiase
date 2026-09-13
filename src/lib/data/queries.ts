import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAssembly(supabase: SupabaseClient) {
  const { data } = await supabase.from("assemblies").select("*").limit(1).maybeSingle();
  return data;
}

export async function searchMembers(
  supabase: SupabaseClient,
  input: { q?: string; department?: string; gender?: string; status?: string; page?: number },
) {
  const page = input.page ?? 1;
  const pageSize = 20;
  let query = supabase
    .from("members")
    .select("*, departments!primary_department_id(name)", { count: "exact" })
    .is("archived_at", null)
    .order("last_name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (input.q) {
    query = query.or(
      `first_name.ilike.%${input.q}%,last_name.ilike.%${input.q}%,member_code.ilike.%${input.q}%`,
    );
  }
  if (input.department) query = query.eq("primary_department_id", input.department);
  if (input.gender) query = query.eq("gender", input.gender);
  if (input.status) query = query.eq("membership_status", input.status);

  return query;
}

export async function dashboardCounts(supabase: SupabaseClient, assemblyId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthIso = startOfMonth.toISOString().slice(0, 10);

  const [
    members,
    newMembers,
    visitors,
    pendingFollowups,
    welfareOpen,
    announcements,
    events,
    income,
    expense,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("assembly_id", assemblyId)
      .is("archived_at", null),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("assembly_id", assemblyId)
      .gte("date_joined", monthIso)
      .is("archived_at", null),
    supabase
      .from("visitors")
      .select("id", { count: "exact", head: true })
      .eq("assembly_id", assemblyId)
      .is("archived_at", null),
    supabase
      .from("member_followups")
      .select("id", { count: "exact", head: true })
      .eq("assembly_id", assemblyId)
      .in("status", ["open", "in_progress", "needs_attention"]),
    supabase
      .from("welfare_cases")
      .select("id", { count: "exact", head: true })
      .eq("assembly_id", assemblyId)
      .in("status", ["open", "in_review", "approved"]),
    supabase
      .from("announcements")
      .select("id, title, published_at")
      .eq("assembly_id", assemblyId)
      .is("archived_at", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id, title, starts_at, venue")
      .eq("assembly_id", assemblyId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("financial_transactions")
      .select("amount")
      .eq("assembly_id", assemblyId)
      .eq("type", "income")
      .is("archived_at", null),
    supabase
      .from("financial_transactions")
      .select("amount")
      .eq("assembly_id", assemblyId)
      .eq("type", "expense")
      .is("archived_at", null),
  ]);

  const sum = (rows: { amount: number | string }[] | null) =>
    (rows ?? []).reduce((total, row) => total + Number(row.amount), 0);

  return {
    totalMembers: members.count ?? 0,
    newMembers: newMembers.count ?? 0,
    visitors: visitors.count ?? 0,
    pendingFollowups: pendingFollowups.count ?? 0,
    welfareOpen: welfareOpen.count ?? 0,
    announcements: announcements.data ?? [],
    events: events.data ?? [],
    income: sum(income.data),
    expense: sum(expense.data),
  };
}
