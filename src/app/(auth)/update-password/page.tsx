"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/actions/auth";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <FormStatus state={state} />
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={10} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" minLength={10} required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}
