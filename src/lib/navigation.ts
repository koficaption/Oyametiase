import type { PortalKind, WorkerAssignment } from "@/types/portals";
import type { Permission } from "@/types/roles";

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
  section: "overview" | "people" | "life" | "stewardship" | "admin";
};

export const SECTION_LABELS = {
  overview: "Overview",
  people: "People",
  life: "Church life",
  stewardship: "Stewardship",
  admin: "Administration",
};

const PE_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
  { href: "/app/members", label: "Members", permission: "members.view", section: "people" },
  { href: "/app/children", label: "Children", permission: "children.view", section: "people" },
  { href: "/app/visitors", label: "Visitors", permission: "visitors.view", section: "people" },
  { href: "/app/follow-ups", label: "Follow-ups", permission: "followups.view", section: "people" },
  { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
  { href: "/app/departments", label: "Departments", permission: "departments.view", section: "people" },
  { href: "/app/workers", label: "Officers & Workers", permission: "workers.view", section: "people" },
  { href: "/app/events", label: "Church Programs", permission: "events.view", section: "life" },
  { href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" },
  { href: "/app/prayer-requests", label: "Prayer Requests", permission: "prayer.submit", section: "life" },
  { href: "/app/welfare", label: "Welfare", permission: "welfare.view", section: "stewardship" },
  { href: "/app/finance", label: "Finance Overview", permission: "finance.view", section: "stewardship" },
  { href: "/app/department-finance", label: "Department finance", permission: "finance.department", section: "stewardship" },
  { href: "/app/reports", label: "Reports", permission: "reports.admin", section: "admin" },
  { href: "/app/approvals", label: "Approvals", permission: "approvals.view", section: "admin" },
  { href: "/app/audit-logs", label: "Audit Logs", permission: "audit.view", section: "admin" },
  { href: "/app/settings", label: "Settings", permission: "settings.manage", section: "admin" },
  { href: "/app/users", label: "Users & approvals", permission: "users.manage", section: "admin" },
  { href: "/app/portal", label: "My Profile", section: "overview" },
];

const SECRETARY_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
  { href: "/app/members", label: "Members", permission: "members.view", section: "people" },
  { href: "/app/visitors", label: "Visitors", permission: "visitors.view", section: "people" },
  { href: "/app/new-converts", label: "New Converts", permission: "followups.view", section: "people" },
  { href: "/app/follow-ups", label: "Follow-ups", permission: "followups.view", section: "people" },
  { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
  { href: "/app/departments", label: "Departments", permission: "departments.view", section: "people" },
  { href: "/app/workers", label: "Officers & Workers", permission: "workers.view", section: "people" },
  { href: "/app/events", label: "Church Programs", permission: "events.view", section: "life" },
  { href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" },
  { href: "/app/reports", label: "Reports", permission: "reports.admin", section: "admin" },
  { href: "/app/portal", label: "My Profile", section: "overview" },
];

const TREASURER_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
  { href: "/app/finance?kind=tithes", label: "Tithes", permission: "finance.view", section: "stewardship" },
  { href: "/app/finance?kind=offerings", label: "Offerings", permission: "finance.view", section: "stewardship" },
  { href: "/app/finance?kind=donations", label: "Donations", permission: "finance.view", section: "stewardship" },
  { href: "/app/finance?kind=income", label: "Income", permission: "finance.view", section: "stewardship" },
  { href: "/app/finance?kind=expenses", label: "Expenses", permission: "finance.view", section: "stewardship" },
  { href: "/app/finance", label: "Transactions", permission: "finance.view", section: "stewardship" },
  { href: "/app/documents", label: "Receipts / Documents", permission: "documents.view", section: "stewardship" },
  { href: "/app/reports", label: "Financial Reports", permission: "reports.finance", section: "admin" },
  { href: "/app/portal", label: "My Profile", section: "overview" },
];

function ministryNav(labels: {
  members: string;
  extra?: NavItem[];
}): NavItem[] {
  return [
    { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
    { href: "/app/members", label: labels.members, permission: "members.view", section: "people" },
    { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
    { href: "/app/events", label: "Programs", permission: "events.view", section: "life" },
    { href: "/app/departments", label: "Activities", permission: "departments.view", section: "life" },
    { href: "/app/follow-ups", label: "Follow-ups", permission: "followups.view", section: "people" },
    { href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" },
    { href: "/app/department-finance", label: "Ministry finance", permission: "finance.department", section: "stewardship" },
    { href: "/app/reports", label: "Reports", permission: "reports.department", section: "admin" },
    { href: "/app/portal", label: "My Profile", section: "overview" },
    ...(labels.extra ?? []),
  ];
}

const MEMBER_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Home", section: "overview" },
  { href: "/app/portal", label: "My Profile", section: "overview" },
  { href: "/app/portal#attendance", label: "My Attendance", section: "life" },
  { href: "/app/portal#department", label: "My Department", section: "life" },
  { href: "/app/events", label: "Church Programs", permission: "events.view", section: "life" },
  { href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" },
  { href: "/app/prayer-requests", label: "Prayer Requests", permission: "prayer.submit", section: "life" },
  { href: "/app/portal#settings", label: "Settings", section: "overview" },
];

const WORKER_BASE: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
];

export function navForPortal(kind: PortalKind, assignments: WorkerAssignment[] = []): NavItem[] {
  if (kind === "presiding_elder") return PE_NAV;
  if (kind === "secretary") return SECRETARY_NAV;
  if (kind === "treasurer") return TREASURER_NAV;
  if (kind === "womens") return ministryNav({ members: "Women Members" });
  if (kind === "mens") return ministryNav({ members: "Men Members" });
  if (kind === "youth") {
    return ministryNav({
      members: "Youth Members",
      extra: [{ href: "/app/departments", label: "Evangelism", permission: "departments.view", section: "life" }],
    });
  }
  if (kind === "children") {
    return [
      { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
      { href: "/app/children", label: "Children", permission: "children.view", section: "people" },
      { href: "/app/children#guardians", label: "Parents / Guardians", permission: "children.view", section: "people" },
      { href: "/app/children#classes", label: "Classes", permission: "children.view", section: "people" },
      { href: "/app/departments", label: "Workers", permission: "departments.view", section: "people" },
      { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
      { href: "/app/events", label: "Programs", permission: "events.view", section: "life" },
      { href: "/app/follow-ups", label: "Follow-ups", permission: "followups.view", section: "people" },
      { href: "/app/department-finance", label: "Ministry finance", permission: "finance.department", section: "stewardship" },
      { href: "/app/reports", label: "Reports", permission: "reports.department", section: "admin" },
      { href: "/app/portal", label: "My Profile", section: "overview" },
    ];
  }
  if (kind === "children_teacher") {
    return [
      { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
      { href: "/app/children", label: "Children", permission: "children.view", section: "people" },
      { href: "/app/children#classes", label: "Classes", permission: "children.view", section: "people" },
      { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
      { href: "/app/events", label: "Programs", permission: "events.view", section: "life" },
      { href: "/app/portal", label: "My Profile", section: "overview" },
    ];
  }
  if (kind === "ministry_finance") {
    return [
      { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
      { href: "/app/department-finance", label: "Ministry finance", permission: "finance.department", section: "stewardship" },
      { href: "/app/reports", label: "Ministry reports", permission: "reports.department", section: "admin" },
      { href: "/app/portal", label: "My Profile", section: "overview" },
    ];
  }
  if (kind === "department") {
    return ministryNav({ members: "Department Members" });
  }
  if (kind === "member") return MEMBER_NAV;

  const slugs = assignments.map((item) => item.positionSlug ?? "");
  const items = [...WORKER_BASE];
  const allowAttendance = slugs.some((slug) => ["usher", "ushering", "protocol"].includes(slug)) || slugs.length === 0;
  const allowMedia = slugs.some((slug) => ["media", "communications"].includes(slug));
  const allowChoir = slugs.some((slug) => ["choir", "music"].includes(slug));
  if (allowAttendance) {
    items.push({ href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" });
    items.push({ href: "/app/events", label: "Service information", permission: "events.view", section: "life" });
  }
  if (allowMedia) {
    items.push({ href: "/app/events", label: "Events", permission: "events.view", section: "life" });
    items.push({ href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" });
    items.push({ href: "/app/documents", label: "Media / documents", permission: "documents.view", section: "stewardship" });
  }
  if (allowChoir) {
    items.push({ href: "/app/departments", label: "Choir", permission: "departments.view", section: "people" });
    items.push({ href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" });
  }
  if (items.length === 1) {
    items.push({ href: "/app/events", label: "Programs", permission: "events.view", section: "life" });
    items.push({ href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" });
  }
  return items;
}

/** @deprecated use navForPortal — kept so older imports fail loudly if missed */
export const NAV_ITEMS: NavItem[] = PE_NAV;
