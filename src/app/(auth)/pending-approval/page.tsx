import Link from "next/link";
import { BrandShell } from "@/components/brand/brand-shell";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { requireSignupAccount } from "@/lib/auth/session";
import { isApprovedAccount } from "@/lib/church-directory";
import { ROLE_LABELS } from "@/types/roles";
import { redirect } from "next/navigation";

export const metadata = { title: "Account status" };

export default async function PendingApprovalPage() {
  const user = await requireSignupAccount();
  if (isApprovedAccount(user.profile.account_status, user.profile.approval_status)) {
    redirect("/app/dashboard");
  }

  return (
    <BrandShell
      title="Account needs attention"
      description={`Peace be with you, ${user.profile.full_name}. This account is not active. Sign out and contact the assembly if you think this is a mistake.`}
    >
        <dl className="space-y-2 rounded-xl border bg-muted/40 p-4 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Username</dt>
            <dd>{user.profile.username ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Position</dt>
            <dd>{user.profile.church_position ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Responsibility</dt>
            <dd>{user.profile.church_responsibility ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Current system role</dt>
            <dd>{ROLE_LABELS[user.profile.role_slug]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{user.profile.account_status ?? "pending"}</dd>
          </div>
        </dl>
        <form action={logoutAction} className="mt-4">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="mt-4 text-base tracking-normal text-cop-navy/80">
          Go back to <Link className="font-medium underline" href="/login">the login page</Link>.
        </p>
    </BrandShell>
  );
}
