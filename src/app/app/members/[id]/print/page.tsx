import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { memberFullName } from "@/types/database";

export default async function PrintMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("members.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
  if (!member) notFound();
  return (
    <div className="mx-auto max-w-2xl bg-white p-10 text-black print:p-0">
      <p className="text-sm uppercase tracking-wide">The Church of Pentecost</p>
      <h1 className="text-2xl font-semibold">Oyame Tiase Assembly</h1>
      <h2 className="mt-6 text-xl">{memberFullName(member)}</h2>
      <p className="font-mono">{member.member_code}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-neutral-500">Status</dt>
          <dd className="capitalize">{member.membership_status.replace("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Gender</dt>
          <dd className="capitalize">{member.gender}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Joined</dt>
          <dd>{member.date_joined ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Baptism</dt>
          <dd className="capitalize">{member.baptism_status.replace("_", " ")}</dd>
        </div>
      </dl>
    </div>
  );
}
