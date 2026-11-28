import { addDays } from "@inn/engine";
import type { LocalDate } from "@inn/schema";

export type LineKind = "level" | "class" | "skill" | "plain";

/** What a System line announces, so the reveal can mark the big ones. */
export function lineKind(line: string): LineKind {
  if (/Level \d+!/.test(line)) return "level";
  if (/Class obtained|Class –|Class evolution/.test(line)) return "class";
  if (/Skill/.test(line)) return "skill";
  return "plain";
}

/**
 * Whether to play a morning on open: it's the current one (dated yesterday, or today after
 * an early sleep) and this phone hasn't shown it yet.
 */
export function shouldReveal(morningDate: LocalDate | undefined, lastSeen: LocalDate | null, today: LocalDate): boolean {
  if (!morningDate || morningDate < addDays(today, -1)) return false;
  return lastSeen === null || morningDate > lastSeen;
}

/** Milliseconds per character while a line types in, and the pause after it. */
export const TYPE_MS = 22;
export const LINE_PAUSE_MS = 450;
