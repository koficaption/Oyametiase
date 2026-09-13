import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.95_0.03_25),_transparent_45%)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          The Church of Pentecost
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Oyame Tiase Assembly</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage the local assembly. Access is granted by the Presiding Elder.
        </p>
        {!isSupabaseConfigured() ? (
          <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Supabase environment variables are not configured yet. Copy `.env.example` to
            `.env.local` and add your project keys.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
