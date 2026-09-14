import {
  inviteUserAction,
  resetUserAccessAction,
  reviewRegistrationAction,
  setUserActiveAction,
  updateChurchOfficeAction,
  updateUserRoleAction,
} from "@/actions/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHURCH_POSITIONS, CHURCH_RESPONSIBILITIES, suggestedDepartmentSlug, suggestedSystemRole } from "@/lib/church-directory";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import { ROLE_LABELS, ROLES, type RoleSlug } from "@/types/roles";

export const metadata = { title: "Assign officers" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const supabase = await createClient();
  const [{ data: users }, { data: members }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("members").select("id, first_name, last_name"),
    supabase.from("departments").select("id, name, slug").is("archived_at", null).eq("is_active", true).order("name"),
  ]);

  const pending = (users ?? []).filter((row) => row.approval_status === "pending" || row.account_status === "pending");
  const accounts = (users ?? []).filter((row) => !pending.some((item) => item.id === row.id));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assign officers"
        description="When someone creates an account, they wait here. Choose Secretary, Treasurer, or a ministry, then tap Assign this office. Until you do that, they cannot open the system."
      />
      {!hasServiceRoleKey() ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Invitations and password-reset emails need <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server.
          Approvals still work.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Waiting for an office</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No one is waiting. New sign-ups will appear here.</p>
        ) : (
          pending.map((profile) => {
            const suggested = suggestedSystemRole(profile.church_position ?? "", profile.church_responsibility ?? "");
            const suggestedDept = suggestedDepartmentSlug(profile.church_responsibility ?? "");
            const defaultDept = profile.assigned_department_id
              ?? departments?.find((dept) => dept.slug === suggestedDept)?.id
              ?? "";
            return (
              <article key={profile.id} className="space-y-4 rounded-xl border bg-card p-4">
                <div>
                  <div className="font-medium">{profile.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    @{profile.username ?? "—"} · {profile.email} · submitted {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                </div>
                <dl className="grid gap-2 text-sm md:grid-cols-2">
                  <div><span className="text-muted-foreground">Date of birth: </span>{profile.date_of_birth ?? "—"}</div>
                  <div><span className="text-muted-foreground">Phone: </span>{profile.phone ?? "—"}</div>
                  <div><span className="text-muted-foreground">WhatsApp: </span>{profile.whatsapp_number ?? "—"}</div>
                  <div><span className="text-muted-foreground">Requested access: </span>{profile.requested_system_role ?? "member"}</div>
                  <div><span className="text-muted-foreground">Account status: </span>{profile.account_status}</div>
                  <div><span className="text-muted-foreground">Approval: </span>{profile.approval_status}</div>
                </dl>
                <form action={formAction(reviewRegistrationAction)} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="user_id" value={profile.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <label className="space-y-1 text-sm">
                    <span>Church position</span>
                    <select name="church_position" defaultValue={profile.church_position ?? "Member"} className="h-8 w-full rounded-lg border bg-background px-2">
                      {CHURCH_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Responsibility</span>
                    <select name="church_responsibility" defaultValue={profile.church_responsibility ?? "No specific role"} className="h-8 w-full rounded-lg border bg-background px-2">
                      {CHURCH_RESPONSIBILITIES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Assign system role</span>
                    <select name="role_slug" defaultValue={suggested} className="h-8 w-full rounded-lg border bg-background px-2">
                      {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Department</span>
                    <select name="assigned_department_id" defaultValue={defaultDept} className="h-8 w-full rounded-lg border bg-background px-2">
                      <option value="">None</option>
                      {departments?.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <Button type="submit" className="h-11 w-full text-base sm:w-auto">Assign this office</Button>
                  </div>
                </form>
                <form action={formAction(reviewRegistrationAction)}>
                  <input type="hidden" name="user_id" value={profile.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Button type="submit" variant="outline">Reject</Button>
                </form>
              </article>
            );
          })
        )}
      </section>

      <form action={formAction(inviteUserAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Invite an approved officer</h2>
        <Input name="full_name" placeholder="Full name" required />
        <Input name="email" type="email" placeholder="Email" required />
        <select name="role_slug" className="h-8 rounded-lg border bg-background px-2 text-sm">
          {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
        <select name="member_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Link member record</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <Button type="submit">Invite user</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        {accounts.map((profile) => (
          <div key={profile.id} className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <div className="font-medium">{profile.full_name}</div>
              <div className="text-sm text-muted-foreground">
                @{profile.username ?? "—"} · {profile.email} · {ROLE_LABELS[profile.role_slug as RoleSlug]} · {profile.account_status ?? (profile.is_active ? "active" : "disabled")}
              </div>
              <div className="mt-1 text-sm">
                {profile.church_position ?? "Member"} · {profile.church_responsibility ?? "No specific role"}
              </div>
            </div>
            <form action={formAction(updateChurchOfficeAction)} className="grid gap-2 md:grid-cols-3">
              <input type="hidden" name="user_id" value={profile.id} />
              <select name="church_position" defaultValue={profile.church_position ?? "Member"} className="h-8 rounded-lg border bg-background px-2 text-sm">
                {CHURCH_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
              <select name="church_responsibility" defaultValue={profile.church_responsibility ?? "No specific role"} className="h-8 rounded-lg border bg-background px-2 text-sm">
                {CHURCH_RESPONSIBILITIES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select name="assigned_department_id" defaultValue={profile.assigned_department_id ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
                <option value="">No department</option>
                {departments?.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
              </select>
              <Button type="submit" variant="outline">Save office</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <form action={formAction(updateUserRoleAction)} className="flex gap-2">
                <input type="hidden" name="user_id" value={profile.id} />
                <select name="role_slug" defaultValue={profile.role_slug} className="h-8 rounded-lg border bg-background px-2 text-sm">
                  {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </select>
                <Button type="submit" variant="outline">Assign system role</Button>
              </form>
              <form action={formAction(setUserActiveAction)}>
                <input type="hidden" name="user_id" value={profile.id} />
                <input type="hidden" name="is_active" value={profile.is_active && profile.account_status !== "suspended" ? "false" : "true"} />
                <Button type="submit" variant="outline">
                  {profile.account_status === "suspended" || !profile.is_active ? "Re-enable" : "Suspend account"}
                </Button>
              </form>
              <form action={formAction(resetUserAccessAction)}>
                <input type="hidden" name="email" value={profile.email} />
                <Button type="submit" variant="outline">Reset access</Button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
