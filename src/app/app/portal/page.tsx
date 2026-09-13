import { updateOwnProfileAction } from "@/actions/members";
import { submitPrayerAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { ROLE_LABELS } from "@/types/roles";

export const metadata = { title: "My profile" };

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
  const { data: department } = user.profile.assigned_department_id
    ? await supabase.from("departments").select("name").eq("id", user.profile.assigned_department_id).maybeSingle()
    : user.member?.primary_department_id
      ? await supabase.from("departments").select("name").eq("id", user.member.primary_department_id).maybeSingle()
      : { data: user.ledDepartments[0] ? { name: user.ledDepartments[0].name } : null };

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Your approved church and system information. You cannot change your own system role or office." />

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Approved information</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-muted-foreground">Full name</dt><dd>{user.profile.full_name}</dd></div>
          <div><dt className="text-muted-foreground">Username</dt><dd>{user.profile.username ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Date of birth</dt><dd>{user.profile.date_of_birth ?? confidential?.date_of_birth ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Email</dt><dd>{user.profile.email}</dd></div>
          <div><dt className="text-muted-foreground">Phone</dt><dd>{user.profile.phone ?? confidential?.phone ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">WhatsApp</dt><dd>{user.profile.whatsapp_number ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Church position</dt><dd>{user.profile.church_position ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Church responsibility</dt><dd>{user.profile.church_responsibility ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">Department</dt><dd>{department?.name ?? "—"}</dd></div>
          <div><dt className="text-muted-foreground">System role</dt><dd>{ROLE_LABELS[user.profile.role_slug]}</dd></div>
          <div><dt className="text-muted-foreground">Account status</dt><dd className="capitalize">{user.profile.account_status ?? (user.profile.is_active ? "active" : "disabled")}</dd></div>
        </dl>
      </section>

      {user.member ? (
        <form action={formAction(updateOwnProfileAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
          <div className="md:col-span-2 text-sm text-muted-foreground">
            {user.member.member_code} · You may update contact details only.
          </div>
          <Input name="phone" defaultValue={confidential?.phone ?? user.profile.phone ?? ""} placeholder="Phone" />
          <Input name="email" defaultValue={confidential?.email ?? user.profile.email ?? ""} placeholder="Email" />
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

      <section id="attendance" className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">My attendance</h2>
        {attendance?.length ? attendance.map((row, index) => {
          const service = Array.isArray(row.services) ? row.services[0] : row.services;
          return <div key={`${row.attendance_date}-${index}`} className="flex justify-between border-b py-2 text-sm last:border-0"><span>{row.attendance_date}</span><span>{service?.name} · {row.status}</span></div>;
        }) : <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>}
      </section>
      <section id="department" className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">My department</h2>
        <p className="text-sm text-muted-foreground">
          {department?.name ?? "No ministry assignment yet. Ask the Secretary if this should be updated."}
        </p>
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
      <section id="settings" className="rounded-xl border bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Settings</h2>
        <p className="text-muted-foreground">Change your password from the reset-password email if you need a new one. System role and church office can only be changed by the Presiding Elder.</p>
      </section>
    </div>
  );
}
