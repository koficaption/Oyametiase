import { inviteUserAction, resetUserAccessAction, setUserActiveAction, updateUserRoleAction } from "@/actions/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import { ROLE_LABELS, ROLES, type RoleSlug } from "@/types/roles";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const supabase = await createClient();
  const { data: users } = await supabase.from("profiles").select("*").order("full_name");
  const { data: members } = await supabase.from("members").select("id, first_name, last_name");

  return (
    <div className="space-y-6">
      <PageHeader title="User management" description="Only the Presiding Elder can invite users and assign roles. Members cannot change their own role." />
      {!hasServiceRoleKey() ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          Invitations and password-reset emails need <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server.
          Role changes still work.
        </p>
      ) : null}
      <form action={formAction(inviteUserAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
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
      <div className="grid gap-3">
        {users?.map((profile) => (
          <div key={profile.id} className="rounded-xl border bg-card p-4">
            <div className="font-medium">{profile.full_name}</div>
            <div className="text-sm text-muted-foreground">{profile.email} · {ROLE_LABELS[profile.role_slug as RoleSlug]} · {profile.is_active ? "Active" : "Disabled"}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={formAction(updateUserRoleAction)} className="flex gap-2">
                <input type="hidden" name="user_id" value={profile.id} />
                <select name="role_slug" defaultValue={profile.role_slug} className="h-8 rounded-lg border bg-background px-2 text-sm">
                  {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </select>
                <Button type="submit" variant="outline">Update role</Button>
              </form>
              <form action={formAction(setUserActiveAction)}>
                <input type="hidden" name="user_id" value={profile.id} />
                <input type="hidden" name="is_active" value={profile.is_active ? "false" : "true"} />
                <Button type="submit" variant="outline">{profile.is_active ? "Disable" : "Re-enable"}</Button>
              </form>
              <form action={formAction(resetUserAccessAction)}>
                <input type="hidden" name="email" value={profile.email} />
                <Button type="submit" variant="outline">Reset access</Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
