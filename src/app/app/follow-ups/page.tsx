import { addFollowupAttemptAction, saveFollowupAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Follow-ups" };

export default async function FollowUpsPage() {
  await requirePermission("followups.view");
  const supabase = await createClient();
  const { data: followups } = await supabase
    .from("member_followups")
    .select("*, members!member_followups_member_id_fkey(first_name, last_name)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  const { data: members } = await supabase.from("members").select("id, first_name, last_name").is("archived_at", null);

  return (
    <div className="space-y-6">
      <PageHeader title="New convert & new member follow-up" description="See who still needs pastoral attention." />
      <form action={formAction(saveFollowupAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <select name="member_id" required className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Select member</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <select name="follow_up_type" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="new_convert">New convert</option>
          <option value="new_member">New member</option>
          <option value="inactive">Inactive</option>
          <option value="pastoral">Pastoral</option>
        </select>
        <select name="assigned_to" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Assign to</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <Input name="next_contact_on" type="date" />
        <Textarea name="notes" placeholder="Notes" className="md:col-span-2" />
        <Button type="submit">Start follow-up</Button>
      </form>
      <div className="space-y-3">
        {followups?.map((item) => {
          const member = Array.isArray(item.members) ? item.members[0] : item.members;
          return (
            <div key={item.id} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{member ? `${member.first_name} ${member.last_name}` : "Member"}</div>
              <div className="text-sm capitalize text-muted-foreground">{item.follow_up_type.replace("_", " ")} · {item.status.replace("_", " ")}</div>
              <p className="mt-2 text-sm">{item.notes}</p>
              <form action={formAction(addFollowupAttemptAction)} className="mt-3 grid gap-2 md:grid-cols-3">
                <input type="hidden" name="followup_id" value={item.id} />
                <Input name="attempt_date" type="date" />
                <Input name="method" placeholder="Phone / visit" />
                <Input name="notes" placeholder="Outcome" />
                <Button type="submit" variant="outline">Log contact</Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
