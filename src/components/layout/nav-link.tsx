"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavActive } from "@/lib/nav-active";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  siblingHrefs,
  className,
  activeClassName,
  style,
  activeStyle,
  onClick,
  children,
}: {
  href: string;
  siblingHrefs: string[];
  className?: string;
  activeClassName?: string;
  style?: CSSProperties;
  activeStyle?: CSSProperties;
  onClick?: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = isNavActive(href, pathname, searchParams.toString(), siblingHrefs);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={active ? activeStyle : style}
      className={cn(className, active && activeClassName)}
    >
      {children}
    </Link>
  );
}
