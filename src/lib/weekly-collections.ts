export const WEEKLY_CHURCH_REF = "WEEKLY-CHURCH";
export const WEEKLY_SUNDAY_SCHOOL_REF = "WEEKLY-SUNDAY-SCHOOL";
export const SUNDAY_SCHOOL_CATEGORY_SLUG = "sunday-school-offerings";

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekdayLabel = (typeof WEEKDAY_LABELS)[number];

export type WeekDay = {
  iso: string;
  label: WeekdayLabel;
  shortLabel: string;
  isSunday: boolean;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(iso: string) {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  if (toIsoDate(date) !== iso) return null;
  return date;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate() {
  return toIsoDate(new Date());
}

/** Monday of the week that contains `iso`. Sunday belongs to the week that started the previous Monday. */
export function mondayOfWeek(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return null;
  const weekday = date.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - daysFromMonday);
  return toIsoDate(date);
}

export function shiftWeek(mondayIso: string, weeks: number) {
  const monday = parseIsoDate(mondayIso);
  if (!monday) return null;
  monday.setDate(monday.getDate() + weeks * 7);
  return toIsoDate(monday);
}

export function weekDays(mondayIso: string): WeekDay[] {
  const monday = parseIsoDate(mondayOfWeek(mondayIso) ?? "");
  if (!monday) return [];
  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const iso = toIsoDate(date);
    return {
      iso,
      label,
      shortLabel: `${label.slice(0, 3)} ${date.getDate()}`,
      isSunday: index === 6,
    };
  });
}

export function parseMoneyInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

/** Sunday school (children) is collected on Sunday only. */
export function sundaySchoolForDay(isSunday: boolean, amount: number) {
  return isSunday ? amount : 0;
}

export function normalizeWeekLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

const CLOCK_TIME = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** Empty string if blank; HH:MM if valid; null if invalid. */
export function normalizeWeekTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = CLOCK_TIME.exec(trimmed);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function weekTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  return normalizeWeekTime(value) ?? "";
}

export function sundayOfWeek(mondayIso: string) {
  return weekDays(mondayIso)[6]?.iso ?? mondayIso;
}

