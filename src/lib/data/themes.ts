import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChurchThemeRecord } from "@/lib/reports/types";

export async function getThemeForYear(supabase: SupabaseClient, year: number) {
  const { data } = await supabase
    .from("church_themes")
    .select("id, year, title, scripture, description, is_active, archived_at, created_at")
    .eq("year", year)
    .maybeSingle();
  return (data as ChurchThemeRecord | null) ?? null;
}

export async function getActiveTheme(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("church_themes")
    .select("id, year, title, scripture, description, is_active, archived_at, created_at")
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();
  return (data as ChurchThemeRecord | null) ?? null;
}

export async function listChurchThemes(supabase: SupabaseClient, includeArchived = true) {
  let query = supabase
    .from("church_themes")
    .select("id, year, title, scripture, description, is_active, archived_at, created_at")
    .order("year", { ascending: false });
  if (!includeArchived) query = query.is("archived_at", null);
  const { data } = await query;
  return (data ?? []) as ChurchThemeRecord[];
}
