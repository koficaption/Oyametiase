"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Church } from "lucide-react";
import { NAV_ITEMS, SECTION_LABELS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, type Permission, type RoleSlug } from "@/types/roles";

export function AppSidebar({
  role,
  churchName,
  assemblyName,
}: {
  role: RoleSlug;
  churchName: string;
  assemblyName: string;
}) {
  const pathname = usePathname();
  const visible = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission as Permission),
  );
  const sections = ["overview", "people", "life", "stewardship", "admin"] as const;

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="border-b px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Church className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{churchName}</div>
            <div className="font-semibold leading-tight">{assemblyName}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Assembly navigation">
        {sections.map((section) => {
          const items = visible.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div key={section}>
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/70",
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
