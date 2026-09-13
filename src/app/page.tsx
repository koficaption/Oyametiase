import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getCurrentUser();
  redirect(user ? "/app/dashboard" : "/login");
}
