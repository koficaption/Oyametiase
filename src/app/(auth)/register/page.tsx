import { BrandShell } from "@/components/brand/brand-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { ASSEMBLY_NAME } from "@/lib/assembly";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <BrandShell
      title={ASSEMBLY_NAME}
      description="Request officer access. The first account becomes Presiding Elder. After that, open Assign officers in the Presiding Elder menu."
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
