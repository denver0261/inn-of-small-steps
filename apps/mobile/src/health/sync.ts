import { addDays, DEFAULT_TUNING, planHealthSync } from "@inn/engine";
import type { LocalDate } from "@inn/schema";
import type { HabitInfo } from "@inn/schema/rows";
import { addLogs, getLastClosed, listMyHealthLogs, removeLogs, saveWorkouts } from "../data/api.ts";
import { readSince } from "./healthkit.ts";
import { desiredHealthLogs } from "./map.ts";

export interface SyncResult {
  added: number;
  removed: number;
}

/**
 * Brings the open days' Apple Health logs in line with Apple Health. Reads a week before
 * the first open day, so a watch that synced late still counts (toward the next open day).
 * Logs for closed days are never touched: those days are settled.
 */
export async function syncHealth(playerId: string, timeZone: string, habits: readonly HabitInfo[], today: LocalDate): Promise<SyncResult> {
  const mine = habits.filter((h) => h.playerId === playerId && h.healthType && h.archivedOn === undefined);
  if (mine.length === 0) return { added: 0, removed: 0 };
  const lastClosed = await getLastClosed();
  const firstOpen = lastClosed ? addDays(lastClosed, 1) : today;
  const from = addDays(firstOpen, -DEFAULT_TUNING.sleep.lookbackDays);
  const [raw, logs] = await Promise.all([readSince(new Date(`${from}T00:00:00Z`)), listMyHealthLogs(playerId, from)]);
  const counted = new Set(logs.filter((l) => lastClosed !== undefined && l.date <= lastClosed).flatMap((l) => (l.healthWorkoutId ? [l.healthWorkoutId] : [])));
  const desired = desiredHealthLogs(raw, mine, { timeZone, counted, ...(lastClosed ? { lastClosed } : {}) });
  const open = logs.filter((l) => lastClosed === undefined || l.date > lastClosed);
  const plan = planHealthSync(open, desired.logs);
  await saveWorkouts(desired.workouts);
  await removeLogs(plan.remove);
  await addLogs(plan.insert);
  return { added: plan.insert.length, removed: plan.remove.length };
}
