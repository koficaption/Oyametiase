"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/navigation";
import { hasPermission, type Permission, type RoleSlug } from "@/types/roles";

export function MobileNav({ role }: { role: RoleSlug }) {
  const pathname = usePathname();
  const visible = NAV_ITEMS.filter(
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
        </SheetHeader>
        <nav className="mt-4 space-y-1" aria-label="Mobile navigation">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname.startsWith(item.href) ? "bg-accent font-medium" : "hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
