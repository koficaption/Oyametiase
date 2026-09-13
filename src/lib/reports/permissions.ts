import type { ReportType } from "@/lib/reports/types";
import type { CurrentUser } from "@/types/database";
import { hasPermission, type Permission, type RoleSlug } from "@/types/roles";

const TYPE_PERMISSION: Record<ReportType, Permission> = {
  membership: "reports.admin",
  attendance: "reports.admin",
  visitors: "reports.admin",
  annual: "reports.admin",
  finance: "reports.finance",
  welfare: "reports.welfare",
  department: "reports.department",
};

export function canGenerateReport(role: RoleSlug | null | undefined, type: ReportType) {
  if (!role) return false;
  if (type === "department") {
    return hasPermission(role, "reports.department") || hasPermission(role, "reports.admin");
  }
  return hasPermission(role, TYPE_PERMISSION[type]);
}

export function allowedReportTypes(role: RoleSlug | null | undefined): ReportType[] {
  return (Object.keys(TYPE_PERMISSION) as ReportType[]).filter((type) => canGenerateReport(role, type));
}

export function canViewReportSection(role: RoleSlug | null | undefined, section: ReportType) {
  return canGenerateReport(role, section);
}

export function scopedReportDepartmentId(user: CurrentUser, requested?: string) {
  const role = user.profile.role_slug;
  if (role === "department_leader" || role === "ministry_finance") {
    if (requested && user.ledDepartmentIds.includes(requested)) return requested;
    return user.ledDepartmentIds[0] ?? null;
  }
  return requested || null;
}
