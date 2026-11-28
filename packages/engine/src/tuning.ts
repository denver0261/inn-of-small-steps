import type { Tier } from "@inn/schema";

/**
 * Every balance number in one place, passed into the rules rather than imported by
 * them, so the simulator can try alternatives without touching engine code.
 *
 * Values marked FLAGGED are not in docs/design.md; they are placeholders chosen in
 * docs/decisions/0002-m0-engine-defaults.md and are the players' call to change.
 */
export interface Tuning {
  tierXp: Record<Tier, number>;
  /** Habits outside the class's focus domains earn this share of XP. */
  offPathFactor: number;
  /** XP to go from level L to L+1 = base * L^exponent. */
  curve: { base: number; exponent: number };
  consistency: { windowDays: number; min: number; max: number };
  rusty: { perMiss: number; cap: number };
  /** FLAGGED: share of XP a prescribed session earns once the period's target is met. */
  prescribedOverTargetFactor: number;
  comeback: { awayDays: number; bonus: number };
  /** FLAGGED: levels that open a Skill slot ("most even levels and always at 10"). */
  skillSlotLevels: readonly number[];
  /** Apple Health workouts at or over this many minutes are big; shorter ones are normal. */
  workoutBigFromMin: { cycling: number; strength: number };
  /** All Skill XP bonuses on one log together cap at this share (+50%). */
  skillXpCap: number;
  /** The capstone level: a Skill choice (1 of 2) and a class evolution offer instead of a plain grant. */
  capstoneLevel: number;
  /** Active habits a player may have: `initial` at first, `later` once `afterDays` have passed. FLAGGED: `later`. */
  habitSlots: { initial: number; afterDays: number; later: number };
}

export const DEFAULT_TUNING: Tuning = {
  tierXp: { tiny: 10, normal: 25, big: 50 },
  offPathFactor: 0.5,
  curve: { base: 20, exponent: 1.8 },
  consistency: { windowDays: 14, min: 1.0, max: 1.5 },
  rusty: { perMiss: 0.1, cap: 0.5 },
  prescribedOverTargetFactor: 0.5,
  comeback: { awayDays: 3, bonus: 0.25 },
  skillSlotLevels: [2, 4, 6, 8, 10],
  workoutBigFromMin: { cycling: 30, strength: 45 },
  habitSlots: { initial: 5, afterDays: 14, later: 8 },
  skillXpCap: 0.5,
  capstoneLevel: 10,
};
