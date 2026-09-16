"use client";

import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navForPortal } from "@/lib/navigation";
import { PORTAL_CHROME, PORTAL_LABELS, type PortalKind, type WorkerAssignment } from "@/types/portals";
import { hasPermission, type Permission, type RoleSlug } from "@/types/roles";

function MobileNavSheet({
  role,
  portal,
  assignments = [],
  assemblyName,
}: {
  role: RoleSlug;
  portal: PortalKind;
  assignments?: WorkerAssignment[];
  assemblyName: string;
}) {
  const [open, setOpen] = useState(false);
  const chrome = PORTAL_CHROME[portal];
  const visible = navForPortal(portal, assignments).filter(
    (item) => !item.permission || hasPermission(role, item.permission as Permission),
  );
  const siblingHrefs = visible.map((item) => item.href);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-80 overflow-hidden border-white/10 text-white"
        style={{ backgroundColor: chrome.sidebar }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-cop-gold" />
        <SheetHeader className="shrink-0">
          <SheetTitle className="text-white">{assemblyName}</SheetTitle>
          <p className="text-sm text-cop-gold">{PORTAL_LABELS[portal]}</p>
          <p className="text-sm text-white/80">{chrome.desk}</p>
        </SheetHeader>
        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 pb-4"
          aria-label="Mobile navigation"
        >
          {visible.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              siblingHrefs={siblingHrefs}
              onClick={() => setOpen(false)}
              className="block rounded-md border-l-4 border-transparent px-3 py-2 text-sm hover:bg-white/10"
              activeClassName="border-cop-gold bg-sidebar-accent font-medium"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function MobileNav(props: {
  role: RoleSlug;
  portal: PortalKind;
  assignments?: WorkerAssignment[];
  assemblyName: string;
}) {
  return (
    <Suspense fallback={
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" disabled>
        <Menu className="h-5 w-5" />
      </Button>
    }>
      <MobileNavSheet {...props} />
    </Suspense>
  );
}
