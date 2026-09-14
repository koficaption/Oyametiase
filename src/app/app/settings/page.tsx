import Link from "next/link";
import { savePositionAction, saveSettingsAction } from "@/actions/admin";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSEMBLY_NAME, CHURCH_NAME } from "@/lib/assembly";
import { requirePermission } from "@/lib/auth/session";
import { getAssembly } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { formAction } from "@/lib/forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const supabase = await createClient();
  const assembly = await getAssembly(supabase);
  const { data: positions } = await supabase.from("positions").select("*").order("name");

  return (
    <div className="space-y-6">
      <PageHeader title="Assembly settings" description={`Configurable local assembly identity. Defaults to ${CHURCH_NAME}, ${ASSEMBLY_NAME}.`} />
      <p className="rounded-xl border bg-card p-4 text-sm">
        Manage the official annual theme from{" "}
        <Link className="underline" href="/app/themes">Church Theme</Link>
        . It is stored by year and used automatically on the dashboard and reports.
      </p>
      <form action={formAction(saveSettingsAction)} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <Input name="church_name" defaultValue={assembly?.church_name ?? CHURCH_NAME} />
        <Input name="assembly_name" defaultValue={assembly?.assembly_name ?? ASSEMBLY_NAME} />
        <Input name="phone" defaultValue={assembly?.phone ?? ""} placeholder="Phone" />
        <Input name="email" defaultValue={assembly?.email ?? ""} placeholder="Email" />
        <Input name="location" defaultValue={assembly?.location ?? ""} placeholder="Location" />
        <Input name="address" defaultValue={assembly?.address ?? ""} placeholder="Address" />
        <Button type="submit">Save settings</Button>
      </form>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Positions</h2>
        <ul className="mb-4 text-sm">
          {positions?.map((position) => <li key={position.id}>{position.name}</li>)}
        </ul>
        <form action={formAction(savePositionAction)} className="flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder="New position" required />
          <Input name="description" placeholder="Description" />
          <Button type="submit" variant="outline">Add position</Button>
        </form>
      </section>
    </div>
  );
}
