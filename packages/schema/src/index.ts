import { z } from "zod";

/** A calendar day in the player's own timezone, `YYYY-MM-DD`. Never a timestamp. */
export const LocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
export type LocalDate = z.infer<typeof LocalDate>;

export const Domain = z.enum([
  "home",
  "nourish",
  "endurance",
  "strength",
  "recovery",
  "mind",
  "craft",
  "spirit",
  "bonds",
  "rest",
]);
export type Domain = z.infer<typeof Domain>;

export const Tier = z.enum(["tiny", "normal", "big"]);
export type Tier = z.infer<typeof Tier>;

/** 0 = Monday … 6 = Sunday. Weeks run Monday to Sunday. */
export const Weekday = z.number().int().min(0).max(6);
export type Weekday = z.infer<typeof Weekday>;

export const Habit = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: Domain,
  /** The tier a full log earns unless the log names its own (e.g. a 45+ min lift is big). */
  tier: Tier,
  tinyVersion: z.string().min(1),
});
export type Habit = z.infer<typeof Habit>;

/**
 * One goal period. Changing a goal adds a new row with a later startDate; each day
 * is judged against the row active on it, so a lowered goal never rewrites history.
 */
export const Goal = z.object({
  habitId: z.string().min(1),
  period: z.enum(["day", "week"]),
  /** Day goals: sessions per scheduled day (normally 1). Week goals: sessions per week. */
  target: z.number().int().min(1),
  /** Day goals only: which weekdays are scheduled. Omitted = every day. */
  days: z.array(Weekday).optional(),
  startDate: LocalDate,
  endDate: LocalDate.optional(),
  /** Prescribed goals (PT) are never raised, and sessions past target earn reduced XP. */
  prescribed: z.boolean(),
});
export type Goal = z.infer<typeof Goal>;

export const HabitLog = z.object({
  habitId: z.string().min(1),
  date: LocalDate,
  kind: z.enum(["full", "tiny"]),
  /** Overrides the habit's tier for a full log (workout length, deep clean, sleep hours). */
  tier: Tier.optional(),
  source: z.enum(["tap", "apple_health"]),
  healthWorkoutId: z.string().optional(),
});
export type HabitLog = z.infer<typeof HabitLog>;

/** Paused days are neither done nor missed. `habitIds` omitted = every habit. */
export const Pause = z.object({
  habitIds: z.array(z.string().min(1)).optional(),
  startDate: LocalDate,
  endDate: LocalDate,
});
export type Pause = z.infer<typeof Pause>;

export const ClassPath = z.object({
  id: z.string().min(1),
  name: z.string().regex(/^\[.+\]$/, "class names are bracketed, e.g. [Rider]"),
  focusDomains: z.array(Domain).min(1),
  blurb: z.string().min(1),
});
export type ClassPath = z.infer<typeof ClassPath>;
