import { MemberForm } from "@/components/members/member-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Register member" };

export default async function NewMemberPage() {
  await requirePermission("members.manage");
  const supabase = await createClient();
  const { data: departments } = await supabase.from("departments").select("id, name").eq("is_active", true);
  return (
    <div className="space-y-6">
      <PageHeader title="Register member" description="Create a new assembly membership record." />
      <MemberForm departments={departments ?? []} canEditSensitive />
    </div>
  );
}
