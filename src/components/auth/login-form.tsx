"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

const initial: ActionResult = { ok: false };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <FormStatus state={state} />
      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-base font-semibold text-cop-navy">
          Email or username
        </Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          className="h-11 rounded-lg border-cop-navy/25 bg-white text-base text-cop-navy tracking-normal"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-semibold text-cop-navy">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg border-cop-navy/25 bg-white text-base text-cop-navy tracking-normal"
        />
      </div>
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-base tracking-normal">
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
        {" · "}
        <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Forgot password
        </Link>
      </p>
    </form>
  );
}
