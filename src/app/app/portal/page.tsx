import { updateOwnProfileAction } from "@/actions/members";
import { submitPrayerAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Member portal" };

export default async function PortalPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: confidential } = user.member
    ? await supabase.from("member_confidential").select("*").eq("member_id", user.member.id).maybeSingle()
    : { data: null };
  const { data: attendance } = user.member
    ? await supabase.from("attendance").select("attendance_date, status, services(name)").eq("member_id", user.member.id).order("attendance_date", { ascending: false }).limit(10)
    : { data: [] };
  const { data: announcements } = await supabase.from("announcements").select("title, content, published_at").is("archived_at", null).order("published_at", { ascending: false }).limit(5);
  const { data: events } = await supabase.from("events").select("title, starts_at, venue").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5);

  return (
    <div className="space-y-6">
      <PageHeader title="Member portal" description="Update your permitted details, see announcements, and submit prayer requests. You cannot see finance, other members' private data, or audit logs." />
      {user.member ? (
        <form action={formAction(updateOwnProfileAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm text-muted-foreground">
            {user.member.member_code} · {user.member.first_name} {user.member.last_name}
          </div>
          <Input name="phone" defaultValue={confidential?.phone ?? ""} placeholder="Phone" />
          <Input name="email" defaultValue={confidential?.email ?? ""} placeholder="Email" />
          <Input name="residential_address" defaultValue={confidential?.residential_address ?? ""} placeholder="Address" className="md:col-span-2" />
          <Input name="occupation" defaultValue={confidential?.occupation ?? ""} placeholder="Occupation" />
          <Input name="emergency_contact_name" defaultValue={confidential?.emergency_contact_name ?? ""} placeholder="Emergency contact" />
          <Input name="emergency_relationship" defaultValue={confidential?.emergency_relationship ?? ""} placeholder="Relationship" />
          <Input name="emergency_phone" defaultValue={confidential?.emergency_phone ?? ""} placeholder="Emergency phone" />
          <Button type="submit">Update my details</Button>
        </form>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm">This login is not linked to a member record yet.</p>
      )}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">My attendance</h2>
        {attendance?.map((row, index) => {
          const service = Array.isArray(row.services) ? row.services[0] : row.services;
          return <div key={`${row.attendance_date}-${index}`} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{row.attendance_date}</span><span>{service?.name} · {row.status}</span></div>;
        })}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Announcements</h2>
        {announcements?.map((item) => (
          <article key={item.title} className="border-b py-3 last:border-0">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.content}</p>
          </article>
        ))}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Upcoming programs</h2>
        {events?.map((event) => (
          <div key={event.title} className="border-b py-2 text-sm last:border-0">
            {event.title} · {new Date(event.starts_at).toLocaleString()}
          </div>
        ))}
      </section>
      <form action={formAction(submitPrayerAction)} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Submit a prayer request</h2>
        <Input name="title" required placeholder="Title" />
        <Textarea name="request" required placeholder="Request" />
        <select name="privacy_level" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="prayer_team">Prayer team</option>
          <option value="private">Private</option>
          <option value="presiding_elder">Presiding Elder only</option>
        </select>
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
