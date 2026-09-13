import { saveChildAction } from "@/actions/children";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { formAction } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { memberFullName } from "@/types/database";

export const metadata = { title: "Children" };

export default async function ChildrenPage() {
  const user = await requirePermission("children.view");
  const supabase = await createClient();
  const childrenDept = user.ledDepartments.find((dept) => dept.slug === "children");
  const [{ data: children }, { data: parents }, { data: departments }] = await Promise.all([
    supabase.from("ministry_children").select("*").is("archived_at", null).order("last_name"),
    supabase.from("members").select("id, first_name, last_name").is("archived_at", null).order("last_name"),
    supabase.from("departments").select("id, name, slug").eq("slug", "children"),
  ]);
  const canManage = user.profile.role_slug !== "member";
  const classes = [...new Set((children ?? []).map((row) => row.class_name).filter(Boolean))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Children's Ministry"
        description="Children's records are private. Ordinary members cannot see this register."
      />
      {canManage ? (
        <form action={formAction(saveChildAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <Input name="first_name" placeholder="First name" required />
          <Input name="last_name" placeholder="Last name" required />
          <select name="gender" className="h-8 rounded-lg border bg-background px-2 text-sm" required>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <Input name="date_of_birth" type="date" />
          <select name="department_id" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue={childrenDept?.id ?? departments?.[0]?.id}>
            {(departments ?? []).map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <Input name="class_name" placeholder="Class" />
          <select name="parent_member_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">Link parent / guardian member</option>
            {parents?.map((member) => (
              <option key={member.id} value={member.id}>{memberFullName({ ...member, middle_name: null })}</option>
            ))}
          </select>
          <Input name="guardian_name" placeholder="Guardian name" />
          <Input name="guardian_phone" placeholder="Guardian phone" />
          <Input name="notes" placeholder="Notes" className="md:col-span-2" />
          <Button type="submit">Register child</Button>
        </form>
      ) : null}
      <section id="classes" className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Classes</h2>
        <p className="mt-2 text-sm text-muted-foreground">{classes.length ? classes.join(" · ") : "No classes recorded yet."}</p>
      </section>
      <section id="guardians" className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Child</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Guardian</th>
              <th className="px-3 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {children?.map((child) => (
              <tr key={child.id} className="border-t">
                <td className="px-3 py-2">{child.first_name} {child.last_name}</td>
                <td className="px-3 py-2">{child.class_name ?? "—"}</td>
                <td className="px-3 py-2">{child.guardian_name ?? "—"}</td>
                <td className="px-3 py-2">{child.guardian_phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
