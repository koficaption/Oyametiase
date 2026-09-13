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
