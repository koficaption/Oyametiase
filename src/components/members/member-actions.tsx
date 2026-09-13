import { archiveMemberAction, deleteMemberPermanentlyAction, restoreMemberAction } from "@/actions/members";
import { ConfirmForm } from "@/components/shared/confirm-form";
import { formAction } from "@/lib/forms";

export function MemberActions({
  id,
  archived,
  canManage,
  canDeleteForever,
}: {
  id: string;
  archived: boolean;
  canManage: boolean;
  canDeleteForever?: boolean;
}) {
  if (!canManage) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {archived ? (
        <ConfirmForm
          action={formAction(restoreMemberAction)}
          title="Restore this member?"
          description="They will appear on the active register again."
          triggerLabel="Restore"
          confirmLabel="Restore"
          variant="outline"
          hiddenFields={{ id }}
        />
      ) : (
        <ConfirmForm
          action={formAction(archiveMemberAction)}
          title="Remove this member?"
          description="They leave the active register. Attendance and pastoral notes are kept. You can restore them later."
          triggerLabel="Remove"
          confirmLabel="Remove"
          hiddenFields={{ id }}
        />
      )}
      {canDeleteForever && archived ? (
        <ConfirmForm
          action={formAction(deleteMemberPermanentlyAction)}
          title="Delete this member forever?"
          description="This cannot be undone. Use only for a duplicate or a record created by mistake."
          triggerLabel="Delete forever"
          confirmLabel="Delete forever"
          hiddenFields={{ id }}
        />
      ) : null}
    </div>
  );
}
