export function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function startOfCurrentMonthIso() {
  const date = new Date();
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
}
