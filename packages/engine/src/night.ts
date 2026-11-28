import type { Domain, EvolutionOption, Goal, Habit, HabitLog, LocalDate, Pause, SkillDef, SkillInstance } from "@inn/schema";
import { addDays, dateRange, daysBetween, weekStart, weekday } from "./dates.ts";
import { activeGoal, effectiveWeeklyTarget, isPaused, isScheduledDay } from "./goals.ts";
import { dayEarnings } from "./economy.ts";
import { addXp, NEW_PLAYER, type Progress } from "./levels.ts";
import { consistencyRate, type SessionsOn } from "./progress.ts";
import { seeded } from "./rng.ts";
import { applyGrant, domainRanking, evolutionOptions, graceCharges, grantScores, planSkillGrant, skillXpBonus, type SkillGrant } from "./skills.ts";
import type { Tuning } from "./tuning.ts";

/** Sessions per habit on one closed day. The engine's only memory of past logs. */
export interface DayRecord {
  date: LocalDate;
  sessions: Readonly<Record<string, number>>;
}

/** Bumped when the saved shape changes; `migrateState` upgrades older saves. */
export const STATE_VERSION = 2;

export interface PlayerState {
  version: typeof STATE_VERSION;
  progress: Progress;
  /** Missed scheduled sessions per habit since its last log; feeds the rusty bonus. */
  misses: Readonly<Record<string, number>>;
  /** Closed days, oldest first, trimmed to what the rules can still look back on. */
  history: readonly DayRecord[];
  lastClosed?: LocalDate;
  /** The last day with any log, for the comeback bonus. */
  lastActive?: LocalDate;
  /** Skills held. Never lost; a second Skill in a theme raises the tier instead. */
  skills: readonly SkillInstance[];
  /** The Level 10 Skill choice (pick 1 of 2), waiting for the player. */
  pendingSkillChoice?: { level: number; options: readonly SkillGrant[] };
  /** The Level 10 class evolution offer (pick 1 of 3, one reroll), waiting for the player. */
  pendingEvolution?: { options: readonly EvolutionOption[]; rerolled: boolean };
  /** The chosen evolution; its domain joins the class's focus domains. */
  evolution?: EvolutionOption;
  /** Grace-day charges spent this week, by Skill. Resets each Monday. */
  graceUsed?: { weekStart: LocalDate; byDef: Readonly<Record<string, number>> };
  /** Fuel for expeditions, from rides, lifting, PT, eating well and sleep. Capped. */
  stamina: number;
  /** Outings since the last rare find (bad-luck protection). */
  pity: number;
}

export const NEW_PLAYER_STATE: PlayerState = { version: STATE_VERSION, progress: NEW_PLAYER, misses: {}, history: [], skills: [], stamina: 0, pity: 0 };

/** Upgrades a saved state from any earlier version. Unversioned saves are the M0 shape. */
export function migrateState(saved: unknown): PlayerState {
  const s = saved as Partial<PlayerState> & { version?: number };
  if (s.version === STATE_VERSION) return s as PlayerState;
  // v0 (M0): no skills. v1 (M2): no stamina or pity.
  if (s.version === undefined || s.version === 1) {
    const old = s as Omit<PlayerState, "version" | "stamina" | "pity" | "skills"> & { skills?: PlayerState["skills"] };
    return { ...old, skills: old.skills ?? [], version: STATE_VERSION, stamina: 0, pity: 0 };
  }
  throw new Error(`unknown player state version: ${String(s.version)}`);
}

/** What the player chose in the app today; applied when the day closes. */
export interface NightChoices {
  /** A Skill catalog id from `pendingSkillChoice`. */
  skill?: string;
  /** An option id from `pendingEvolution`. */
  evolution?: string;
  /** Ask for three new evolution options (once). */
  rerollEvolution?: boolean;
  /** Habits to mark done today with a grace-day Skill charge. */
  grace?: readonly string[];
}

/** Everything the night needs besides state. `goals` and `pauses` are full histories. */
export interface NightInput {
  date: LocalDate;
  focusDomains: readonly Domain[];
  habits: readonly Habit[];
  goals: readonly Goal[];
  pauses: readonly Pause[];
  /** Logs for `date`. Logs for other dates are ignored. */
  logs: readonly HabitLog[];
  /** Seeds every draw, so a night always closes the same way. */
  playerId?: string;
  /** The base class, e.g. "[Rider]", for evolution names. */
  className?: string;
  /** The Skill catalog (packages/content). Empty = no Skills are granted. */
  catalog?: readonly SkillDef[];
  /** Evolution qualifiers by domain (packages/content). */
  qualifiers?: Readonly<Record<string, string>>;
  choices?: NightChoices;
  /** What the house's night settled for this player (outings, meals). Applies to `date` only. */
  house?: { staminaSpent: number; staminaFromMeals: number; pity: number };
}

