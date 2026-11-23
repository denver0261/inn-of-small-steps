import type { Tuning } from "./tuning.ts";

export interface Progress {
  /** 0 before the first night; the first night grants Level 1. */
  level: number;
  xpIntoLevel: number;
  totalXp: number;
}

export const NEW_PLAYER: Progress = { level: 0, xpIntoLevel: 0, totalXp: 0 };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number, tuning: Tuning): number {
  if (level < 1) return 0;
  return Math.round(tuning.curve.base * level ** tuning.curve.exponent);
}

/** Total XP from the start of Level 1 to the start of `level`. */
export function xpToReach(level: number, tuning: Tuning): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l, tuning);
  return sum;
}

/** Adds XP and returns every level reached on the way. Levels never go down. */
export function addXp(progress: Progress, amount: number, tuning: Tuning): { progress: Progress; levelsReached: number[] } {
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`XP must be a non-negative number, got ${amount}`);
  let { level, xpIntoLevel } = progress;
  const levelsReached: number[] = [];
  if (level < 1) {
    level = 1;
    levelsReached.push(1);
  }
  xpIntoLevel += amount;
  while (xpIntoLevel >= xpToNext(level, tuning)) {
    xpIntoLevel -= xpToNext(level, tuning);
    level += 1;
    levelsReached.push(level);
  }
  return { progress: { level, xpIntoLevel, totalXp: progress.totalXp + amount }, levelsReached };
}
