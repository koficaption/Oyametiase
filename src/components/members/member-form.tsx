"use client";

import { useActionState } from "react";
import { createMemberAction, updateMemberAction } from "@/actions/members";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/validations/common";
import type { MemberRecord } from "@/types/database";

const initial: ActionResult = { ok: false };

export function MemberForm({
  member,
  departments,
  canEditSensitive,
}: {
  member?: MemberRecord;
  departments: { id: string; name: string }[];
  canEditSensitive: boolean;
}) {
  const action = member ? updateMemberAction : createMemberAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      <FormStatus state={state} />
      <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold">Personal information</h2>
        <Field label="First name" name="first_name" defaultValue={member?.first_name} required />
        <Field label="Middle name" name="middle_name" defaultValue={member?.middle_name ?? ""} />
        <Field label="Last name" name="last_name" defaultValue={member?.last_name} required />
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select id="gender" name="gender" defaultValue={member?.gender ?? "male"} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        {canEditSensitive ? (
          <>
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={member?.date_of_birth ?? ""} />
            <Field label="Phone" name="phone" defaultValue={member?.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={member?.email ?? ""} />
            <Field label="Occupation" name="occupation" defaultValue={member?.occupation ?? ""} />
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="residential_address">Residential address</Label>
              <Textarea id="residential_address" name="residential_address" defaultValue={member?.residential_address ?? ""} />
            </div>
          </>
        ) : null}
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-semibold">Church information</h2>
        <Field label="Date joined" name="date_joined" type="date" defaultValue={member?.date_joined ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="membership_status">Membership status</Label>
          <select id="membership_status" name="membership_status" defaultValue={member?.membership_status ?? "active"} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            {["active", "inactive", "visitor", "new_convert", "transferred", "deceased", "other"].map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="baptism_status">Baptism status</Label>
          <select id="baptism_status" name="baptism_status" defaultValue={member?.baptism_status ?? "unknown"} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="baptized">Baptized</option>
            <option value="not_baptized">Not baptized</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <Field label="Baptism date" name="baptism_date" type="date" defaultValue={member?.baptism_date ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="primary_department_id">Department</Label>
          <select id="primary_department_id" name="primary_department_id" defaultValue={member?.primary_department_id ?? ""} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Unassigned</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        {canEditSensitive ? (
          <>
            <Field label="Previous assembly" name="previous_assembly" defaultValue={member?.previous_assembly ?? ""} />
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Pastoral notes</Label>
              <Textarea id="notes" name="notes" defaultValue={member?.notes ?? ""} />
            </div>
          </>
        ) : null}
      </section>
      {canEditSensitive ? (
        <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold">Emergency information</h2>
          <Field label="Emergency contact" name="emergency_contact_name" defaultValue={member?.emergency_contact_name ?? ""} />
          <Field label="Relationship" name="emergency_relationship" defaultValue={member?.emergency_relationship ?? ""} />
          <Field label="Emergency phone" name="emergency_phone" defaultValue={member?.emergency_phone ?? ""} />
        </section>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : member ? "Save member" : "Register member"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
