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

export function weekTotals(days: { church: number; sundaySchool: number }[]) {
  const church = days.reduce((sum, day) => sum + day.church, 0);
  const sundaySchool = days.reduce((sum, day) => sum + day.sundaySchool, 0);
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
