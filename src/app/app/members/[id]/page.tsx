import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberActions } from "@/components/members/member-actions";
import { MemberForm } from "@/components/members/member-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/types/roles";
import { memberFullName } from "@/types/database";

export const metadata = { title: "Member profile" };

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("members.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("*, departments!primary_department_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  const canSensitive = hasPermission(user.profile.role_slug, "members.sensitive");
  const canManage = hasPermission(user.profile.role_slug, "members.manage");
  const { data: confidential } = canSensitive
    ? await supabase.from("member_confidential").select("*").eq("member_id", id).maybeSingle()
    : { data: null };
  const { data: departments } = await supabase.from("departments").select("id, name").eq("is_active", true);
  const { data: attendance } = await supabase
    .from("attendance")
    .select("attendance_date, status, services(name)")
    .eq("member_id", id)
    .order("attendance_date", { ascending: false })
    .limit(12);
  const { count: presentCount } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("member_id", id)
    .eq("status", "present");

  const record = { ...member, ...(confidential ?? {}) };
  const dept = Array.isArray(member.departments) ? member.departments[0] : member.departments;

  return (
    <div className="space-y-6">
      <PageHeader
        title={memberFullName(member)}
        description={`${member.member_code} · ${member.archived_at ? "removed" : member.membership_status.replace("_", " ")} · ${dept?.name ?? "No department"}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/app/members/${id}/print`} target="_blank">
                Print profile
              </Link>
            </Button>
            <MemberActions
              id={id}
              archived={Boolean(member.archived_at)}
              canManage={canManage}
              canDeleteForever={hasPermission(user.profile.role_slug, "users.manage")}
            />
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Attendance recorded present</div>
          <div className="font-mono text-2xl">{presentCount ?? 0}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Baptism</div>
          <div className="text-lg capitalize">{member.baptism_status.replace("_", " ")}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Joined</div>
          <div className="text-lg">{member.date_joined ?? "—"}</div>
        </div>
      </div>
      {canManage ? (
        <MemberForm member={record} departments={departments ?? []} canEditSensitive={canSensitive} />
      ) : (
        <div className="rounded-xl border bg-card p-4 text-sm">
          Contact details are visible only to authorized officers.
        </div>
      )}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent attendance</h2>
        <div className="space-y-2 text-sm">
          {attendance?.length ? (
            attendance.map((row) => {
              const service = Array.isArray(row.services) ? row.services[0] : row.services;
              return (
                <div key={`${row.attendance_date}-${service?.name}`} className="flex justify-between border-b py-2 last:border-0">
                  <span>{row.attendance_date}</span>
                  <span className="capitalize">
                    {service?.name ?? "Service"} · {row.status}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No attendance yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
