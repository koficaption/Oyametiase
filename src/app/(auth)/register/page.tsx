import { AssemblyMark } from "@/components/brand/assembly-mark";
import { RegisterForm } from "@/components/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Request an account" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.92_0.12_98),_transparent_40%),radial-gradient(circle_at_bottom,_oklch(0.40_0.14_262/_0.18),_transparent_50%)] px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <AssemblyMark size={88} />
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            The Church of Pentecost
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Oyame Tiase Assembly</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Request access. Selecting Presiding Elder, Treasurer, or a ministry office does not turn on those permissions. The Presiding Elder reviews every registration.
          </p>
        </div>
        {!isSupabaseConfigured() ? (
          <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase environment variables are not configured yet.
          </p>
        ) : (
          <div className="mt-6">
            <RegisterForm />
          </div>
        )}
      </div>
    </div>
  );
}