export interface XpFactors {
  path: number;
  consistency: number;
  rusty: number;
  prescribed: number;
  /** Share added by Skills, capped at `Tuning.skillXpCap`. */
  skill: number;
}

export type LevelEvent =
  | { type: "xp"; date: LocalDate; habitId: string; base: number; factors: XpFactors; amount: number }
  | { type: "comeback"; date: LocalDate; daysAway: number; amount: number }
  | { type: "level_up"; date: LocalDate; level: number }
  | { type: "skill_slot"; date: LocalDate; level: number }
  | { type: "skill_granted"; date: LocalDate; level: number; grant: SkillGrant }
  | { type: "skill_choice_offered"; date: LocalDate; level: number; options: readonly SkillGrant[] }
  | { type: "evolution_offered"; date: LocalDate; options: readonly EvolutionOption[]; reroll: boolean }
  | { type: "evolution_chosen"; date: LocalDate; option: EvolutionOption }
  | { type: "grace"; date: LocalDate; habitId: string; skillId: string }
  | { type: "stamina"; date: LocalDate; earned: number; spent: number; meals: number; stamina: number };

export interface NightResult {
  state: PlayerState;
  events: LevelEvent[];
}

/**
 * The nightly close. Pure and idempotent: closing a day that is already closed returns
 * the state unchanged with no events, and days skipped since the last close are closed
 * first as empty days, so a missed auto-close can never lose a miss or a level.
 */
export function closeDay(state: PlayerState, input: NightInput, tuning: Tuning): NightResult {
  if (state.lastClosed !== undefined && input.date <= state.lastClosed) return { state, events: [] };
  const events: LevelEvent[] = [];
  let current = state;
  if (state.lastClosed !== undefined) {
    for (const gap of dateRange(addDays(state.lastClosed, 1), addDays(input.date, -1))) {
      const { choices: _, house: __, ...rest } = input;
      const r = closeOne(current, { ...rest, date: gap, logs: [] }, tuning);
      current = r.state;
      events.push(...r.events);
    }
  }
  const r = closeOne(current, input, tuning);
  events.push(...r.events);
  return { state: r.state, events };
}

