import { AttendanceForm } from "@/components/attendance/attendance-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { memberFullName } from "@/types/database";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requirePermission("attendance.view");
  const supabase = await createClient();
  const [{ data: members }, { data: visitors }, { data: services }, { data: departments }, { data: recent }] =
    await Promise.all([
      supabase.from("members").select("id, first_name, middle_name, last_name").is("archived_at", null).order("last_name"),
      supabase.from("visitors").select("id, full_name").is("archived_at", null).limit(100),
      supabase.from("services").select("id, name").eq("is_active", true),
      supabase.from("departments").select("id, name").eq("is_active", true),
      supabase
        .from("attendance")
        .select("attendance_date, status, members(first_name, last_name), visitors(full_name), services(name)")
        .order("attendance_date", { ascending: false })
        .limit(20),
    ]);

  const people = [
    ...(members ?? []).map((member) => ({ id: member.id, label: memberFullName(member), kind: "member" as const })),
    ...(visitors ?? []).map((visitor) => ({ id: visitor.id, label: visitor.full_name, kind: "visitor" as const })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Record Sunday, midweek, department, and special program attendance. Duplicates for the same person, date, and service are blocked."
      />
      {hasPermission(user.profile.role_slug, "attendance.manage") ? (
        <AttendanceForm people={people} services={services ?? []} departments={departments ?? []} />
      ) : (
        <p className="text-sm text-muted-foreground">You can review attendance. Recording is limited to authorized officers.</p>
      )}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent records</h2>
        <div className="space-y-2 text-sm">
          {recent?.map((row, index) => {
            const member = Array.isArray(row.members) ? row.members[0] : row.members;
            const visitor = Array.isArray(row.visitors) ? row.visitors[0] : row.visitors;
            const service = Array.isArray(row.services) ? row.services[0] : row.services;
            return (
              <div key={`${row.attendance_date}-${index}`} className="flex justify-between border-b py-2 last:border-0">
                <span>{member ? `${member.first_name} ${member.last_name}` : visitor?.full_name}</span>
                <span className="text-muted-foreground">
                  {row.attendance_date} · {service?.name ?? "Service"} · {row.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
