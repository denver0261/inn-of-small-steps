/** Row types generated from supabase/migrations by `pnpm db:types`. Do not edit by hand. */
export type { Database, Json } from "./database.ts";

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
  /** Set when the log came from checking off a chore. */
  choreId: z.string().optional(),
  /** The real day it happened, when that differs from `date` (a workout that synced after its day closed). */
  performedOn: LocalDate.optional(),
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

/** When a chore comes back: N days after it was last done, or on set weekdays. */
export const RepeatRule = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("every"), days: z.number().int().min(1) }),
  z.object({ kind: z.literal("weekly"), days: z.array(Weekday).min(1) }),
]);
export type RepeatRule = z.infer<typeof RepeatRule>;

/** One item on the shared house chore list. Checking it off writes a Home HabitLog. */
export const Chore = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  roomId: z.string().min(1),
  /** Sets the tier of the log it writes. */
  size: Tier,
  /** Omitted = a one-off chore, gone once done. */
  repeat: RepeatRule.optional(),
  /** A player id. Omitted = either player. */
  assignee: z.string().min(1).optional(),
  createdOn: LocalDate,
  lastDoneOn: LocalDate.optional(),
  lastDoneBy: z.string().min(1).optional(),
});
export type Chore = z.infer<typeof Chore>;

/**
 * A workout as read from Apple Health. Only these fields exist: no heart rate, no samples.
 * `fromGarmin` is used on the phone to pick between duplicate records of one session.
 */
export const HealthWorkout = z.object({
  id: z.string().min(1),
  type: z.enum(["cycling", "strength"]),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  durationMin: z.number().nonnegative(),
  distanceKm: z.number().nonnegative().optional(),
  fromGarmin: z.boolean(),
});
export type HealthWorkout = z.infer<typeof HealthWorkout>;

/** What a Skill does. Every number is per tier (index 0 = tier 1), so an upgrade is a lookup. */
export const SkillEffect = z.discriminatedUnion("kind", [
  /** Passive: +percent XP on logs in these domains. */
  z.object({ kind: z.literal("xp_bonus"), domains: z.array(Domain).min(1), percent: z.array(z.number().positive()).min(1) }),
  /** Triggered: the first log in these domains after a missed scheduled day earns +percent. */
  z.object({ kind: z.literal("after_miss_bonus"), domains: z.array(Domain).min(1), percent: z.array(z.number().positive()).min(1) }),
  /** Active: tap to mark a missed habit in these domains done for the day; charges refill each Monday. */
  z.object({ kind: z.literal("grace_day"), domains: z.array(Domain).min(1), chargesPerWeek: z.array(z.number().int().positive()).min(1) }),
]);
export type SkillEffect = z.infer<typeof SkillEffect>;

/**
 * A Skill mechanic from the catalog. The rules pick one when a slot opens; Claude only
 * names it. `fallbackNames[tier - 1]` is used when narration fails.
 */
export const SkillDef = z.object({
  id: z.string().min(1),
  /** The domain whose habits lead to this Skill. */
  theme: Domain,
  type: z.enum(["passive", "triggered", "active", "house", "partner", "expedition"]),
  effect: SkillEffect,
  fallbackNames: z.array(z.string().regex(/^\[.+\]$/)).min(1),
  /** One line for the character sheet, with {n} for the tier's number. */
  summary: z.string().min(1),
});
export type SkillDef = z.infer<typeof SkillDef>;

/** A Skill a player holds. Skills are never lost; a second Skill in the same theme raises the tier. */
export const SkillInstance = z.object({
  defId: z.string().min(1),
  theme: Domain,
  tier: z.number().int().min(1),
  grantedLevel: z.number().int().min(1),
});
export type SkillInstance = z.infer<typeof SkillInstance>;

/** One of the class evolutions offered at Level 10: base class plus a qualifier from a domain. */
export const EvolutionOption = z.object({
  id: z.string().min(1),
  /** The domain the qualifier comes from; the evolved class adds it to its focus domains. */
  domain: Domain,
  fallbackName: z.string().regex(/^\[.+\]$/),
});
export type EvolutionOption = z.infer<typeof EvolutionOption>;
