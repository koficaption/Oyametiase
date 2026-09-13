import { saveAnnouncementAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";
import { hasPermission } from "@/types/roles";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requirePermission("announcements.view");
  const supabase = await createClient();
  const { data: announcements } = await supabase.from("announcements").select("*").is("archived_at", null).order("published_at", { ascending: false });
  const { data: departments } = await supabase.from("departments").select("id, name");
  const canManage = hasPermission(user.profile.role_slug, "announcements.manage");

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="General notices, program reminders, and emergency information." />
      {canManage ? (
        <form action={formAction(saveAnnouncementAction)} className="grid gap-3 rounded-xl border bg-card p-4">
          <Input name="title" placeholder="Title" required />
          <Textarea name="content" placeholder="Announcement" required />
          <div className="grid gap-3 md:grid-cols-3">
            <select name="category" className="h-8 rounded-lg border bg-background px-2 text-sm">
              {["general", "program", "department", "emergency", "reminder", "information"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select name="audience" className="h-8 rounded-lg border bg-background px-2 text-sm">
              {["everyone", "members", "youth", "men", "women", "children", "department", "officers"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select name="department_id" className="h-8 rounded-lg border bg-background px-2 text-sm">
              <option value="">No department</option>
              {departments?.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
            </select>
          </div>
          <Button type="submit">Publish</Button>
        </form>
      ) : null}
      <div className="grid gap-3">
        {announcements?.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">{item.category} · {item.audience}</div>
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
