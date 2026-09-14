"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/components/ui/field-select";
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
        <legend className="text-base font-semibold text-cop-navy">Personal information</legend>
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-base font-semibold text-cop-navy">Full name</Label>
          <Input id="full_name" name="full_name" required />
          <FieldError errors={state.fieldErrors?.full_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username" className="text-base font-semibold text-cop-navy">Username</Label>
          <Input id="username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          <FieldError errors={state.fieldErrors?.username} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth" className="text-base font-semibold text-cop-navy">Date of birth</Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" required />
          <FieldError errors={state.fieldErrors?.date_of_birth} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold text-cop-navy">Email address</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold text-cop-navy">Phone number</Label>
          <Input id="phone" name="phone" type="tel" required />
          <FieldError errors={state.fieldErrors?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp_number" className="text-base font-semibold text-cop-navy">WhatsApp number</Label>
          <Input id="whatsapp_number" name="whatsapp_number" type="tel" required />
          <FieldError errors={state.fieldErrors?.whatsapp_number} />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-cop-navy">Church information</legend>
        <p className="text-sm leading-6 tracking-normal text-cop-navy/80">
          Position is your official standing. Responsibility is the work you currently do. This system is for officers only. The Presiding Elder assigns Secretary, Treasurer, or a ministry.
        </p>
        <div className="space-y-2">
          <Label htmlFor="church_position" className="text-base font-semibold text-cop-navy">Position at church</Label>
          <FieldSelect id="church_position" name="church_position" required>
            <option value="">Select position</option>
            {CHURCH_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </FieldSelect>
          <FieldError errors={state.fieldErrors?.church_position} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="church_responsibility" className="text-base font-semibold text-cop-navy">Role / responsibility</Label>
          <FieldSelect id="church_responsibility" name="church_responsibility" required>
            {CHURCH_RESPONSIBILITIES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </FieldSelect>
          <FieldError errors={state.fieldErrors?.church_responsibility} />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-cop-navy">Password</legend>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold text-cop-navy">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-base font-semibold text-cop-navy">Confirm password</Label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.confirm} />
        </div>
      </fieldset>
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-base tracking-normal">
        Already registered?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
