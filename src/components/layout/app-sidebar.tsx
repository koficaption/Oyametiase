"use client";

import { Suspense } from "react";
import { AssemblyMark } from "@/components/brand/assembly-mark";
import { NavLink } from "@/components/layout/nav-link";
import { navForPortal, SECTION_LABELS } from "@/lib/navigation";
import { PORTAL_CHROME, PORTAL_LABELS, type PortalKind, type WorkerAssignment } from "@/types/portals";
import { hasPermission, type Permission } from "@/types/roles";

function SidebarNav({
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
  const chrome = PORTAL_CHROME[portal];
  const visible = navForPortal(portal, assignments).filter(
    (item) => !item.permission || hasPermission(role, item.permission as Permission),
  );
  const siblingHrefs = visible.map((item) => item.href);
  const sections = ["overview", "people", "life", "stewardship", "admin"] as const;

  return (
    <aside
      data-scroll-pane="sidebar"
      className="hidden h-full min-h-0 w-72 shrink-0 overflow-hidden border-r border-white/10 text-white lg:flex lg:flex-col"
      style={{ backgroundColor: chrome.sidebar }}
    >
      <div className="h-1.5 shrink-0 bg-cop-gold" />
      <div className="shrink-0 border-b border-white/15 px-5 py-5">
        <div className="flex items-center gap-3">
          <AssemblyMark size={44} />
          <div>
            <div className="text-xs font-semibold tracking-normal text-cop-gold">{churchName}</div>
            <div className="font-semibold leading-tight">{assemblyName}</div>
            <div className="mt-1 text-xs text-cop-gold">{PORTAL_LABELS[portal]}</div>
            <div className="mt-1 text-xs text-white/80">{chrome.desk}</div>
          </div>
        </div>
      </div>
      <nav
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-4"
        aria-label="Assembly navigation"
      >
        {sections.map((section) => {
          const items = visible.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section}>
              <p className="px-2 pb-2 text-xs font-medium tracking-normal text-cop-gold/90">
                {SECTION_LABELS[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    siblingHrefs={siblingHrefs}
                    activeStyle={{ backgroundColor: chrome.sidebarAccent }}
                    className="block rounded-md border-l-4 border-transparent px-3 py-2 text-sm transition-colors hover:bg-white/10"
                    activeClassName="border-cop-gold font-medium text-white"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppSidebar(props: {
  role: Parameters<typeof hasPermission>[0];
  portal: PortalKind;
  churchName: string;
  assemblyName: string;
  assignments?: WorkerAssignment[];
}) {
  return (
    <Suspense fallback={<aside className="hidden h-full w-72 shrink-0 lg:block" />}>
      <SidebarNav {...props} />
    </Suspense>
  );
}
