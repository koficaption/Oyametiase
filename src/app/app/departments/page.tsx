import { assignDepartmentMemberAction, saveDepartmentAction, saveDepartmentActivityAction, submitDepartmentReportAction } from "@/actions/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const user = await requireUser();
  await requirePermission("departments.view");
  const supabase = await createClient();
  const canManage = hasPermission(user.profile.role_slug, "departments.manage");
  let deptQuery = supabase.from("departments").select("*").is("archived_at", null).order("name");
  if (user.profile.role_slug === "department_leader" && user.ledDepartmentIds.length) {
    deptQuery = deptQuery.in("id", user.ledDepartmentIds);
  }
  const { data: departments } = await deptQuery;
  const { data: members } = await supabase.from("members").select("id, first_name, last_name").is("archived_at", null);
  const { data: memberships } = await supabase.from("department_members").select("department_id, member_id, members(first_name, last_name)");

  return (
    <div className="space-y-6">
      <PageHeader title="Departments & ministries" description="Department leaders only see their own ministry." />
      {canManage ? (
        <form action={formAction(saveDepartmentAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <Input name="name" placeholder="Department name" required />
          <Input name="slug" placeholder="slug (optional)" />
          <Input name="meeting_day" placeholder="Meeting day" />
          <Input name="meeting_time" type="time" />
          <Textarea name="description" placeholder="Description" className="md:col-span-2" />
          <Button type="submit">Create department</Button>
        </form>
      ) : null}
      <div className="grid gap-4">
        {departments?.map((dept) => {
          const people = memberships?.filter((row) => row.department_id === dept.id) ?? [];
          return (
            <section key={dept.id} className="rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold">{dept.name}</h2>
              <p className="text-sm text-muted-foreground">{dept.description}</p>
              <p className="mt-1 text-sm">{dept.meeting_day} {dept.meeting_time}</p>
              <ul className="mt-3 text-sm">
                {people.map((row) => {
                  const member = Array.isArray(row.members) ? row.members[0] : row.members;
                  return <li key={`${row.department_id}-${row.member_id}`}>{member ? `${member.first_name} ${member.last_name}` : row.member_id}</li>;
                })}
              </ul>
              {canManage ? (
                <form action={formAction(assignDepartmentMemberAction)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="department_id" value={dept.id} />
                  <select name="member_id" className="h-8 rounded-lg border bg-background px-2 text-sm" required>
                    {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
                  </select>
                  <Input name="role_in_department" placeholder="Role in department" />
                  <Button type="submit" variant="outline">Assign</Button>
                </form>
              ) : null}
              <form action={formAction(saveDepartmentActivityAction)} className="mt-3 grid gap-2 md:grid-cols-3">
                <input type="hidden" name="department_id" value={dept.id} />
                <Input name="title" placeholder="Activity title" required />
                <Input name="activity_date" type="date" />
                <Button type="submit" variant="outline">Record activity</Button>
              </form>
              <form action={formAction(submitDepartmentReportAction)} className="mt-3 space-y-2">
                <input type="hidden" name="department_id" value={dept.id} />
                <Input name="title" placeholder="Report title" required />
                <Textarea name="content" placeholder="Report for the Presiding Elder" required />
                <Button type="submit">Submit report</Button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
