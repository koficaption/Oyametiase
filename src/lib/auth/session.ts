import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CurrentUser, Member, Profile } from "@/types/database";
import type { Permission, RoleSlug } from "@/types/roles";
import { hasPermission } from "@/types/roles";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  let member: Member | null = null;
  if (profile.member_id) {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", profile.member_id)
      .maybeSingle();
    member = (data as Member | null) ?? null;
  }

  const ledDepartmentIds: string[] = [];
  if (member) {
    const { data: led } = await supabase
      .from("departments")
      .select("id")
      .or(`leader_id.eq.${member.id},assistant_leader_id.eq.${member.id}`)
      .is("archived_at", null);
    led?.forEach((row) => ledDepartmentIds.push(row.id));
  }

  return {
    id: userId,
    email: profile.email,
    profile: profile as Profile,
    member,
    ledDepartmentIds,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.profile.role_slug, permission)) {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireRole(roles: RoleSlug[]) {
  const user = await requireUser();
  if (!roles.includes(user.profile.role_slug)) {
    redirect("/unauthorized");
  }
  return user;
}

export function can(user: CurrentUser | null, permission: Permission) {
  return hasPermission(user?.profile.role_slug, permission);
}
