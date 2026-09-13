import { saveWorkerAction } from "@/actions/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Workers" };

export default async function WorkersPage() {
  await requirePermission("workers.view");
  const supabase = await createClient();
  const [{ data: workers }, { data: members }, { data: positions }, { data: departments }] = await Promise.all([
    supabase.from("workers").select("*, members(first_name, last_name, member_code), positions(name), departments(name)").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("members").select("id, first_name, last_name").is("archived_at", null),
    supabase.from("positions").select("id, name").eq("is_active", true),
    supabase.from("departments").select("id, name").eq("is_active", true),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Workers & officers" description="Positions are configurable. Do not hard-code titles in the assembly." />
      <form action={formAction(saveWorkerAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <select name="member_id" required className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Member</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <select name="position_id" required className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Position</option>
          {positions?.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}
        </select>
        <select name="department_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Department (optional)</option>
          {departments?.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </select>
        <Input name="start_date" type="date" />
        <Input name="contact_phone" placeholder="Contact phone" />
        <Input name="notes" placeholder="Notes" />
        <Button type="submit">Save worker</Button>
      </form>
      <div className="grid gap-3">
        {workers?.map((worker) => {
          const member = Array.isArray(worker.members) ? worker.members[0] : worker.members;
          const position = Array.isArray(worker.positions) ? worker.positions[0] : worker.positions;
          const department = Array.isArray(worker.departments) ? worker.departments[0] : worker.departments;
          return (
            <div key={worker.id} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{member ? `${member.first_name} ${member.last_name}` : "Member"}</div>
              <div className="text-sm text-muted-foreground">
                {member?.member_code} · {position?.name} · {department?.name ?? "Assembly"} · {worker.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
