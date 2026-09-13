import { RoleDashboard } from "@/components/dashboards/role-dashboard";
import { requireUser } from "@/lib/auth/session";
import { dashboardCounts } from "@/lib/data/queries";
import { daysAgoIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const stats = await dashboardCounts(supabase, user.profile.assembly_id);

  const [{ data: membersByMonth }, { data: attendanceRows }, { data: visitorRows }, { data: deptRows }] =
    await Promise.all([
      supabase
        .from("members")
        .select("date_joined, gender")
        .eq("assembly_id", user.profile.assembly_id)
        .is("archived_at", null),
      supabase
        .from("attendance")
        .select("attendance_date, status, members(gender)")
        .eq("assembly_id", user.profile.assembly_id)
        .eq("status", "present")
        .gte("attendance_date", daysAgoIso(60)),
      supabase
        .from("visitors")
        .select("date_visited, follow_up_status")
        .eq("assembly_id", user.profile.assembly_id)
        .is("archived_at", null),
      supabase
        .from("department_members")
        .select("department_id, departments(name)")
        .limit(400),
    ]);

  return (
    <RoleDashboard
      role={user.profile.role_slug}
      name={user.profile.full_name}
      stats={stats}
      members={membersByMonth ?? []}
      attendance={attendanceRows ?? []}
      visitors={visitorRows ?? []}
      departments={deptRows ?? []}
      ledDepartmentIds={user.ledDepartmentIds}
    />
  );
}
