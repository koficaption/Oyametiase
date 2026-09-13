import { recordWelfarePaymentAction, saveWelfareAction } from "@/actions/operations";
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
  const { data: cases } = await supabase.from("welfare_cases").select("*, members!welfare_cases_member_id_fkey(first_name, last_name)").is("archived_at", null).order("created_at", { ascending: false });
  const { data: members } = await supabase.from("members").select("id, first_name, last_name");
  const { data: payments } = await supabase.from("welfare_payments").select("id, case_id, amount, paid_on, notes").order("paid_on", { ascending: false });

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
              {item.amount != null ? <p className="mt-1 text-sm text-muted-foreground">Expected: GHS {Number(item.amount).toLocaleString()}</p> : null}
              <ul className="mt-2 text-sm text-muted-foreground">
                {(payments ?? []).filter((payment) => payment.case_id === item.id).map((payment) => (
                  <li key={payment.id}>Paid {payment.paid_on}: GHS {Number(payment.amount).toLocaleString()}{payment.notes ? ` · ${payment.notes}` : ""}</li>
                ))}
              </ul>
              <form action={formAction(recordWelfarePaymentAction)} className="mt-3 grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="case_id" value={item.id} />
                <Input name="amount" type="number" step="0.01" placeholder="Payment amount" required />
                <Input name="paid_on" type="date" />
                <Input name="notes" placeholder="Payment note" />
                <Button type="submit" variant="outline" className="sm:col-span-3">Record payment</Button>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
