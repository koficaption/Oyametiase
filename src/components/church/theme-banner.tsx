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
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          No official church theme is set for the current year. Authorized leadership can add it under Church Theme.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className={compact ? "p-4" : "p-5"}>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">{theme.year} CHURCH THEME</p>
        <p className={`mt-2 font-medium leading-relaxed ${compact ? "text-base" : "text-lg"}`}>
          “{theme.title}”
        </p>
        {theme.scripture ? <p className="mt-2 text-sm text-muted-foreground">{theme.scripture}</p> : null}
        {!compact && theme.description ? <p className="mt-2 text-sm text-muted-foreground">{theme.description}</p> : null}
      </CardContent>
    </Card>
  );
}
