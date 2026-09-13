import type { ActionResult } from "@/lib/validations/common";

export function FormStatus({ state }: { state: ActionResult | undefined }) {
  if (!state?.message) return null;
  return (
    <p
      role="status"
      className={
        state.ok
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
          : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {state.message}
    </p>
  );
}
