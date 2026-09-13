import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requirePermission("notifications.view");
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("notifications")
    .select("id, title, body, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Messages for your officer portal only." />
      {!items?.length ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border bg-card p-4">
              <div className="font-medium">{item.title}</div>
              {item.body ? <p className="mt-1 text-sm text-muted-foreground">{item.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString()}
                {item.is_read ? "" : " · New"}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
