import { BrandShell } from "@/components/brand/brand-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <BrandShell
      title="Oyame Tiase Assembly"
      description="Request officer access. The first account becomes Presiding Elder. After that, the Presiding Elder assigns Secretary, Treasurer, or a ministry."
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
