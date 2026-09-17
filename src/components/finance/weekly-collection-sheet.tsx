"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveWeeklyCollectionsAction } from "@/actions/operations";
import { FormStatus } from "@/components/shared/form-status";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWeekRange, weekTotals, type WeekDay } from "@/lib/weekly-collections";
import type { ActionResult } from "@/lib/validations/common";

export type WeeklyDayAmounts = WeekDay & {
  church: number;
  sundaySchool: number;
};

const initial: ActionResult = { ok: false };

function money(value: number) {
  return `GHS ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayAmount(value: number) {
  return value > 0 ? String(value) : "";
}

export function WeeklyCollectionSheet({
  weekStart,
  prevWeek,
  nextWeek,
  days,
  canWrite,
  filterLinks,
}: {
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  days: WeeklyDayAmounts[];
  canWrite: boolean;
  filterLinks: { href: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveWeeklyCollectionsAction, initial);
  const [church, setChurch] = useState(() => Object.fromEntries(days.map((day) => [day.iso, displayAmount(day.church)])));
  const [sundaySchool, setSundaySchool] = useState(() =>
    Object.fromEntries(days.map((day) => [day.iso, displayAmount(day.sundaySchool)])),
  );

  const parsedDays = useMemo(
    () =>
      days.map((day) => ({
        church: Number(church[day.iso] || 0) || 0,
        sundaySchool: Number(sundaySchool[day.iso] || 0) || 0,
      })),
    [church, days, sundaySchool],
  );
  const totals = weekTotals(parsedDays);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly collections"
        description="Enter Monday to Saturday as they come in. On Sunday add the church offering and Sunday school (children) offering. The Sunday total and the week total add them together."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/app/finance/weekly?week=${prevWeek}`}>Previous week</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/app/finance/weekly?week=${nextWeek}`}>Next week</Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {filterLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={link.href === "/app/finance/weekly" ? "page" : undefined}
            className={`rounded-full border px-3 py-1 hover:bg-muted ${
              link.href === "/app/finance/weekly" ? "border-cop-blue bg-cop-blue text-white" : ""
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="text-base font-medium text-cop-navy">Week of {formatWeekRange(weekStart)}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Church this week" value={money(totals.church)} />
        <StatCard label="Sunday school this week" value={money(totals.sundaySchool)} />
        <StatCard label="Week total" value={money(totals.combined)} />
      </div>
      {canWrite ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="week_start" value={weekStart} />
          <FormStatus state={state} />
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2"> </th>
                  {days.map((day) => (
                    <th
                      key={day.iso}
                      className={`px-3 py-2 ${day.isSunday ? "bg-cop-gold/20 text-cop-navy" : ""}`}
                    >
                      <div>{day.label}</div>
                      <div className="text-xs font-normal text-muted-foreground">{day.iso.slice(8)}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2">Week total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <th className="px-3 py-3 text-left font-medium">Church</th>
                  {days.map((day) => (
                    <td key={day.iso} className={`px-2 py-2 ${day.isSunday ? "bg-cop-gold/10" : ""}`}>
                      <label className="sr-only" htmlFor={`church_${day.iso}`}>
                        Church money for {day.label}
                      </label>
                      <Input
                        id={`church_${day.iso}`}
                        name={`church_${day.iso}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={church[day.iso]}
                        onChange={(event) =>
                          setChurch((current) => ({ ...current, [day.iso]: event.target.value }))
                        }
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 font-medium">{money(totals.church)}</td>
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-3 text-left font-medium">Sunday school</th>
                  {days.map((day) => (
                    <td key={day.iso} className={`px-2 py-2 ${day.isSunday ? "bg-cop-gold/10" : ""}`}>
                      <label className="sr-only" htmlFor={`sunday_school_${day.iso}`}>
                        Sunday school money for {day.label}
                      </label>
                      <Input
                        id={`sunday_school_${day.iso}`}
                        name={`sunday_school_${day.iso}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={sundaySchool[day.iso]}
                        onChange={(event) =>
                          setSundaySchool((current) => ({ ...current, [day.iso]: event.target.value }))
                        }
                        placeholder={day.isSunday ? "Children" : "0"}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 font-medium">{money(totals.sundaySchool)}</td>
                </tr>
                <tr className="border-t bg-muted/30">
                  <th className="px-3 py-3 text-left font-medium">Day total</th>
                  {parsedDays.map((day, index) => (
                    <td
                      key={days[index].iso}
                      className={`px-3 py-3 font-medium ${days[index].isSunday ? "bg-cop-gold/20 text-cop-navy" : ""}`}
                    >
                      {money(day.church + day.sundaySchool)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-base font-semibold text-cop-navy">{money(totals.combined)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-6 text-cop-navy/80">
            Sunday school is the children&apos;s offering. On Sunday it is added to the church amount so the
            Sunday total is church + Sunday school, the way the assembly used to combine them.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving week..." : "Save this week"}
          </Button>
        </form>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2"> </th>
                {days.map((day) => (
                  <th key={day.iso} className={`px-3 py-2 ${day.isSunday ? "bg-cop-gold/20" : ""}`}>
                    {day.label}
                  </th>
                ))}
                <th className="px-3 py-2">Week total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <th className="px-3 py-3 text-left font-medium">Church</th>
                {days.map((day) => (
                  <td key={day.iso} className="px-3 py-3">
                    {money(day.church)}
                  </td>
                ))}
                <td className="px-3 py-3 font-medium">{money(totals.church)}</td>
              </tr>
              <tr className="border-t">
                <th className="px-3 py-3 text-left font-medium">Sunday school</th>
                {days.map((day) => (
                  <td key={day.iso} className="px-3 py-3">
                    {money(day.sundaySchool)}
                  </td>
                ))}
                <td className="px-3 py-3 font-medium">{money(totals.sundaySchool)}</td>
              </tr>
              <tr className="border-t bg-muted/30">
                <th className="px-3 py-3 text-left font-medium">Day total</th>
                {days.map((day) => (
                  <td key={day.iso} className={`px-3 py-3 font-medium ${day.isSunday ? "bg-cop-gold/20" : ""}`}>
                    {money(day.church + day.sundaySchool)}
                  </td>
                ))}
                <td className="px-3 py-3 text-base font-semibold">{money(totals.combined)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
