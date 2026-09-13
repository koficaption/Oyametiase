import type { ReportFilters, ReportType } from "@/lib/reports/types";
import { REPORT_TYPES } from "@/lib/reports/types";

export function currentReportYear() {
  return new Date().getUTCFullYear();
}

export function parseReportType(value: string | undefined): ReportType | null {
  if (!value) return null;
  return REPORT_TYPES.includes(value as ReportType) ? (value as ReportType) : null;
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolvePeriod(filters: Pick<ReportFilters, "year" | "month" | "from" | "to">) {
  if (filters.from && filters.to && filters.from <= filters.to) {
    return { from: filters.from, to: filters.to };
  }
  if (filters.month && filters.month >= 1 && filters.month <= 12) {
    const start = new Date(Date.UTC(filters.year, filters.month - 1, 1));
    const end = new Date(Date.UTC(filters.year, filters.month, 0));
    return { from: isoDate(start), to: isoDate(end) };
  }
  return {
    from: `${filters.year}-01-01`,
    to: `${filters.year}-12-31`,
  };
}

export function periodLabel(filters: Pick<ReportFilters, "year" | "month" | "from" | "to">) {
  const { from, to } = resolvePeriod(filters);
  if (filters.from && filters.to) return `${from} to ${to}`;
  if (filters.month) {
    const name = new Date(Date.UTC(filters.year, filters.month - 1, 1)).toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return name;
  }
  return `Year ${filters.year}`;
}

export function ageOn(dateOfBirth: string | null | undefined, onDate: string) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const on = new Date(`${onDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(on.getTime())) return null;
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function money(value: number) {
  return `GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
