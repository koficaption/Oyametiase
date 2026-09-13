import type { LedDepartment, WorkerAssignment } from "@/types/portals";
import type { RoleSlug } from "@/types/roles";

export type Gender = "male" | "female";
export type MembershipStatus =
  | "active"
  | "inactive"
  | "visitor"
  | "new_convert"
  | "transferred"
  | "deceased"
  | "other";
export type BaptismStatus = "baptized" | "not_baptized" | "unknown";
export type MaritalStatus =
  | "single"
  | "married"
  | "widowed"
  | "divorced"
  | "separated"
  | "other";
export type AttendanceStatus = "present" | "absent" | "excused";
export type VisitorFollowUpStatus =
  | "new"
  | "contacted"
  | "follow_up_scheduled"
  | "interested"
  | "joined"
  | "not_reachable"
  | "closed";
export type PrayerPrivacy =
  | "private"
  | "presiding_elder"
  | "authorized_leaders"
  | "prayer_team";
export type PrayerStatus =
  | "pending"
  | "praying"
  | "follow_up_required"
  | "answered"
  | "closed";
export type FinancialType = "income" | "expense";
export type PaymentMethod = "cash" | "mobile_money" | "bank" | "other";

export type Assembly = {
  id: string;
  church_name: string;
  assembly_name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  location: string | null;
  service_times: { name: string; day: string; time: string }[];
};

export type Profile = {
  id: string;
  assembly_id: string;
  member_id: string | null;
  role_slug: RoleSlug;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
};

export type Member = {
  id: string;
  assembly_id: string;
  member_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: Gender;
  photo_url: string | null;
  date_joined: string | null;
  membership_status: MembershipStatus;
  baptism_status: BaptismStatus;
  baptism_date: string | null;
  primary_department_id: string | null;
  archived_at: string | null;
  created_at: string;
};

export type MemberConfidential = {
  member_id: string;
  phone: string | null;
  email: string | null;
  residential_address: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  marital_status: MaritalStatus | null;
  emergency_contact_name: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  notes: string | null;
  previous_assembly: string | null;
  transfer_notes: string | null;
};

export type MemberRecord = Member & Partial<MemberConfidential> & {
  department_name?: string | null;
};

export type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  leader_id: string | null;
  assistant_leader_id: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  is_active: boolean;
  logo_url?: string | null;
  ministry_kind?: string | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile;
  member: Member | null;
  ledDepartmentIds: string[];
  ledDepartments: LedDepartment[];
  workerAssignments: WorkerAssignment[];
};

export function memberFullName(member: Pick<Member, "first_name" | "middle_name" | "last_name">) {
  return [member.first_name, member.middle_name, member.last_name].filter(Boolean).join(" ");
}
