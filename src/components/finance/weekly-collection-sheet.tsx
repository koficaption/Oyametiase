"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveWeeklyCollectionsAction } from "@/actions/operations";
import { FormStatus } from "@/components/shared/form-status";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatMonthName,
  formatWeekMeta,
  formatWeekRange,
  liveMonthTotals,
  mondayOfWeek,
  sundayOfWeek,
  sundaySchoolForDay,
  weekDays,
  weekTimeInputValue,
  weekTotals,
  type WeekDay,
} from "@/lib/weekly-collections";
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

function sheetHref(week: string, month: string) {
  return `/app/finance/weekly?week=${week}&month=${month}`;
}

export function WeeklyCollectionSheet({
  weekStart,
  weekLabel: savedWeekLabel,
  weekDate: savedWeekDate,
  weekTime: savedWeekTime,
  prevWeek,
  nextWeek,
  days,
  month,
  savedMonth,
  canWrite,
  filterLinks,
}: {
  weekStart: string;
  weekLabel: string;
  weekDate: string;
  weekTime: string;
  prevWeek: string;
  nextWeek: string;
  days: WeeklyDayAmounts[];
  month: string;
  savedMonth: { church: number; sundaySchool: number };
  canWrite: boolean;
  filterLinks: { href: string; label: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveWeeklyCollectionsAction, initial);
  const [activeMonday, setActiveMonday] = useState(weekStart);
  const displayDays = weekDays(activeMonday);
  const sundayIso = sundayOfWeek(activeMonday);
  const [weekLabel, setWeekLabel] = useState(savedWeekLabel);
  const [weekDate, setWeekDate] = useState(savedWeekDate || sundayIso);
  const [weekTime, setWeekTime] = useState(weekTimeInputValue(savedWeekTime));
  const [church, setChurch] = useState(() => days.map((day) => displayAmount(day.church)));
  const [sundaySchool, setSundaySchool] = useState(() => {
    const sunday = days.find((day) => day.isSunday);
    return sunday ? displayAmount(sunday.sundaySchool) : "";
  });

  const parsedDays = useMemo(
    () =>
      displayDays.map((day, index) => ({
        iso: day.iso,
        church: Number(church[index] || 0) || 0,
        sundaySchool: sundaySchoolForDay(day.isSunday, Number(sundaySchool || 0) || 0),
        isSunday: day.isSunday,
      })),
    [church, displayDays, sundaySchool],
  );
  const totals = weekTotals(parsedDays);
  const monthTotals = liveMonthTotals({
    month,
    savedMonth,
    originalDays: days.map((day) => ({ iso: day.iso, church: day.church, sundaySchool: day.sundaySchool })),
    liveDays: parsedDays,
  });
  const heading = weekLabel.trim() || "Weekly collections";
  const when = formatWeekMeta({ date: weekDate, time: weekTime });
  const monthName = formatMonthName(month);

  function setDateForDay(picked: string) {
    const monday = mondayOfWeek(picked);
    if (!monday) return;
    const nextSunday = sundayOfWeek(monday);
    setActiveMonday(monday);
    setWeekDate((current) => (current === sundayIso || !current ? nextSunday : current));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly collections"
        description="Set the date under Monday, Tuesday, and the other days. If the week reaches the end of the month, the next days continue into the new month. Name the week if it has one — Youth week, Last supper week, or any name — and add the service time. Sunday school is only on Sunday."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={sheetHref(prevWeek, month)}>Previous week</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={sheetHref(nextWeek, month)}>Next week</Link>
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
      <div>
        <p className="text-base font-medium text-cop-navy">{heading}</p>
        {when ? <p className="text-sm text-cop-navy/80">{when}</p> : null}
        <p className="text-sm text-muted-foreground">Week of {formatWeekRange(activeMonday)}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Church this week" value={money(totals.church)} />
        <StatCard label="Sunday school this week" value={money(totals.sundaySchool)} />
        <StatCard label="Week total" value={money(totals.combined)} />
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <Label htmlFor="month" className="text-base font-semibold text-cop-navy">
          Month to total
        </Label>
        <Input
          id="month"
          name="month"
          type="month"
          value={month}
          onChange={(event) => router.push(sheetHref(activeMonday, event.target.value))}
        />
        <p className="text-sm leading-6 text-cop-navy/80">
          Choose the month you are in, or another month, to add up church and Sunday school for that whole month.
          A week that crosses the end of the month still has a week total; only the days in {monthName || "the chosen month"} go into the month total.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={`Church · ${monthName}`} value={money(monthTotals.church)} />
        <StatCard label={`Sunday school · ${monthName}`} value={money(monthTotals.sundaySchool)} />
        <StatCard label={`Month total · ${monthName}`} value={money(monthTotals.combined)} />
      </div>
      {canWrite ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="week_start" value={activeMonday} />
          <FormStatus state={state} />
          <div className="space-y-3 rounded-xl border p-4">
            <div className="space-y-2">
              <Label htmlFor="week_label" className="text-base font-semibold text-cop-navy">
                What week is this?
              </Label>
              <Input
                id="week_label"
                name="week_label"
                value={weekLabel}
                onChange={(event) => setWeekLabel(event.target.value)}
                placeholder="Youth week"
                maxLength={120}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week_date" className="text-base font-semibold text-cop-navy">
                  Service date
                </Label>
                <Input
                  id="week_date"
                  name="week_date"
                  type="date"
                  value={weekDate}
                  onChange={(event) => setWeekDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="week_time" className="text-base font-semibold text-cop-navy">
                  Time
                </Label>
                <Input
                  id="week_time"
                  name="week_time"
                  type="time"
                  step={60}
                  value={weekTime}
                  onChange={(event) => setWeekTime(event.target.value)}
                />
              </div>
            </div>
            <p className="text-sm leading-6 text-cop-navy/80">
              Optional. Youth week, Last supper week, or any name. The service date and time are for that programme.
              Each day column also has its own date, including when the month ends.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[58rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2"> </th>
                  {displayDays.map((day) => (
                    <th
                      key={day.label}
                      className={`px-3 py-2 ${day.isSunday ? "bg-cop-gold/20 text-cop-navy" : ""}`}
                    >
                      <div>{day.label}</div>
                      <label className="sr-only" htmlFor={`date_${day.label}`}>
                        Date for {day.label}
                      </label>
                      <Input
                        id={`date_${day.label}`}
                        type="date"
                        className="mt-1 min-w-[9.5rem]"
                        value={day.iso}
                        onChange={(event) => setDateForDay(event.target.value)}
                      />
                    </th>
                  ))}
                  <th className="px-3 py-2">Week total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <th className="px-3 py-3 text-left font-medium">Church</th>
                  {displayDays.map((day, index) => (
                    <td key={day.label} className={`px-2 py-2 ${day.isSunday ? "bg-cop-gold/10" : ""}`}>
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
                        value={church[index]}
                        onChange={(event) =>
                          setChurch((current) => current.map((value, i) => (i === index ? event.target.value : value)))
                        }
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 font-medium">{money(totals.church)}</td>
                </tr>
                <tr className="border-t">
                  <th className="px-3 py-3 text-left font-medium">Sunday school</th>
                  {displayDays.map((day) => (
                    <td key={day.label} className={`px-2 py-2 ${day.isSunday ? "bg-cop-gold/10" : ""}`}>
                      {day.isSunday ? (
                        <>
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
                            value={sundaySchool}
                            onChange={(event) => setSundaySchool(event.target.value)}
                            placeholder="Children"
                          />
                        </>
                      ) : (
                        <span className="px-1 text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-3 font-medium">{money(totals.sundaySchool)}</td>
                </tr>
                <tr className="border-t bg-muted/30">
                  <th className="px-3 py-3 text-left font-medium">Day total</th>
                  {parsedDays.map((day) => (
                    <td
                      key={day.iso}
                      className={`px-3 py-3 font-medium ${day.isSunday ? "bg-cop-gold/20 text-cop-navy" : ""}`}
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
            Sunday school is the children&apos;s offering and is only collected on Sunday. The week total adds Monday
            through Sunday. The month total adds every saved day in {monthName || "the chosen month"}.
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
                    <div>{day.label}</div>
                    <div className="text-xs font-normal text-muted-foreground">{day.iso}</div>
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
                    {day.isSunday ? money(day.sundaySchool) : "—"}
                  </td>
                ))}
                <td className="px-3 py-3 font-medium">{money(totals.sundaySchool)}</td>
              </tr>
              <tr className="border-t bg-muted/30">
                <th className="px-3 py-3 text-left font-medium">Day total</th>
                {days.map((day) => (
                  <td key={day.iso} className={`px-3 py-3 font-medium ${day.isSunday ? "bg-cop-gold/20" : ""}`}>
                    {money(day.church + sundaySchoolForDay(day.isSunday, day.sundaySchool))}
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
