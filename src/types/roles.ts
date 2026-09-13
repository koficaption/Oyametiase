export const ROLES = [
  "presiding_elder",
  "secretary",
  "treasurer",
  "department_leader",
  "worker",
  "member",
] as const;

export type RoleSlug = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleSlug, string> = {
  presiding_elder: "Presiding Elder",
  secretary: "Assembly Secretary",
  treasurer: "Treasurer / Finance Officer",
  department_leader: "Department Leader",
  worker: "Worker / Officer",
  member: "Member",
};

export const PERMISSIONS = [
  "dashboard.view",
  "dashboard.finance",
  "members.view",
  "members.manage",
  "members.sensitive",
  "attendance.view",
  "attendance.manage",
  "visitors.view",
  "visitors.manage",
  "followups.view",
  "followups.manage",
  "departments.view",
  "departments.manage",
  "workers.view",
  "workers.manage",
  "events.view",
  "events.manage",
  "announcements.view",
  "announcements.manage",
  "prayer.submit",
  "prayer.moderate",
  "welfare.view",
  "welfare.manage",
  "finance.view",
  "finance.manage",
  "documents.view",
  "documents.manage",
  "reports.admin",
  "reports.finance",
  "reports.welfare",
  "reports.department",
  "children.view",
  "children.manage",
  "approvals.view",
  "approvals.manage",
  "users.manage",
  "audit.view",
  "settings.manage",
  "notifications.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<RoleSlug, Permission[]> = {
  presiding_elder: PERMISSIONS.filter((permission) => permission !== "finance.manage"),
  secretary: [
    "dashboard.view",
    "members.view",
    "members.manage",
    "members.sensitive",
    "attendance.view",
    "attendance.manage",
    "visitors.view",
    "visitors.manage",
    "followups.view",
    "followups.manage",
    "departments.view",
    "departments.manage",
    "workers.view",
    "workers.manage",
    "events.view",
    "events.manage",
    "announcements.view",
    "announcements.manage",
    "prayer.submit",
    "children.view",
    "children.manage",
    "documents.view",
    "documents.manage",
    "reports.admin",
    "notifications.view",
  ],
  treasurer: [
    "dashboard.view",
    "dashboard.finance",
    "finance.view",
    "finance.manage",
    "documents.view",
    "reports.finance",
    "notifications.view",
  ],
  department_leader: [
    "dashboard.view",
    "members.view",
    "attendance.view",
    "attendance.manage",
    "followups.view",
    "followups.manage",
    "departments.view",
    "events.view",
    "events.manage",
    "announcements.view",
    "announcements.manage",
    "prayer.submit",
    "children.view",
    "children.manage",
    "documents.view",
    "reports.department",
    "notifications.view",
  ],
  worker: [
    "dashboard.view",
    "attendance.view",
    "departments.view",
    "events.view",
    "announcements.view",
    "prayer.submit",
    "documents.view",
    "notifications.view",
  ],
  member: [
    "dashboard.view",
    "announcements.view",
    "events.view",
    "prayer.submit",
    "notifications.view",
  ],
};

export function hasPermission(role: RoleSlug | null | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyRole(role: RoleSlug | null | undefined, allowed: RoleSlug[]) {
  if (!role) return false;
  return allowed.includes(role);
}

export const LEADERSHIP_ROLES: RoleSlug[] = ["presiding_elder", "secretary"];
export const FINANCE_ROLES: RoleSlug[] = ["presiding_elder", "treasurer"];
