import type { RoleSlug } from "@/types/roles";

/** Official standing in the assembly — not a system permission. */
export const CHURCH_POSITIONS = [
  "Presiding Elder",
  "Elder",
  "Deacon",
  "Deaconess",
  "Pastor",
  "Probationary Overseer/Minister",
  "Church Worker",
  "Member",
  "Other",
] as const;

export type ChurchPosition = (typeof CHURCH_POSITIONS)[number];

/** Current assignment — not a system permission. */
export const CHURCH_RESPONSIBILITIES = [
  "No specific role",
  "Church Secretary",
  "Assistant Church Secretary",
  "Church Treasurer",
  "Assistant Treasurer",
  "Women's Ministry Leader",
  "Women's Ministry Financial Secretary",
  "Women's Ministry Secretary",
  "Women's Ministry Assistant Leader",
  "Men's Ministry Leader",
  "Men's Ministry Financial Secretary",
  "Men's Ministry Secretary",
  "Men's Ministry Assistant Leader",
  "Youth Ministry Leader",
  "Youth Ministry Financial Secretary",
  "Youth Ministry Secretary",
  "Youth Ministry Assistant Leader",
  "Children's Ministry Leader",
  "Children's Ministry Secretary",
  "Children's Ministry Financial Secretary",
  "Children's Ministry Teacher",
  "Sunday School Teacher",
  "Evangelism Leader",
  "Prayer Leader",
  "Welfare Leader",
  "Music/Choir Leader",
  "Organist/Musician",
  "Media/Technical Leader",
  "Ushering Leader",
  "Protocol Leader",
  "Cell/Area Leader",
  "Other",
] as const;

export type ChurchResponsibility = (typeof CHURCH_RESPONSIBILITIES)[number];

export const ACCOUNT_STATUSES = ["pending", "active", "rejected", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const SYSTEM_ROLE_OPTIONS: { slug: RoleSlug; label: string }[] = [
  { slug: "member", label: "Member" },
  { slug: "worker", label: "Worker / other leader" },
  { slug: "children_teacher", label: "Children's Ministry Teacher" },
  { slug: "ministry_finance", label: "Ministry financial secretary" },
  { slug: "department_leader", label: "Ministry / department leader" },
  { slug: "treasurer", label: "Church Treasurer" },
  { slug: "secretary", label: "Church Secretary" },
  { slug: "presiding_elder", label: "Presiding Elder" },
];

const RESPONSIBILITY_TO_SYSTEM_ROLE: Record<string, RoleSlug> = {
  "Church Secretary": "secretary",
  "Assistant Church Secretary": "secretary",
  "Church Treasurer": "treasurer",
  "Assistant Treasurer": "treasurer",
  "Women's Ministry Leader": "department_leader",
  "Women's Ministry Assistant Leader": "department_leader",
  "Women's Ministry Secretary": "department_leader",
  "Women's Ministry Financial Secretary": "ministry_finance",
  "Men's Ministry Leader": "department_leader",
  "Men's Ministry Assistant Leader": "department_leader",
  "Men's Ministry Secretary": "department_leader",
  "Men's Ministry Financial Secretary": "ministry_finance",
  "Youth Ministry Leader": "department_leader",
  "Youth Ministry Assistant Leader": "department_leader",
  "Youth Ministry Secretary": "department_leader",
  "Youth Ministry Financial Secretary": "ministry_finance",
  "Children's Ministry Leader": "department_leader",
  "Children's Ministry Secretary": "department_leader",
  "Children's Ministry Financial Secretary": "ministry_finance",
  "Children's Ministry Teacher": "children_teacher",
  "Sunday School Teacher": "children_teacher",
  "Evangelism Leader": "worker",
  "Prayer Leader": "worker",
  "Welfare Leader": "worker",
  "Music/Choir Leader": "worker",
  "Organist/Musician": "worker",
  "Media/Technical Leader": "worker",
  "Ushering Leader": "worker",
  "Protocol Leader": "worker",
  "Cell/Area Leader": "worker",
};

const RESPONSIBILITY_TO_DEPT_SLUG: Record<string, string> = {
  "Women's Ministry Leader": "pwm",
  "Women's Ministry Assistant Leader": "pwm",
  "Women's Ministry Secretary": "pwm",
  "Women's Ministry Financial Secretary": "pwm",
  "Men's Ministry Leader": "pmm",
  "Men's Ministry Assistant Leader": "pmm",
  "Men's Ministry Secretary": "pmm",
  "Men's Ministry Financial Secretary": "pmm",
  "Youth Ministry Leader": "pym",
  "Youth Ministry Assistant Leader": "pym",
  "Youth Ministry Secretary": "pym",
  "Youth Ministry Financial Secretary": "pym",
  "Children's Ministry Leader": "children",
  "Children's Ministry Secretary": "children",
  "Children's Ministry Financial Secretary": "children",
  "Children's Ministry Teacher": "children",
  "Sunday School Teacher": "children",
  "Evangelism Leader": "evangelism",
  "Prayer Leader": "prayer",
  "Welfare Leader": "welfare",
  "Music/Choir Leader": "choir",
  "Organist/Musician": "choir",
  "Media/Technical Leader": "media",
  "Ushering Leader": "ushering",
  "Protocol Leader": "protocol",
};

/** Suggested system role for the approval desk only. Never applied at registration. */
export function suggestedSystemRole(_position: string, responsibility: string): RoleSlug {
  return RESPONSIBILITY_TO_SYSTEM_ROLE[responsibility] ?? "member";
}

export function suggestedDepartmentSlug(responsibility: string): string | null {
  return RESPONSIBILITY_TO_DEPT_SLUG[responsibility] ?? null;
}

export function isApprovedAccount(status?: string | null, approval?: string | null) {
  if (status === "rejected" || status === "suspended") return false;
  if (approval === "rejected") return false;
  return true;
}

export function inferGender(position: string, responsibility: string): "male" | "female" {
  const text = `${position} ${responsibility}`.toLowerCase();
  if (text.includes("deaconess") || text.includes("women")) return "female";
  return "male";
}

export function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Member", last_name: "Unknown" };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}
