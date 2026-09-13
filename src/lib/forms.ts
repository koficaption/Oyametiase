type ServerFormAction = ((formData: FormData) => Promise<unknown>) | (() => Promise<unknown>);

/** Preserve the Server Action reference. Wrapping it in a new function breaks RSC serialization. */
export function formAction(action: ServerFormAction): (formData: FormData) => Promise<void> {
  return action as (formData: FormData) => Promise<void>;
}

export function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function opt(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? value : undefined;
}

export function emptyToNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
