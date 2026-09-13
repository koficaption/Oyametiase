import Link from "next/link";
import { MemberActions } from "@/components/members/member-actions";
import { canAccessChildren, requirePermission, userPortal } from "@/lib/auth/session";
import { searchMembers } from "@/lib/data/queries";
import {
  MEMBER_GROUPS,
  canChooseMemberGroup,
  defaultMemberGroup,
  isMemberGroupKey,
  memberGroupByKey,
  memberIdsInMinistry,
} from "@/lib/members/groups";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const gender = typeof params.gender === "string" ? params.gender : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const visibility = params.visibility === "removed" || params.visibility === "all" ? params.visibility : "active";
  const page = Number(params.page ?? 1);
  const requestedGroup = typeof params.group === "string" && isMemberGroupKey(params.group) ? params.group : undefined;
  const group = canChooseMemberGroup(portal) ? (requestedGroup ?? defaultMemberGroup(portal)) : defaultMemberGroup(portal);
  const groupMeta = memberGroupByKey(group);
  const registerTitle = canChooseMemberGroup(portal) ? `${groupMeta.label} Members` : (
    portal === "womens" ? "Women Members" : portal === "mens" ? "Men Members" : portal === "youth" ? "Youth Members" : portal === "children" || portal === "children_teacher" ? "Children" : "Members"
  );
  const registerDescription = canChooseMemberGroup(portal)
    ? "Assembly members grouped as Men's, Women's, Youth, and Children."
    : "Members assigned to your ministry only. You cannot open another department's register.";
  const canManage = hasPermission(user.profile.role_slug, "members.manage");
  const canDeleteForever = hasPermission(user.profile.role_slug, "users.manage");
  const showChildrenRegister = group === "children" && canAccessChildren(user);
  const supabase = await createClient();

  let memberIds = await memberIdsInMinistry(supabase, groupMeta.slug);
  if (user.profile.role_slug === "department_leader") {
    const { data: links } = await supabase
      .from("department_members")
      .select("member_id")
      .in("department_id", user.ledDepartmentIds.length ? user.ledDepartmentIds : ["00000000-0000-0000-0000-000000000000"]);
    const scoped = new Set((links ?? []).map((row) => row.member_id));
    memberIds = memberIds.filter((id) => scoped.has(id));
  }

  const [{ data, count }, childrenResult] = await Promise.all([
    searchMembers(supabase, { q, gender, status, page, pageSize: 50, memberIds, visibility }),
    showChildrenRegister
      ? supabase
          .from("ministry_children")
          .select("id, first_name, last_name, gender, class_name")
          .is("archived_at", null)
          .order("last_name")
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; gender: string; class_name: string | null }[] }),
  ]);
  const children = childrenResult.data ?? [];

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
      {canChooseMemberGroup(portal) ? (
        <nav className="flex flex-wrap gap-2" aria-label="Member groups">
          {MEMBER_GROUPS.map((item) => {
            const href = `/app/members?group=${item.key}${q ? `&q=${encodeURIComponent(q)}` : ""}${visibility !== "active" ? `&visibility=${visibility}` : ""}`;
            const active = group === item.key;
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  active ? "border-cop-navy bg-cop-navy text-white" : "hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
        <input type="hidden" name="group" value={group} />
        <Input name="q" placeholder="Search name or member ID" defaultValue={q} />
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

      {showChildrenRegister ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Children's Ministry</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/children">Open children's register</Link>
            </Button>
          </div>
          {!children.length ? (
            <EmptyState title="No children recorded" description="Register a child from the children's page." />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr key={child.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{child.first_name} {child.last_name}</td>
                      <td className="px-4 py-3 capitalize">{child.gender}</td>
                      <td className="px-4 py-3">{child.class_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{children.length} children</p>
        </section>
      ) : null}

      {group === "children" ? <h2 className="text-lg font-semibold">Children's ministry workers</h2> : null}

      {!data?.length ? (
        <EmptyState
          title={group === "children" ? "No workers listed" : "No members found"}
          description={group === "children" ? "Adults assigned to Children's Ministry appear here." : "Adjust filters or register a new member."}
        />
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
