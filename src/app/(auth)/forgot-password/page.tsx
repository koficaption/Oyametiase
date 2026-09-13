"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <FormStatus state={state} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          Send reset link
        </Button>
        <Link href="/login" className="block text-center text-sm text-primary">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
