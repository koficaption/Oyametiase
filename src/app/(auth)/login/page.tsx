import { AssemblyMark } from "@/components/brand/assembly-mark";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.92_0.12_98),_transparent_40%),radial-gradient(circle_at_bottom,_oklch(0.40_0.14_262/_0.18),_transparent_50%)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <AssemblyMark size={88} />
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            The Church of Pentecost
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Oyame Tiase Assembly</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your assigned portal. The Presiding Elder grants office access — you do not
            choose a role here.
          </p>
        </div>
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
