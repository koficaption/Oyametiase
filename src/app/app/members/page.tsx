import Link from "next/link";
import { MemberActions } from "@/components/members/member-actions";
import { requirePermission, userPortal } from "@/lib/auth/session";
import { searchMembers } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/types/roles";
import { memberFullName } from "@/types/database";

export const metadata = { title: "Members" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("members.view");
  const portal = userPortal(user);
  const registerTitle =
    portal === "womens" ? "Women Members" : portal === "mens" ? "Men Members" : portal === "youth" ? "Youth Members" : "Members";
  const registerDescription =
    portal === "presiding_elder" || portal === "secretary"
      ? "Assembly membership register. Department leaders only see their own ministry."
      : "Members assigned to your ministry only. You cannot open another department's register.";
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const department = typeof params.department === "string" ? params.department : undefined;
  const gender = typeof params.gender === "string" ? params.gender : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const visibility = params.visibility === "removed" || params.visibility === "all" ? params.visibility : "active";
  const page = Number(params.page ?? 1);
  const canManage = hasPermission(user.profile.role_slug, "members.manage");
  const canDeleteForever = hasPermission(user.profile.role_slug, "users.manage");
  const supabase = await createClient();
  let memberIds: string[] | undefined;
  if (user.profile.role_slug === "department_leader") {
    const { data: links } = await supabase
      .from("department_members")
      .select("member_id")
      .in("department_id", user.ledDepartmentIds.length ? user.ledDepartmentIds : ["00000000-0000-0000-0000-000000000000"]);
    memberIds = (links ?? []).map((row) => row.member_id);
  }
  const { data: departments } = await supabase.from("departments").select("id, name").eq("is_active", true);
  const { data, count } = await searchMembers(supabase, { q, department, gender, status, page, memberIds, visibility });

  return (
    <div className="space-y-6">
      <PageHeader
        title={registerTitle}
        description={registerDescription}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/app/members/new">Register member</Link>
            </Button>
          ) : null
        }
      />
      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6">
        <Input name="q" placeholder="Search name or member ID" defaultValue={q} />
        <select name="department" defaultValue={department ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All departments</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <select name="gender" defaultValue={gender ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="">All statuses</option>
          {["active", "inactive", "visitor", "new_convert", "transferred", "deceased", "other"].map((item) => (
            <option key={item} value={item}>
              {item.replace("_", " ")}
            </option>
          ))}
        </select>
        <select name="visibility" defaultValue={visibility} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="active">Active register</option>
          <option value="removed">Removed members</option>
          <option value="all">Everyone</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {!data?.length ? (
        <EmptyState title="No members found" description="Adjust filters or register a new member." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Department</th>
                  {canManage ? <th className="px-4 py-3">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {data.map((member) => {
                  const dept = Array.isArray(member.departments) ? member.departments[0] : member.departments;
                  return (
                    <tr key={member.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">{member.member_code}</td>
                      <td className="px-4 py-3">
                        <Link className="font-medium hover:underline" href={`/app/members/${member.id}`}>
                          {memberFullName(member)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize">{member.gender}</td>
                      <td className="px-4 py-3 capitalize">{member.membership_status.replace("_", " ")}</td>
                      <td className="px-4 py-3">{dept?.name ?? "—"}</td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <MemberActions
                            id={member.id}
                            archived={Boolean(member.archived_at)}
                            canManage={canManage}
                            canDeleteForever={canDeleteForever}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {data.map((member) => (
              <div key={member.id} className="space-y-3 rounded-xl border bg-card p-4">
                <Link href={`/app/members/${member.id}`}>
                  <div className="font-medium">{memberFullName(member)}</div>
                  <div className="text-xs text-muted-foreground">{member.member_code}</div>
                  <div className="mt-2 text-sm capitalize">{member.membership_status.replace("_", " ")}</div>
                </Link>
                <MemberActions
                  id={member.id}
                  archived={Boolean(member.archived_at)}
                  canManage={canManage}
                  canDeleteForever={canDeleteForever}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{count ?? 0} records</p>
        </>
      )}
    </div>
  );
}
