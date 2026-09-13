import { saveWelfareAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Welfare" };

export default async function WelfarePage() {
  await requirePermission("welfare.view");
  const supabase = await createClient();
  const { data: cases } = await supabase.from("welfare_cases").select("*, members(first_name, last_name)").is("archived_at", null).order("created_at", { ascending: false });
  const { data: members } = await supabase.from("members").select("id, first_name, last_name");

  return (
    <div className="space-y-6">
      <PageHeader title="Welfare" description="Sensitive assistance records. Restricted to authorized officers." />
      <form action={formAction(saveWelfareAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <select name="member_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">Member (optional)</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <select name="category" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="medical">Medical</option>
          <option value="bereavement">Bereavement</option>
          <option value="emergency">Emergency</option>
          <option value="food">Food support</option>
          <option value="other">Other</option>
        </select>
        <Textarea name="description" placeholder="Description" className="md:col-span-2" required />
        <Input name="assistance_requested" placeholder="Assistance requested" />
        <Input name="amount" type="number" step="0.01" placeholder="Amount / value" />
        <select name="status" className="h-8 rounded-lg border bg-background px-2 text-sm">
          {["open", "in_review", "approved", "provided", "closed", "declined"].map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
        </select>
        <Textarea name="notes" placeholder="Internal notes" className="md:col-span-2" />
        <Button type="submit">Save case</Button>
      </form>
      <div className="grid gap-3">
        {cases?.map((item) => {
          const member = Array.isArray(item.members) ? item.members[0] : item.members;
          return (
            <article key={item.id} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{member ? `${member.first_name} ${member.last_name}` : "Unnamed case"}</div>
              <div className="text-sm capitalize text-muted-foreground">{item.category} · {item.status.replace("_", " ")}</div>
              <p className="mt-2 text-sm">{item.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
