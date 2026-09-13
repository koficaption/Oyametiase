"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHURCH_POSITIONS, CHURCH_RESPONSIBILITIES } from "@/lib/church-directory";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  return (
    <form action={action} className="space-y-6">
      <FormStatus state={state} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Personal information</legend>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
          <FieldError errors={state.fieldErrors?.full_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" required />
          <FieldError errors={state.fieldErrors?.username} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" required />
          <FieldError errors={state.fieldErrors?.date_of_birth} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" required />
          <FieldError errors={state.fieldErrors?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">WhatsApp number</Label>
          <Input id="whatsapp_number" name="whatsapp_number" type="tel" required />
          <FieldError errors={state.fieldErrors?.whatsapp_number} />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Church information</legend>
        <p className="text-xs text-muted-foreground">
          Position is your official standing. Responsibility is the work you currently do. Neither one grants system access until the Presiding Elder approves your account.
        </p>
        <div className="space-y-2">
          <Label htmlFor="church_position">Position at church</Label>
          <select id="church_position" name="church_position" required className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Select position</option>
            {CHURCH_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.church_position} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="church_responsibility">Role / responsibility</Label>
          <select id="church_responsibility" name="church_responsibility" required className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
            {CHURCH_RESPONSIBILITIES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.church_responsibility} />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Password</legend>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.confirm} />
        </div>
      </fieldset>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting..." : "Submit for approval"}
      </Button>
      <p className="text-center text-sm">
        Already registered?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
