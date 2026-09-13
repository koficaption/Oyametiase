"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/actions/auth";
import { BrandShell } from "@/components/brand/brand-shell";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <BrandShell title="Choose a new password" description="Use at least 10 characters.">
      <form action={action} className="space-y-4">
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
    </BrandShell>
  );
}
