import type { ReactNode } from "react";
import { AssemblyMark } from "@/components/brand/assembly-mark";

export function BrandShell({
  children,
  eyebrow = "The Church of Pentecost",
  title,
  description,
  themeYear,
  themeTitle,
  themeScripture,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  themeYear?: number;
  themeTitle?: string;
  themeScripture?: string | null;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cop-navy px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-2 bg-cop-gold" />
      <div className="absolute -right-24 -top-24 size-[22rem] rounded-full border-[28px] border-cop-gold" />
      <div className="absolute -bottom-28 -left-20 size-[18rem] rounded-full border-[28px] border-cop-blue" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white p-8 text-cop-navy shadow-xl">
        <div className="flex flex-col items-center text-center">
          <AssemblyMark size={88} />
          <p className="mt-4 text-sm font-semibold tracking-normal text-cop-blue">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-cop-navy">{title}</h1>
          {themeTitle ? (
            <div className="mt-4 max-w-sm space-y-2">
              <p className="text-xs font-semibold tracking-normal text-cop-blue">
                {themeYear ? `${themeYear} Church Theme` : "Church Theme"}
              </p>
              <p className="text-base font-medium leading-7 tracking-normal text-cop-navy">
                “{themeTitle}”
              </p>
              {themeScripture ? (
                <p className="text-sm leading-6 tracking-normal text-cop-navy/80">{themeScripture}</p>
              ) : null}
            </div>
          ) : description ? (
            <p className="mt-3 max-w-sm text-base leading-7 tracking-normal text-cop-navy/85">
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
