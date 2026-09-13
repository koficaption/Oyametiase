import { uploadDocumentAction } from "@/actions/admin";
import { ThemeBanner } from "@/components/church/theme-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { getActiveTheme } from "@/lib/data/themes";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  await requirePermission("documents.view");
  const supabase = await createClient();
  const [{ data: documents }, theme] = await Promise.all([
    supabase.from("documents").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    getActiveTheme(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Church documents" description="Private files are stored in Supabase Storage and downloaded through signed access, not public URLs." />
      <ThemeBanner theme={theme} compact />
      <form action={formAction(uploadDocumentAction)} className="grid gap-3 rounded-xl border bg-card p-4">
        <Input name="title" placeholder="Document title" required />
        <input name="file" type="file" required className="text-sm" />
        <div className="grid gap-3 md:grid-cols-2">
          <select name="category" className="h-8 rounded-lg border bg-background px-2 text-sm">
            {["assembly_report", "minutes", "letter", "financial", "member", "program", "administrative", "other"].map((item) => (
              <option key={item} value={item}>{item.replace("_", " ")}</option>
            ))}
          </select>
          <select name="visibility" className="h-8 rounded-lg border bg-background px-2 text-sm">
            {["presiding_elder", "leadership", "finance", "officers", "members", "department"].map((item) => (
              <option key={item} value={item}>{item.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Upload</Button>
      </form>
      <div className="grid gap-3">
        {documents?.map((doc) => (
          <div key={doc.id} className="rounded-xl border bg-card p-4">
            <div className="font-medium">{doc.title}</div>
            <div className="text-sm text-muted-foreground">{doc.category.replace("_", " ")} · {doc.visibility.replace("_", " ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