function closeOne(state: PlayerState, input: NightInput, tuning: Tuning): NightResult {
  const { date } = input;
  const catalog = input.catalog ?? [];
  const rng = seeded(input.playerId ?? "player", date);
  const logs = input.logs.filter((l) => l.date === date);
  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  const events: LevelEvent[] = [];

  let skills = [...state.skills];
  let pendingSkillChoice = state.pendingSkillChoice;
  let pendingEvolution = state.pendingEvolution;
  let evolution = state.evolution;
  const week = weekStart(date);
  const graceUsed: Record<string, number> = state.graceUsed?.weekStart === week ? { ...state.graceUsed.byDef } : {};

  // Choices made in the app today.
  const choices = input.choices ?? {};
  if (pendingSkillChoice && choices.skill) {
    const grant = pendingSkillChoice.options.find((g) => g.skill.defId === choices.skill);
    if (grant) {
      skills = applyGrant(skills, grant);
      events.push({ type: "skill_granted", date, level: pendingSkillChoice.level, grant });
      pendingSkillChoice = undefined;
    }
  }
  if (pendingEvolution && choices.evolution) {
    const option = pendingEvolution.options.find((o) => o.id === choices.evolution);
    if (option) {
      evolution = option;
      events.push({ type: "evolution_chosen", date, option });
      pendingEvolution = undefined;
    }
  } else if (pendingEvolution && choices.rerollEvolution && !pendingEvolution.rerolled) {
    pendingEvolution = { options: rerollOptions(state, input, tuning), rerolled: true };
    events.push({ type: "evolution_offered", date, options: pendingEvolution.options, reroll: true });
  }
  const focusDomains = evolution && !input.focusDomains.includes(evolution.domain) ? [...input.focusDomains, evolution.domain] : input.focusDomains;

  const sessions: Record<string, number> = {};
  for (const log of logs) {
    if (!habitById.has(log.habitId)) throw new Error(`log for unknown habit: ${log.habitId}`);
    sessions[log.habitId] = (sessions[log.habitId] ?? 0) + 1;
  }

  // Grace days: a Skill charge marks a habit done today, with no XP.
  for (const habitId of choices.grace ?? []) {
    const habit = habitById.get(habitId);
    if (!habit || (sessions[habitId] ?? 0) > 0) continue;
    const source = graceCharges(skills, catalog, habit.domain).find((g) => (graceUsed[g.defId] ?? 0) < g.charges);
    if (!source) continue;
    graceUsed[source.defId] = (graceUsed[source.defId] ?? 0) + 1;
    sessions[habitId] = 1;
    events.push({ type: "grace", date, habitId, skillId: source.defId });
  }

  const today: DayRecord = { date, sessions };
  const lookback = [...state.history, today];
  const sessionsOn = (d: LocalDate, habitId: string): number =>
    lookback.find((r) => r.date === d)?.sessions[habitId] ?? 0;

  const misses: Record<string, number> = { ...state.misses };
  const seenToday: Record<string, number> = {};
  let nightXp = 0;

  for (const log of logs) {
    const habit = habitById.get(log.habitId)!;
    const goal = activeGoal(input.goals, habit.id, date);
    const tier = log.kind === "tiny" ? "tiny" : (log.tier ?? habit.tier);
    const base = tuning.tierXp[tier];

    const priorToday = seenToday[habit.id] ?? 0;
    seenToday[habit.id] = priorToday + 1;

    const afterMiss = priorToday === 0 && (misses[habit.id] ?? 0) > 0;
    let rusty = 0;
    if (afterMiss) {
      rusty = Math.min(tuning.rusty.cap, tuning.rusty.perMiss * (misses[habit.id] ?? 0));
      misses[habit.id] = 0;
    }

    const factors: XpFactors = {
      path: focusDomains.includes(habit.domain) ? 1 : tuning.offPathFactor,
      consistency: consistencyMultiplier(habit.id, date, input, sessionsOn, tuning),
      rusty,
      prescribed: isOverPrescribed(goal, habit.id, date, priorToday, sessionsOn) ? tuning.prescribedOverTargetFactor : 1,
      skill: skillXpBonus(skills, catalog, habit.domain, afterMiss, tuning.skillXpCap),
    };
    const amount = Math.round(base * factors.path * factors.consistency * (1 + factors.rusty) * factors.prescribed * (1 + factors.skill));
    nightXp += amount;
    events.push({ type: "xp", date, habitId: habit.id, base, factors, amount });
  }

  if (logs.length > 0 && state.lastActive !== undefined) {
    const daysAway = daysBetween(state.lastActive, date) - 1;
    if (daysAway >= tuning.comeback.awayDays) {
      const amount = Math.round(nightXp * tuning.comeback.bonus);
      nightXp += amount;
      events.push({ type: "comeback", date, daysAway, amount });
    }
  }

  // Misses are judged after today's logs, so a habit done today is never missed today.
  const maxMisses = Math.round(tuning.rusty.cap / tuning.rusty.perMiss);
  for (const habit of input.habits) {
    const goal = activeGoal(input.goals, habit.id, date);
    if (goal === undefined || isPaused(input.pauses, habit.id, date)) continue;
    let missed = 0;
    if (goal.period === "day" && isScheduledDay(goal, date) && (sessions[habit.id] ?? 0) === 0) missed = 1;
    if (goal.period === "week" && weekday(date) === 6) {
      const done = dateRange(weekStart(date), date).reduce((n, d) => n + sessionsOn(d, habit.id), 0);
      missed = Math.max(0, effectiveWeeklyTarget(input.goals, input.pauses, habit.id, date) - done);
    }
    if (missed > 0) misses[habit.id] = Math.min(maxMisses, (misses[habit.id] ?? 0) + missed);
  }

  const { progress, levelsReached } = addXp(state.progress, nightXp, tuning);
  const activity = recentActivity(lookback, habitById, focusDomains, tuning);
  for (const level of levelsReached) {
    const ranking = domainRanking(grantScores(activity, skills), focusDomains);
    events.push({ type: "level_up", date, level });
    if (!tuning.skillSlotLevels.includes(level)) continue;
    events.push({ type: "skill_slot", date, level });
    if (level === tuning.capstoneLevel) {
      // Capstone: pick 1 of 2 Skills, and a class evolution (1 of 3, one reroll).
      const first = planSkillGrant(skills, ranking, catalog, level, rng);
      const second = first && planSkillGrant(skills, ranking.filter((d) => d !== first.skill.theme), catalog, level, rng, [first.skill.defId]);
      const options = [first, second].filter((g): g is SkillGrant => g !== undefined);
      if (options.length > 0) {
        pendingSkillChoice = { level, options };
        events.push({ type: "skill_choice_offered", date, level, options });
      }
      if (!evolution && input.className) {
        pendingEvolution = { options: evolutionOptions(domainRanking(activity, input.focusDomains), input.focusDomains, input.className, input.qualifiers ?? {}, false), rerolled: false };
        events.push({ type: "evolution_offered", date, options: pendingEvolution.options, reroll: false });
      }
    } else {
      const grant = planSkillGrant(skills, ranking, catalog, level, rng);
      if (grant) {
        skills = applyGrant(skills, grant);
        events.push({ type: "skill_granted", date, level, grant });
      }
    }
  }

  // Stamina: what today's logs earned, less what today's outings spent, plus meals. Capped.
  const earned = dayEarnings(logs, input.habits, tuning).stamina;
  const spentStamina = input.house?.staminaSpent ?? 0;
  const meals = input.house?.staminaFromMeals ?? 0;
  const stamina = Math.min(tuning.economy.staminaCap, Math.max(0, state.stamina - spentStamina) + earned + meals);
  if (earned + spentStamina + meals > 0) events.push({ type: "stamina", date, earned, spent: spentStamina, meals, stamina });

  // Keep the consistency window plus one week for weekly targets.
  const keep = tuning.consistency.windowDays + 7;
  const next: PlayerState = {
    version: STATE_VERSION,
    progress,
    misses,
    history: lookback.slice(-keep),
    lastClosed: date,
    skills,
    stamina,
    pity: input.house?.pity ?? state.pity,
  };
  const lastActive = logs.length > 0 ? date : state.lastActive;
  if (lastActive !== undefined) next.lastActive = lastActive;
  if (pendingSkillChoice) next.pendingSkillChoice = pendingSkillChoice;
  if (pendingEvolution) next.pendingEvolution = pendingEvolution;
  if (evolution) next.evolution = evolution;
  if (Object.keys(graceUsed).length > 0) next.graceUsed = { weekStart: week, byDef: graceUsed };
  return { state: next, events };
}

