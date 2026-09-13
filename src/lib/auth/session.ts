import { redirect } from "next/navigation";
import { isApprovedAccount } from "@/lib/church-directory";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CurrentUser, Member, Profile } from "@/types/database";
import type { LedDepartment, PortalKind, WorkerAssignment } from "@/types/portals";
import { resolvePortal } from "@/types/portals";
import type { Permission, RoleSlug } from "@/types/roles";
import { hasPermission, isOfficerRole } from "@/types/roles";

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

  if (!profile) return null;
  if (profile.account_status === "rejected" || profile.account_status === "suspended") return null;
  if (!profile.is_active && profile.account_status !== "pending") return null;

  let member: Member | null = null;
  if (profile.member_id) {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", profile.member_id)
      .maybeSingle();
    member = (data as Member | null) ?? null;
  }

  const ledDepartments: LedDepartment[] = [];
  const workerAssignments: WorkerAssignment[] = [];
  if (member) {
    const { data: led } = await supabase
      .from("departments")
      .select("id, name, slug, ministry_kind, logo_url")
      .or(`leader_id.eq.${member.id},assistant_leader_id.eq.${member.id}`)
      .is("archived_at", null);
    led?.forEach((row) =>
      ledDepartments.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        ministry_kind: row.ministry_kind ?? row.slug,
        logo_url: row.logo_url ?? null,
      }),
    );

    const { data: workers } = await supabase
      .from("workers")
      .select("department_id, positions(slug)")
      .eq("member_id", member.id)
      .eq("status", "active");
    workers?.forEach((row) => {
      const position = Array.isArray(row.positions) ? row.positions[0] : row.positions;
      workerAssignments.push({
        positionSlug: position?.slug ?? null,
        departmentId: row.department_id,
      });
    });
  }

  if (profile.assigned_department_id && !ledDepartments.some((dept) => dept.id === profile.assigned_department_id)) {
    const { data: assigned } = await supabase
      .from("departments")
      .select("id, name, slug, ministry_kind, logo_url")
      .eq("id", profile.assigned_department_id)
      .is("archived_at", null)
      .maybeSingle();
    if (assigned) {
      ledDepartments.push({
        id: assigned.id,
        name: assigned.name,
        slug: assigned.slug,
        ministry_kind: assigned.ministry_kind ?? assigned.slug,
        logo_url: assigned.logo_url ?? null,
      });
    }
  }

  return {
    id: userId,
    email: profile.email,
    profile: profile as Profile,
    member,
    ledDepartmentIds: ledDepartments.map((dept) => dept.id),
    ledDepartments,
    workerAssignments,
  };
}

export function userPortal(user: CurrentUser): PortalKind {
  return resolvePortal(user.profile.role_slug, user.ledDepartments);
}

export function canAccessChildren(user: CurrentUser) {
  const role = user.profile.role_slug;
  if (role === "presiding_elder" || role === "secretary" || role === "children_teacher") return true;
  if (role === "department_leader") {
    return user.ledDepartments.some((dept) => dept.slug === "children" || dept.ministry_kind === "children");
  }
  return false;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOfficerRole(user.profile.role_slug)) {
    redirect("/officer-access");
  }
  if (!isApprovedAccount(user.profile.account_status, user.profile.approval_status)) {
    redirect("/officer-access");
  }
  return user;
}

export async function requireChildrenAccess() {
  const user = await requireUser();
  if (!canAccessChildren(user)) redirect("/unauthorized");
  return user;
}

export async function requireSignupAccount() {
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

export function scopedDepartmentIds(user: CurrentUser): string[] | null {
  if (user.profile.role_slug === "presiding_elder" || user.profile.role_slug === "secretary") {
    return null;
  }
  if (
    user.profile.role_slug === "department_leader" ||
    user.profile.role_slug === "ministry_finance" ||
    user.profile.role_slug === "children_teacher"
  ) {
    return user.ledDepartmentIds;
  }
  return [];
}
