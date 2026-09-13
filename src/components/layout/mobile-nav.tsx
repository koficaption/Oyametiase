"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navForPortal } from "@/lib/navigation";
import { PORTAL_LABELS, type PortalKind, type WorkerAssignment } from "@/types/portals";
import { hasPermission, type Permission, type RoleSlug } from "@/types/roles";

export function MobileNav({
  role,
  portal,
  assignments = [],
}: {
  role: RoleSlug;
  portal: PortalKind;
  assignments?: WorkerAssignment[];
}) {
  const pathname = usePathname();
  const visible = navForPortal(portal, assignments).filter(
    (item) => !item.permission || hasPermission(role, item.permission as Permission),
  );
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Oyame Tiase Assembly</SheetTitle>
          <p className="text-sm text-muted-foreground">{PORTAL_LABELS[portal]}</p>
        </SheetHeader>
        <nav className="mt-4 space-y-1" aria-label="Mobile navigation">
          {visible.map((item) => {
            const path = item.href.split("?")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === path || pathname.startsWith(`${path}/`) ? "bg-accent font-medium" : "hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
