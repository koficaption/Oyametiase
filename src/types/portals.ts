import type { RoleSlug } from "@/types/roles";

export const MINISTRY_PORTALS = ["womens", "mens", "youth", "children"] as const;
export type MinistryPortal = (typeof MINISTRY_PORTALS)[number];

export const PORTAL_KINDS = [
  "presiding_elder",
  "secretary",
  "treasurer",
  "womens",
  "mens",
  "youth",
  "children",
  "children_teacher",
  "ministry_finance",
  "department",
  "worker",
  "member",
] as const;

export type PortalKind = (typeof PORTAL_KINDS)[number];

export type PortalChrome = {
  desk: string;
  hint: string;
  sidebar: string;
  sidebarAccent: string;
  header: string;
};

export const PORTAL_CHROME: Record<PortalKind, PortalChrome> = {
  presiding_elder: {
    desk: "Assembly oversight desk",
    hint: "Whole-church picture. You oversee; officers do the daily work.",
    sidebar: "#0a2266",
    sidebarAccent: "#12308a",
    header: "#0a2266",
  },
  secretary: {
    desk: "Records and administration desk",
    hint: "Membership, visitors, attendance, and programmes. Not treasury.",
    sidebar: "#1b3a4d",
    sidebarAccent: "#245066",
    header: "#1b3a4d",
  },
  treasurer: {
    desk: "Assembly treasury desk",
    hint: "Tithes, offerings, expenses, and receipts only.",
    sidebar: "#0b3d2e",
    sidebarAccent: "#14543f",
    header: "#0b3d2e",
  },
  womens: {
    desk: "Women's Ministry desk",
    hint: "Women assigned to this ministry only.",
    sidebar: "#5b1d4a",
    sidebarAccent: "#73245d",
    header: "#5b1d4a",
  },
  mens: {
    desk: "Men's Ministry desk",
    hint: "Men assigned to this ministry only.",
    sidebar: "#0f3d4c",
    sidebarAccent: "#16586c",
    header: "#0f3d4c",
  },
  youth: {
    desk: "Youth Ministry desk",
    hint: "Youth records, evangelism, and youth programmes only.",
    sidebar: "#6b2d00",
    sidebarAccent: "#8a3c08",
    header: "#6b2d00",
  },
  children: {
    desk: "Children's Ministry desk",
    hint: "Children and guardian records stay inside this ministry.",
    sidebar: "#14532d",
    sidebarAccent: "#166534",
    header: "#14532d",
  },
  children_teacher: {
    desk: "Children's class desk",
    hint: "Class records needed for teaching only.",
    sidebar: "#14532d",
    sidebarAccent: "#166534",
    header: "#14532d",
  },
  ministry_finance: {
    desk: "Ministry money desk",
    hint: "This ministry's books. Not the assembly treasury.",
    sidebar: "#3f2a14",
    sidebarAccent: "#5a3b1c",
    header: "#3f2a14",
  },
  department: {
    desk: "Department desk",
    hint: "Your assigned department only.",
    sidebar: "#1e293b",
    sidebarAccent: "#334155",
    header: "#1e293b",
  },
  worker: {
    desk: "Assigned worker desk",
    hint: "Only the work given to this office.",
    sidebar: "#334155",
    sidebarAccent: "#475569",
    header: "#334155",
  },
  member: {
    desk: "No officer desk",
    hint: "This CMS is for officers only.",
    sidebar: "#0a2266",
    sidebarAccent: "#12308a",
    header: "#0a2266",
  },
};

export const PORTAL_LABELS: Record<PortalKind, string> = {
  presiding_elder: "Presiding Elder",
  secretary: "Assembly Secretary",
  treasurer: "Treasurer",
  womens: "Women's Ministry Leader",
  mens: "Men's Ministry Leader",
  youth: "Youth Ministry Leader",
  children: "Children's Ministry Leader",
  children_teacher: "Children's Ministry Teacher",
  ministry_finance: "Ministry financial secretary",
  department: "Department Leader",
  worker: "Worker / Officer",
  member: "Member",
};

export const SLUG_TO_MINISTRY: Record<string, MinistryPortal> = {
  pwm: "womens",
  pmm: "mens",
  pym: "youth",
  children: "children",
};

export type LedDepartment = {
  id: string;
  name: string;
  slug: string;
  ministry_kind: string | null;
  logo_url: string | null;
};

export type WorkerAssignment = {
  positionSlug: string | null;
  departmentId: string | null;
};

export function ministryFromDepartment(dept?: Pick<LedDepartment, "slug" | "ministry_kind"> | null): MinistryPortal | null {
  if (!dept) return null;
  return SLUG_TO_MINISTRY[dept.ministry_kind ?? ""] ?? SLUG_TO_MINISTRY[dept.slug] ?? null;
}

/** Office role wins. A Presiding Elder who also leads PMM still sees the PE portal. */
export function resolvePortal(
  role: RoleSlug,
  ledDepartments: LedDepartment[] = [],
): PortalKind {
  if (role === "presiding_elder") return "presiding_elder";
  if (role === "secretary") return "secretary";
  if (role === "treasurer") return "treasurer";
  if (role === "member") return "member";
  if (role === "worker") return "worker";
  if (role === "ministry_finance") return "ministry_finance";
  if (role === "children_teacher") return "children_teacher";
  if (role === "department_leader") {
    const ministry = ledDepartments.map((dept) => ministryFromDepartment(dept)).find(Boolean);
    return ministry ?? "department";
  }
  return "member";
}
