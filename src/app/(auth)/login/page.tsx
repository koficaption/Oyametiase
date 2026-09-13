import { BrandShell } from "@/components/brand/brand-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getActiveTheme } from "@/lib/data/themes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const theme = isSupabaseConfigured() ? await getActiveTheme(await createClient()) : null;

  return (
    <BrandShell
      title="Oyame Tiase Assembly"
      themeYear={theme?.year}
      themeTitle={theme?.title}
      themeScripture={theme?.scripture}
      description="Peace be with you. Sign in to serve Oyame Tiase Assembly."
    >
      {!isSupabaseConfigured() ? (
        <p className="rounded-md border border-cop-gold bg-cop-gold/20 px-3 py-2 text-sm text-cop-navy">
          Supabase environment variables are not configured yet. Copy `.env.example` to
          `.env.local` and add your project keys.
        </p>
      ) : (
        <LoginForm />
      )}
    </BrandShell>
  );
}
