export function formAction(action: (formData: FormData) => Promise<unknown>) {
  return async (formData: FormData): Promise<void> => {
    await action(formData);
  };
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
