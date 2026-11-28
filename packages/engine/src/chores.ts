import type { Chore, HabitLog, LocalDate } from "@inn/schema";
import { addDays, daysBetween, weekday } from "./dates.ts";

/**
 * The day a chore is next due, or undefined once a one-off chore is done.
 * Never done: due the day it was added (weekly chores: their first set day from then).
 * Done: `every N` returns N days later; `weekly` returns on its next set day after.
 */
export function dueDate(chore: Chore): LocalDate | undefined {
  const { repeat, lastDoneOn, createdOn } = chore;
  if (repeat === undefined) return lastDoneOn === undefined ? createdOn : undefined;
  if (repeat.kind === "every") return lastDoneOn === undefined ? createdOn : addDays(lastDoneOn, repeat.days);
  let d = lastDoneOn === undefined ? createdOn : addDays(lastDoneOn, 1);
  while (!repeat.days.includes(weekday(d))) d = addDays(d, 1);
  return d;
}

export function isDue(chore: Chore, date: LocalDate): boolean {
  const due = dueDate(chore);
  return due !== undefined && due <= date;
}

/** Whole days past due on `date`; 0 when due today or not due. */
export function overdueDays(chore: Chore, date: LocalDate): number {
  const due = dueDate(chore);
  return due === undefined || due > date ? 0 : daysBetween(due, date);
}

/**
 * The chores to show on `date`: everything due, grouped by room (in `roomOrder`, then
 * any other rooms by id), most overdue first within a room, then by title.
 */
export function dueChores(chores: readonly Chore[], date: LocalDate, roomOrder: readonly string[] = []): Chore[] {
  const rank = (roomId: string) => {
    const i = roomOrder.indexOf(roomId);
    return i === -1 ? roomOrder.length : i;
  };
  return chores
    .filter((c) => isDue(c, date))
    .sort(
      (a, b) =>
        rank(a.roomId) - rank(b.roomId) ||
        a.roomId.localeCompare(b.roomId) ||
        overdueDays(b, date) - overdueDays(a, date) ||
        a.title.localeCompare(b.title),
    );
}

/** Checking off a chore marks it done and logs it, at the chore's size, for whoever did it. */
export function checkOffChore(
  chore: Chore,
  playerId: string,
  date: LocalDate,
  homeHabitId: string,
): { chore: Chore; log: HabitLog } {
  return {
    chore: { ...chore, lastDoneOn: date, lastDoneBy: playerId },
    log: { habitId: homeHabitId, date, kind: "full", tier: chore.size, source: "tap", choreId: chore.id },
  };
}

/**
 * How a real room's chores show in its Liscor twin: tidy, dusty (something 1-3 days
 * overdue) or cluttered (4+). Only a look; it never takes anything away.
 */
export function roomLook(chores: readonly Chore[], roomId: string, date: LocalDate): "tidy" | "dusty" | "cluttered" {
  const worst = Math.max(0, ...chores.filter((c) => c.roomId === roomId).map((c) => overdueDays(c, date)));
  return worst >= 4 ? "cluttered" : worst >= 1 ? "dusty" : "tidy";
}
