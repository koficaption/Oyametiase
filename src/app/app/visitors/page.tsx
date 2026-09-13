import { createVisitorAction } from "@/actions/visitors";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import Link from "next/link";

export const metadata = { title: "Visitors" };

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("visitors.view");
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("visitors")
    .select("id, full_name, phone, date_visited, follow_up_status, assigned_to")
    .is("archived_at", null)
    .order("date_visited", { ascending: false })
    .limit(50);
  if (params.q) query = query.ilike("full_name", `%${params.q}%`);
  if (params.status) query = query.eq("follow_up_status", params.status);
  const { data: visitors } = await query;
  const { data: members } = await supabase.from("members").select("id, first_name, last_name").is("archived_at", null).limit(200);
  const { data: services } = await supabase.from("services").select("id, name").eq("is_active", true);

  return (
    <div className="space-y-6">
      <PageHeader title="Visitors" description="Register guests and track follow-up without creating fake member accounts." />
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" placeholder="Search visitors" defaultValue={params.q} />
        <select name="status" defaultValue={params.status ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All follow-up statuses</option>
          {["new", "contacted", "follow_up_scheduled", "interested", "joined", "not_reachable", "closed"].map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <form action={formAction(createVisitorAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold">Register a visitor</h2>
        <div className="space-y-1"><Label htmlFor="full_name">Name</Label><Input id="full_name" name="full_name" required /></div>
        <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
        <div className="space-y-1"><Label htmlFor="location">Location</Label><Input id="location" name="location" /></div>
        <div className="space-y-1"><Label htmlFor="date_visited">Date visited</Label><Input id="date_visited" name="date_visited" type="date" required /></div>
        <div className="space-y-1">
          <Label htmlFor="service_id">Service</Label>
          <select id="service_id" name="service_id" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Select service</option>
            {services?.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="assigned_to">Follow-up person</Label>
          <select id="assigned_to" name="assigned_to" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Unassigned</option>
            {members?.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
          </select>
        </div>
        <input type="hidden" name="follow_up_status" value="new" />
        <div className="md:col-span-2"><Button type="submit">Save visitor</Button></div>
      </form>
      {!visitors?.length ? (
        <EmptyState title="No visitors yet" description="Register the first guest from today's service." />
      ) : (
        <div className="grid gap-3">
          {visitors.map((visitor) => (
            <Link key={visitor.id} href={`/app/visitors/${visitor.id}`} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{visitor.full_name}</div>
              <div className="text-sm text-muted-foreground">
                {visitor.date_visited} · {visitor.follow_up_status.replaceAll("_", " ")} · {visitor.phone ?? "No phone"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
