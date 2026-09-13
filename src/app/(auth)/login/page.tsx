import { BrandShell } from "@/components/brand/brand-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <BrandShell
      title="Oyame Tiase Assembly"
      description="Sign in with your email or username. New accounts wait for Presiding Elder approval before any portal opens."
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
