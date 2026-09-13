import { saveEventAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Programs" };

export default async function EventsPage() {
  const user = await requirePermission("events.view");
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*, departments(name)").is("archived_at", null).order("starts_at", { ascending: false });
  const { data: departments } = await supabase.from("departments").select("id, name").eq("is_active", true);
  const canManage = hasPermission(user.profile.role_slug, "events.manage");
  const upcoming = events?.filter((event) => new Date(event.starts_at) >= new Date()) ?? [];
  const past = events?.filter((event) => new Date(event.starts_at) < new Date()) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Programs & calendar" description="Sunday services, conventions, department programs, and special meetings." />
      {canManage ? (
        <form action={formAction(saveEventAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <Input name="title" placeholder="Title" required />
          <Input name="venue" placeholder="Venue" />
          <Input name="starts_at" type="datetime-local" required />
          <Input name="ends_at" type="datetime-local" />
          <select name="department_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">Assembly program</option>
            {departments?.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
          <select name="status" className="h-8 rounded-lg border bg-background px-2 text-sm" defaultValue="scheduled">
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Textarea name="description" className="md:col-span-2" placeholder="Description" />
          <Button type="submit">Save program</Button>
        </form>
      ) : null}
      <section>
        <h2 className="mb-3 font-semibold">Upcoming</h2>
        <div className="grid gap-3">
          {upcoming.map((event) => (
            <article key={event.id} className="rounded-xl border bg-card p-4">
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleString()} · {event.venue}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Past</h2>
        <div className="grid gap-3">
          {past.map((event) => (
            <article key={event.id} className="rounded-xl border bg-card p-4">
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
