import type { Permission } from "@/types/roles";

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
  section: "overview" | "people" | "life" | "stewardship" | "admin";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", permission: "dashboard.view", section: "overview" },
  { href: "/app/portal", label: "My portal", section: "overview" },
  { href: "/app/members", label: "Members", permission: "members.view", section: "people" },
  { href: "/app/visitors", label: "Visitors", permission: "visitors.view", section: "people" },
  { href: "/app/follow-ups", label: "Follow-ups", permission: "followups.view", section: "people" },
  { href: "/app/workers", label: "Workers", permission: "workers.view", section: "people" },
  { href: "/app/departments", label: "Departments", permission: "departments.view", section: "people" },
  { href: "/app/attendance", label: "Attendance", permission: "attendance.view", section: "life" },
  { href: "/app/events", label: "Programs", permission: "events.view", section: "life" },
  { href: "/app/announcements", label: "Announcements", permission: "announcements.view", section: "life" },
  { href: "/app/prayer-requests", label: "Prayer requests", permission: "prayer.submit", section: "life" },
  { href: "/app/finance", label: "Finance", permission: "finance.view", section: "stewardship" },
  { href: "/app/welfare", label: "Welfare", permission: "welfare.view", section: "stewardship" },
  { href: "/app/documents", label: "Documents", permission: "documents.view", section: "stewardship" },
  { href: "/app/reports", label: "Reports", permission: "reports.admin", section: "admin" },
  { href: "/app/users", label: "Users", permission: "users.manage", section: "admin" },
  { href: "/app/audit-logs", label: "Audit log", permission: "audit.view", section: "admin" },
  { href: "/app/settings", label: "Settings", permission: "settings.manage", section: "admin" },
];

export const SECTION_LABELS = {
  overview: "Overview",
  people: "People",
  life: "Church life",
  stewardship: "Stewardship",
  admin: "Administration",
};
