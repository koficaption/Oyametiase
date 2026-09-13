"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { BrandShell } from "@/components/brand/brand-shell";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  return (
    <BrandShell title="Reset your password" description="Enter the email on your assembly account.">
      <form action={action} className="space-y-4">
        <FormStatus state={state} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          Send reset link
        </Button>
        <Link href="/login" className="block text-center text-sm text-cop-blue">
          Back to sign in
        </Link>
      </form>
    </BrandShell>
  );
}
