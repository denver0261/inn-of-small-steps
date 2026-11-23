import type { LocalDate, Weekday } from "@inn/schema";

const MS_PER_DAY = 86_400_000;

function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) throw new Error(`bad LocalDate: ${date}`);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtcMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: LocalDate): Weekday {
  return (new Date(toUtcMs(date)).getUTCDay() + 6) % 7;
}

export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, -weekday(date));
}

/** Inclusive range of dates from `from` to `to`. Empty when `to` is before `from`. */
export function dateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
