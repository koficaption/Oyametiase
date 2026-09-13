import { BrandShell } from "@/components/brand/brand-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Request an account" };

export default function RegisterPage() {
  return (
    <BrandShell
      title="Oyame Tiase Assembly"
      description="Request access. Selecting Presiding Elder, Treasurer, or a ministry office does not turn on those permissions. The Presiding Elder reviews every registration."
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
