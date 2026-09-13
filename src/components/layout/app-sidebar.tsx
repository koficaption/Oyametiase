"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssemblyMark } from "@/components/brand/assembly-mark";
import { navForPortal, SECTION_LABELS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { PORTAL_LABELS, type PortalKind, type WorkerAssignment } from "@/types/portals";
import { hasPermission, type Permission } from "@/types/roles";

export function AppSidebar({
  role,
  portal,
  churchName,
  assemblyName,
  assignments = [],
}: {
  role: Parameters<typeof hasPermission>[0];
  portal: PortalKind;
  churchName: string;
  assemblyName: string;
  assignments?: WorkerAssignment[];
}) {
  const pathname = usePathname();
  const visible = navForPortal(portal, assignments).filter(
    (item) => !item.permission || hasPermission(role, item.permission as Permission),
  );
  const sections = ["overview", "people", "life", "stewardship", "admin"] as const;

  return (
    <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="h-1.5 bg-cop-gold" />
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <AssemblyMark size={44} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-sidebar-primary">{churchName}</div>
            <div className="font-semibold leading-tight">{assemblyName}</div>
            <div className="mt-1 text-xs text-sidebar-primary">{PORTAL_LABELS[portal]}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Assembly navigation">
        {sections.map((section) => {
          const items = visible.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section}>
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-sidebar-primary/80">
                {SECTION_LABELS[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const path = item.href.split("?")[0];
                  const active = pathname === path || (path !== "/app" && pathname.startsWith(`${path}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-l-4 border-cop-gold bg-sidebar-accent font-medium text-white"
                          : "border-l-4 border-transparent hover:bg-sidebar-accent/70",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
