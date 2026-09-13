import { Card, CardContent } from "@/components/ui/card";
import type { ChurchThemeRecord } from "@/lib/reports/types";

export function ThemeBanner({
  theme,
  compact = false,
}: {
  theme: Pick<ChurchThemeRecord, "year" | "title" | "scripture" | "description"> | null;
  compact?: boolean;
}) {
  if (!theme) {
    return (
      <Card className="border-cop-gold/40 bg-cop-gold/10">
        <CardContent className="p-4 text-sm text-muted-foreground">
          No official church theme is set for the current year. Authorized leadership can add it under Church Theme.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-cop-gold/50 bg-cop-navy text-white">
      <div className="h-1 bg-cop-gold" />
      <CardContent className={compact ? "p-4" : "p-5"}>
        <p className="text-xs font-semibold tracking-[0.18em] text-cop-gold">{theme.year} CHURCH THEME</p>
        <p className={`mt-2 font-medium leading-relaxed ${compact ? "text-base" : "text-lg"}`}>
          “{theme.title}”
        </p>
        {theme.scripture ? <p className="mt-2 text-sm text-white/80">{theme.scripture}</p> : null}
        {!compact && theme.description ? <p className="mt-2 text-sm text-white/80">{theme.description}</p> : null}
      </CardContent>
    </Card>
  );
}
