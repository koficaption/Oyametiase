import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser, userPortal } from "@/lib/auth/session";
import { getAssembly } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_CHROME } from "@/types/portals";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const portal = userPortal(user);
  const chrome = PORTAL_CHROME[portal];
  const supabase = await createClient();
  const assembly = await getAssembly(supabase);
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        role={user.profile.role_slug}
        portal={portal}
        churchName={assembly?.church_name ?? "The Church of Pentecost"}
        assemblyName={assembly?.assembly_name ?? "Oyame Tiase Assembly"}
        assignments={user.workerAssignments}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b text-white" style={{ backgroundColor: chrome.header }}>
          <div className="h-1 bg-cop-gold" />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <MobileNav role={user.profile.role_slug} portal={portal} assignments={user.workerAssignments} />
            <div className="lg:hidden">
              <div className="text-sm font-semibold">Oyame Tiase Assembly</div>
              <div className="text-xs text-cop-gold">{chrome.desk}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center [&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <NotificationsBell initialItems={notifications ?? []} userId={user.id} />
              <ThemeToggle />
            </div>
            <UserMenu name={user.profile.full_name} portal={portal} />
          </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
