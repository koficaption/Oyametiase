import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PORTAL_LABELS, type PortalKind } from "@/types/portals";

export function UserMenu({ name, portal }: { name: string; portal: PortalKind }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{PORTAL_LABELS[portal]}</div>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
