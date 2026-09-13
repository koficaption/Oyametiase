import type { SupabaseClient } from "@supabase/supabase-js";

export const MEMBER_GROUPS = [
  { key: "men", slug: "pmm", label: "Men's" },
  { key: "women", slug: "pwm", label: "Women's" },
  { key: "youth", slug: "pym", label: "Youth" },
  { key: "children", slug: "children", label: "Children" },
] as const;

export type MemberGroupKey = (typeof MEMBER_GROUPS)[number]["key"];

export function isMemberGroupKey(value: string | undefined): value is MemberGroupKey {
  return MEMBER_GROUPS.some((group) => group.key === value);
}

export function memberGroupByKey(key: MemberGroupKey) {
  return MEMBER_GROUPS.find((group) => group.key === key) ?? MEMBER_GROUPS[0];
}

export function defaultMemberGroup(portal: string): MemberGroupKey {
  if (portal === "womens") return "women";
  if (portal === "mens") return "men";
  if (portal === "youth") return "youth";
  if (portal === "children" || portal === "children_teacher") return "children";
  return "men";
}

export function canChooseMemberGroup(portal: string) {
  return portal === "presiding_elder" || portal === "secretary";
}

export async function memberIdsInMinistry(supabase: SupabaseClient, slug: string) {
  const { data: departments } = await supabase
    .from("departments")
    .select("id")
    .eq("slug", slug)
    .is("archived_at", null);
  const departmentIds = (departments ?? []).map((row) => row.id);
  if (!departmentIds.length) return [];

  const [{ data: links }, { data: primaries }] = await Promise.all([
    supabase.from("department_members").select("member_id").in("department_id", departmentIds),
    supabase.from("members").select("id").in("primary_department_id", departmentIds),
  ]);

  return [...new Set([
    ...(links ?? []).map((row) => row.member_id),
    ...(primaries ?? []).map((row) => row.id),
  ])];
}
