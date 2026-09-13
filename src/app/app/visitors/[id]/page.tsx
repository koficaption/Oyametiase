import { notFound } from "next/navigation";
import { addVisitorFollowupAction, convertVisitorAction, updateVisitorAction } from "@/actions/visitors";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("visitors.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: visitor } = await supabase.from("visitors").select("*").eq("id", id).maybeSingle();
  if (!visitor) notFound();
  const { data: notes } = await supabase.from("visitor_followups").select("*").eq("visitor_id", id).order("follow_up_date", { ascending: false });
  const { data: members } = await supabase.from("members").select("id, first_name, last_name").is("archived_at", null);

  return (
    <div className="space-y-6">
      <PageHeader title={visitor.full_name} description={`Visited ${visitor.date_visited} · ${visitor.follow_up_status.replaceAll("_", " ")}`} />
      <form action={formAction(updateVisitorAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <input type="hidden" name="id" value={visitor.id} />
        <div className="space-y-1"><Label>Name</Label><Input name="full_name" defaultValue={visitor.full_name} required /></div>
        <div className="space-y-1"><Label>Phone</Label><Input name="phone" defaultValue={visitor.phone ?? ""} /></div>
        <div className="space-y-1"><Label>Email</Label><Input name="email" defaultValue={visitor.email ?? ""} /></div>
        <div className="space-y-1"><Label>Location</Label><Input name="location" defaultValue={visitor.location ?? ""} /></div>
        <div className="space-y-1"><Label>Date visited</Label><Input name="date_visited" type="date" defaultValue={visitor.date_visited} /></div>
        <div className="space-y-1">
          <Label>Follow-up status</Label>
          <select name="follow_up_status" defaultValue={visitor.follow_up_status} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            {["new", "contacted", "follow_up_scheduled", "interested", "joined", "not_reachable", "closed"].map((item) => (
              <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1"><Label>Notes</Label><Textarea name="notes" defaultValue={visitor.notes ?? ""} /></div>
        <Button type="submit">Update visitor</Button>
      </form>
      <form action={formAction(addVisitorFollowupAction)} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Log a follow-up</h2>
        <input type="hidden" name="visitor_id" value={visitor.id} />
        <Input name="follow_up_date" type="date" />
        <Input name="method" placeholder="Phone, visit, WhatsApp" />
        <Textarea name="notes" placeholder="What was discussed?" />
        <select name="follow_up_status" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue={visitor.follow_up_status}>
          {["contacted", "follow_up_scheduled", "interested", "joined", "not_reachable", "closed"].map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </select>
        <Button type="submit">Save follow-up</Button>
      </form>
      <form action={formAction(convertVisitorAction)} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Mark as joined</h2>
        <input type="hidden" name="visitor_id" value={visitor.id} />
        <select name="member_id" className="h-8 w-full rounded-lg border bg-background px-2 text-sm" required>
          <option value="">Link to member record</option>
          {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
        </select>
        <Button type="submit">Visitor became a member</Button>
      </form>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Follow-up history</h2>
        {notes?.map((note) => (
          <div key={note.id} className="rounded-lg border p-3 text-sm">
            <div className="font-medium">{note.follow_up_date} · {note.method}</div>
            <p className="text-muted-foreground">{note.notes}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
