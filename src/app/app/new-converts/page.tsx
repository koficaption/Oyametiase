import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { memberFullName } from "@/types/database";

export const metadata = { title: "New converts" };

export default async function NewConvertsPage() {
  await requirePermission("followups.view");
  const supabase = await createClient();
  const [{ data: converts }, { data: followups }] = await Promise.all([
    supabase.from("members").select("id, first_name, last_name, member_code, date_joined, membership_status").eq("membership_status", "new_convert").is("archived_at", null).order("date_joined", { ascending: false }),
    supabase.from("member_followups").select("id, status, follow_up_type, members(first_name, last_name)").eq("follow_up_type", "new_convert").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New converts"
        description="The Secretary tracks new-convert records and follow-up. This is not a finance or user-management desk."
      />
      <section className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Member ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {converts?.map((member) => (
              <tr key={member.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{member.member_code}</td>
                <td className="px-3 py-2">
                  <Link className="font-medium hover:underline" href={`/app/members/${member.id}`}>
                    {memberFullName({ ...member, middle_name: null })}
                  </Link>
                </td>
                <td className="px-3 py-2">{member.date_joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">New-convert follow-ups</h2>
        {followups?.map((row) => {
          const member = Array.isArray(row.members) ? row.members[0] : row.members;
          return (
            <div key={row.id} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span>{member ? `${member.first_name} ${member.last_name}` : "Member"}</span>
              <span className="capitalize">{row.status.replace("_", " ")}</span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
