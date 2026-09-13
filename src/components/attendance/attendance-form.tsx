"use client";

import { useActionState, useMemo, useState } from "react";
import { recordAttendanceAction } from "@/actions/attendance";
import { FormStatus } from "@/components/shared/form-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/validations/common";

type Person = { id: string; label: string; kind: "member" | "visitor" };

const initial: ActionResult = { ok: false };

export function AttendanceForm({
  people,
  services,
  departments,
}: {
  people: Person[];
  services: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [walkIn, setWalkIn] = useState("");
  const [selected, setSelected] = useState<Record<string, "present" | "absent" | "excused">>({});
  const [state, action, pending] = useActionState(recordAttendanceAction, initial);
  const filtered = useMemo(
    () => people.filter((person) => person.label.toLowerCase().includes(query.toLowerCase())).slice(0, 80),
    [people, query],
  );

  const records = [
    ...Object.entries(selected).map(([key, status]) => {
      const [kind, id] = key.split(":");
      return kind === "member" ? { member_id: id, status } : { visitor_id: id, status };
    }),
    ...(walkIn.trim() ? [{ visitor_name: walkIn.trim(), status: "present" as const }] : []),
  ];

  return (
    <form action={action} className="space-y-4">
      <FormStatus state={state} />
      <input type="hidden" name="records" value={JSON.stringify(records)} />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="attendance_date">Date</Label>
          <Input id="attendance_date" name="attendance_date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="service_id">Service</Label>
          <select id="service_id" name="service_id" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Select</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="department_id">Department (optional)</Label>
          <select id="department_id" name="department_id" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
            <option value="">Assembly-wide</option>
            {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="walk_in">Walk-in visitor name</Label>
          <Input id="walk_in" value={walkIn} onChange={(event) => setWalkIn(event.target.value)} placeholder="Does not create a member" />
        </div>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members or existing visitors" />
      <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border p-3">
        {filtered.map((person) => {
          const key = `${person.kind}:${person.id}`;
          return (
            <div key={key} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{person.label}</div>
                <div className="text-xs uppercase text-muted-foreground">{person.kind}</div>
              </div>
              <div className="flex gap-2">
                {(["present", "absent", "excused"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={selected[key] === status ? "default" : "outline"}
                    onClick={() => setSelected((current) => ({ ...current, [key]: status }))}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Button type="submit" disabled={pending || records.length === 0}>
        Save attendance
      </Button>
    </form>
  );
}