export function formatClockTime(value: string) {
  const time = normalizeWeekTime(value);
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatWeekEventDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWeekMeta(meta: { label?: string; date?: string; time?: string }) {
  const parts: string[] = [];
  const label = normalizeWeekLabel(meta.label ?? "");
  if (label) parts.push(label);
  const dateLabel = meta.date ? formatWeekEventDate(meta.date) : "";
  if (dateLabel) parts.push(dateLabel);
  const timeLabel = meta.time ? formatClockTime(meta.time) : "";
  if (timeLabel) parts.push(timeLabel);
  return parts.join(" · ");
}

export function weekTotals(days: { church: number; sundaySchool: number; isSunday?: boolean }[]) {
  const church = days.reduce((sum, day) => sum + day.church, 0);
  const sundaySchool = days.reduce(
    (sum, day) => sum + sundaySchoolForDay(day.isSunday ?? true, day.sundaySchool),
    0,
  );
  return {
    church,
    sundaySchool,
    combined: church + sundaySchool,
  };
}

export function formatWeekRange(mondayIso: string) {
  const days = weekDays(mondayIso);
  if (days.length !== 7) return "";
  const first = parseIsoDate(days[0].iso);
  const last = parseIsoDate(days[6].iso);
  if (!first || !last) return "";
  const sameMonth = first.getMonth() === last.getMonth();
  const firstLabel = first.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const lastLabel = last.toLocaleDateString("en-GB", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: "numeric",
  });
  return `${firstLabel} – ${lastLabel}`;
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function parseMonthKey(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const start = parseIsoDate(`${value}-01`);
  if (!start) return null;
  if (monthKey(toIsoDate(start)) !== value) return null;
  return value;
}

export function monthBounds(month: string) {
  const key = parseMonthKey(month);
  if (!key) return null;
  const startDate = parseIsoDate(`${key}-01`);
  if (!startDate) return null;
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  return { start: toIsoDate(startDate), end: toIsoDate(endDate) };
}

export function formatMonthName(month: string) {
  const bounds = monthBounds(month);
  if (!bounds) return "";
  const date = parseIsoDate(bounds.start);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function inMonth(iso: string, month: string) {
  return iso.startsWith(month);
}

export function shiftMonth(month: string, months: number) {
  const bounds = monthBounds(month);
  if (!bounds) return null;
  const date = parseIsoDate(bounds.start);
  if (!date) return null;
  date.setMonth(date.getMonth() + months);
  return monthKey(toIsoDate(date));
}

export type MonthGridDay = {
  iso: string;
  inMonth: boolean;
  isSunday: boolean;
  dayOfMonth: number;
  label: WeekdayLabel;
};

/** Monday-start calendar weeks covering every day of `month`. */
export function monthGrid(month: string): MonthGridDay[][] {
  const bounds = monthBounds(month);
  if (!bounds) return [];
  const startMonday = mondayOfWeek(bounds.start);
  const endMonday = mondayOfWeek(bounds.end);
  if (!startMonday || !endMonday) return [];
  const weeks: MonthGridDay[][] = [];
  let monday = startMonday;
  while (monday <= endMonday) {
    weeks.push(
      weekDays(monday).map((day) => ({
        iso: day.iso,
        inMonth: inMonth(day.iso, month),
        isSunday: day.isSunday,
        dayOfMonth: Number(day.iso.slice(8, 10)),
        label: day.label,
      })),
    );
    const next = shiftWeek(monday, 1);
    if (!next || next <= monday) break;
    monday = next;
  }
  return weeks;
}

export type WeekMeta = { label: string; date: string; time: string };

export function emptyWeekMeta(): WeekMeta {
  return { label: "", date: "", time: "" };
}

export function encodeWeekMeta(description: string, meta: WeekMeta) {
  const label = normalizeWeekLabel(meta.label);
  const date = parseIsoDate(meta.date) ? meta.date : "";
  const time = normalizeWeekTime(meta.time) ?? "";
  if (!label && !date && !time) return description;
  return [description, label, date, time].filter(Boolean).join(" | ");
}

export function parseWeekMetaFromDescription(description: string | null | undefined): WeekMeta {
  const meta = emptyWeekMeta();
  if (!description) return meta;
  const parts = description.split(" | ").map((part) => part.trim()).filter(Boolean);
  for (const part of parts.slice(1)) {
    if (parseIsoDate(part)) meta.date = part;
    else if (normalizeWeekTime(part)) meta.time = normalizeWeekTime(part) ?? "";
    else if (!meta.label) meta.label = normalizeWeekLabel(part);
  }
  return meta;
}

export function firstWeekMeta(descriptions: (string | null | undefined)[]) {
  for (const description of descriptions) {
    const meta = parseWeekMetaFromDescription(description);
    if (meta.label || meta.date || meta.time) return meta;
  }
  return emptyWeekMeta();
}

export type MonthDayAmount = { iso: string; church: number; sundaySchool: number };

export function overlayMonthDayAmounts({
  savedDays,
  originalDays,
  liveDays,
}: {
  savedDays: MonthDayAmount[];
  originalDays: MonthDayAmount[];
  liveDays: MonthDayAmount[];
}): MonthDayAmount[] {
  const map = new Map<string, MonthDayAmount>();
  function apply(day: MonthDayAmount, factor: 1 | -1) {
    const current = map.get(day.iso) ?? { iso: day.iso, church: 0, sundaySchool: 0 };
    current.church += factor * day.church;
    current.sundaySchool += factor * day.sundaySchool;
    map.set(day.iso, current);
  }
  for (const day of savedDays) apply(day, 1);
  for (const day of originalDays) apply(day, -1);
  for (const day of liveDays) apply(day, 1);
  return [...map.values()].filter((day) => day.church !== 0 || day.sundaySchool !== 0);
}

export function monthTotalsFromEntries(entries: MonthDayAmount[], month: string) {
  return weekTotals(
    entries
      .filter((entry) => inMonth(entry.iso, month))
      .map((entry) => ({ church: entry.church, sundaySchool: entry.sundaySchool, isSunday: true })),
  );
}

export function liveMonthTotals({
  month,
  savedMonth,
  originalDays,
  liveDays,
}: {
  month: string;
  savedMonth: { church: number; sundaySchool: number };
  originalDays: MonthDayAmount[];
  liveDays: MonthDayAmount[];
}) {
  let church = savedMonth.church;
  let sundaySchool = savedMonth.sundaySchool;
  for (const day of originalDays) {
    if (!inMonth(day.iso, month)) continue;
    church -= day.church;
    sundaySchool -= day.sundaySchool;
  }
  for (const day of liveDays) {
    if (!inMonth(day.iso, month)) continue;
    church += day.church;
    sundaySchool += day.sundaySchool;
  }
  return {
    church,
    sundaySchool,
    combined: church + sundaySchool,
  };
}
