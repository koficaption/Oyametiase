import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function FieldSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-cop-navy/30 bg-white px-3 text-base text-cop-navy",
        className,
      )}
      style={{ fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: 0, wordSpacing: "0.12em" }}
      {...props}
    >
      {children}
    </select>
  );
}