/**
 * Path-weighted sessions per domain over the last `windowDays` closed days (today
 * included): focus domains count 1 per session, others `offPathFactor`, the way XP does.
 */
function recentActivity(lookback: readonly DayRecord[], habitById: ReadonlyMap<string, Habit>, focusDomains: readonly Domain[], tuning: Tuning): Partial<Record<Domain, number>> {
  const out: Partial<Record<Domain, number>> = {};
  for (const day of lookback.slice(-tuning.consistency.windowDays)) {
    for (const [habitId, n] of Object.entries(day.sessions)) {
      const domain = habitById.get(habitId)?.domain;
      if (!domain) continue;
      out[domain] = (out[domain] ?? 0) + n * (focusDomains.includes(domain) ? 1 : tuning.offPathFactor);
    }
  }
  return out;
}

function rerollOptions(state: PlayerState, input: NightInput, tuning: Tuning): EvolutionOption[] {
  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  const ranking = domainRanking(recentActivity(state.history, habitById, input.focusDomains, tuning), input.focusDomains);
  return evolutionOptions(ranking, input.focusDomains, input.className ?? "[Adventurer]", input.qualifiers ?? {}, true);
}

/** 1.0 to 1.5 from the habit's 14-day consistency rate (see `consistencyRate`); no history counts as 0. */
export function consistencyMultiplier(
  habitId: string,
  date: LocalDate,
  input: Pick<NightInput, "goals" | "pauses">,
  sessionsOn: SessionsOn,
  tuning: Tuning,
): number {
  const { windowDays, min, max } = tuning.consistency;
  const rate = consistencyRate(habitId, date, input.goals, input.pauses, sessionsOn, windowDays) ?? 0;
  return min + (max - min) * rate;
}

function isOverPrescribed(
  goal: Goal | undefined,
  habitId: string,
  date: LocalDate,
  priorToday: number,
  sessionsOn: SessionsOn,
): boolean {
  if (goal?.prescribed !== true) return false;
  if (goal.period === "day") return priorToday >= goal.target;
  const earlierThisWeek = dateRange(weekStart(date), addDays(date, -1)).reduce((n, d) => n + sessionsOn(d, habitId), 0);
  return earlierThisWeek + priorToday >= goal.target;
}
