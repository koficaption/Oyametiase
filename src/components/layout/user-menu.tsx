import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type RoleSlug } from "@/types/roles";
import { formAction } from "@/lib/forms";

export function UserMenu({ name, role }: { name: string; role: RoleSlug }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</div>
      </div>
      <form action={formAction(logoutAction)}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
