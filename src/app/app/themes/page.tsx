import { archiveThemeAction, saveChurchThemeAction, setActiveThemeAction } from "@/actions/themes";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/session";
import { listChurchThemes } from "@/lib/data/themes";
import { formAction } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Church Theme" };

export default async function ChurchThemesPage() {
  await requirePermission("themes.manage");
  const supabase = await createClient();
  const themes = await listChurchThemes(supabase, true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annual church theme"
        description="Themes are stored by year so leadership can change them without asking a developer. Only the Presiding Elder can change the official theme."
      />
      <form action={formAction(saveChurchThemeAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <Input name="year" type="number" min={2000} max={2100} placeholder="Year" required />
        <Input name="title" placeholder="Theme title" required />
        <Input name="scripture" placeholder="Theme scripture / reference (optional)" className="md:col-span-2" />
        <Textarea name="description" placeholder="Short description (optional)" className="md:col-span-2" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="is_active" value="true" />
          Set as the active / current year
        </label>
        <Button type="submit">Add theme</Button>
      </form>
      <div className="grid gap-4">
        {themes.map((theme) => (
          <article key={theme.id} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-primary">{theme.year}</p>
                <h2 className="mt-1 text-lg font-semibold">“{theme.title}”</h2>
                {theme.scripture ? <p className="mt-1 text-sm text-muted-foreground">{theme.scripture}</p> : null}
                {theme.description ? <p className="mt-2 text-sm">{theme.description}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(theme.created_at).toLocaleDateString()} · {theme.is_active ? "Active" : "Inactive"}
                  {theme.archived_at ? " · Archived" : ""}
                </p>
              </div>
            </div>
            <form action={formAction(saveChurchThemeAction)} className="grid gap-2 md:grid-cols-2">
              <input type="hidden" name="id" value={theme.id} />
              <Input name="year" type="number" defaultValue={theme.year} required />
              <Input name="title" defaultValue={theme.title} required />
              <Input name="scripture" defaultValue={theme.scripture ?? ""} placeholder="Theme scripture" className="md:col-span-2" />
              <Textarea name="description" defaultValue={theme.description ?? ""} placeholder="Description" className="md:col-span-2" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" value="true" defaultChecked={theme.is_active} />
                Active / current year
              </label>
              <Button type="submit" variant="outline">Save changes</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {!theme.is_active && !theme.archived_at ? (
                <form action={formAction(setActiveThemeAction)}>
                  <input type="hidden" name="id" value={theme.id} />
                  <Button type="submit" variant="outline">Select as current year</Button>
                </form>
              ) : null}
              <form action={formAction(archiveThemeAction)}>
                <input type="hidden" name="id" value={theme.id} />
                <input type="hidden" name="restore" value={theme.archived_at ? "true" : "false"} />
                <Button type="submit" variant="outline">
                  {theme.archived_at ? "Restore theme" : "Archive theme"}
                </Button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
