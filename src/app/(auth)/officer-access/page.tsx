import Link from "next/link";
import { BrandShell } from "@/components/brand/brand-shell";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { requireSignupAccount } from "@/lib/auth/session";
import { isApprovedAccount } from "@/lib/church-directory";
import { ASSEMBLY_NAME } from "@/lib/assembly";
import { isOfficerRole, ROLE_LABELS } from "@/types/roles";
import { redirect } from "next/navigation";

export const metadata = { title: "Officer access" };

export default async function OfficerAccessPage() {
  const user = await requireSignupAccount();
  if (
    isOfficerRole(user.profile.role_slug) &&
    isApprovedAccount(user.profile.account_status, user.profile.approval_status)
  ) {
    redirect("/app/dashboard");
  }

  return (
    <BrandShell
      title="This system is for church officers"
      description={`Peace be with you, ${user.profile.full_name}. ${ASSEMBLY_NAME} CMS is for the Presiding Elder, Secretary, Treasurer, and ministry leaders only. There is no member portal.`}
    >
      <dl className="space-y-2 rounded-xl border bg-muted/40 p-4 text-left text-base text-cop-navy">
        <div className="flex justify-between gap-3">
          <dt className="text-cop-navy/70">Username</dt>
          <dd>{user.profile.username ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-cop-navy/70">Requested office</dt>
          <dd>{user.profile.church_responsibility ?? user.profile.church_position ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-cop-navy/70">Current access</dt>
          <dd>{ROLE_LABELS[user.profile.role_slug]}</dd>
        </div>
      </dl>
      <p className="mt-4 text-base leading-7 tracking-normal text-cop-navy/85">
        Ask the Presiding Elder to open <strong>Assign officers</strong> in the menu, choose your office, and tap Assign this office. Then sign in again.
      </p>
      <form action={logoutAction} className="mt-4">
        <Button type="submit" className="h-11 w-full text-base">
          Sign out
        </Button>
      </form>
      <p className="mt-4 text-center text-base">
        <Link className="font-medium text-primary underline" href="/login">
          Back to login
        </Link>
      </p>
    </BrandShell>
  );
}
