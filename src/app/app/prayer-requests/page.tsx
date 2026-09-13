import { submitPrayerAction, updatePrayerStatusAction } from "@/actions/operations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Prayer requests" };

export default async function PrayerPage() {
  await requirePermission("prayer.submit");
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("prayer_requests")
    .select("id, title, request, privacy_level, status, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prayer requests"
        description="Private requests stay private. Having an administrative login does not reveal a private request."
      />
      <form action={formAction(submitPrayerAction)} className="space-y-3 rounded-xl border bg-card p-4">
        <Input name="title" placeholder="Title" required />
        <Textarea name="request" placeholder="Share the request" required />
        <select name="privacy_level" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="prayer_team">Prayer team</option>
          <option value="authorized_leaders">Authorized leaders</option>
          <option value="presiding_elder">Presiding Elder only</option>
          <option value="private">Private (only me)</option>
        </select>
        <Button type="submit">Submit request</Button>
      </form>
      <div className="grid gap-3">
        {requests?.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">{item.privacy_level.replace("_", " ")} · {item.status.replace("_", " ")}</div>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap">{item.request}</p>
            <form action={formAction(updatePrayerStatusAction)} className="mt-3 flex gap-2">
              <input type="hidden" name="id" value={item.id} />
              <select name="status" defaultValue={item.status} className="h-8 rounded-lg border bg-background px-2 text-sm">
                {["pending", "praying", "follow_up_required", "answered", "closed"].map((status) => (
                  <option key={status} value={status}>{status.replace("_", " ")}</option>
                ))}
              </select>
              <Button type="submit" variant="outline">Update</Button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
