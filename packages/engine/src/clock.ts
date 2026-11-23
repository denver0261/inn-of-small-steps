import type { LocalDate } from "@inn/schema";

/**
 * The only source of "now" anywhere in the codebase. Engine rules never read the time:
 * callers resolve a LocalDate here and pass it in. Tests and the dev "skip to tomorrow"
 * button use a FakeClock.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export class FakeClock implements Clock {
  private ms: number;

  constructor(start: Date) {
    this.ms = start.getTime();
  }

  now(): Date {
    return new Date(this.ms);
  }

  advanceHours(hours: number): void {
    this.ms += hours * 3_600_000;
  }

  advanceDays(days: number): void {
    this.advanceHours(days * 24);
  }
}

/** Days close at 4:00 local: anything before then still belongs to the previous day. */
export const DAY_ROLLOVER_HOUR = 4;

/** The game day `clock` is in, for a player in `timeZone` (an IANA name). */
export function gameDate(clock: Clock, timeZone: string): LocalDate {
  return gameDateAt(clock.now(), timeZone);
}

/** The game day an instant falls on, for a player in `timeZone`. */
export function gameDateAt(instant: Date, timeZone: string): LocalDate {
  const shifted = new Date(instant.getTime() - DAY_ROLLOVER_HOUR * 3_600_000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}
