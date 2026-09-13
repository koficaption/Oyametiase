import { BrandShell } from "@/components/brand/brand-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <BrandShell
      title="Oyame Tiase Assembly"
      description="Create your church account and sign in. The first account becomes Presiding Elder. After that, new accounts open as members until the Presiding Elder assigns an office."
    >
      {!isSupabaseConfigured() ? (
        <p className="rounded-md border border-cop-gold bg-cop-gold/20 px-3 py-2 text-sm text-cop-navy">
          Supabase environment variables are not configured yet.
        </p>
      ) : (
        <RegisterForm />
      )}
    </BrandShell>
  );
}
