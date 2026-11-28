import { Chore, Goal, Habit, HabitLog, Pause, type Database, type RepeatRule } from "@inn/schema";

type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];

/** A habit as the app shows it: the engine's Habit plus how it is logged. */
export interface HabitInfo extends Habit {
  playerId: string;
  healthType?: "cycling" | "strength";
  /** False for rides and lifting, which only come from Apple Health. */
  allowTap: boolean;
  archivedOn?: string;
}

// Rows from the database are parsed with the shared zod schemas, so a bad row fails loudly
// here instead of flowing into the engine.

export function habitFromRow(r: Row<"habits">): HabitInfo {
  const habit = Habit.parse({ id: r.id, name: r.name, domain: r.domain, tier: r.tier, tinyVersion: r.tiny_version });
  const info: HabitInfo = { ...habit, playerId: r.player_id, allowTap: r.allow_tap };
  if (r.health_type === "cycling" || r.health_type === "strength") info.healthType = r.health_type;
  if (r.archived_on !== null) info.archivedOn = r.archived_on;
  return info;
}

export function goalFromRow(r: Row<"goals">): Goal {
  return Goal.parse({
    habitId: r.habit_id,
    period: r.period,
    target: r.target,
    ...(r.days !== null ? { days: r.days } : {}),
    startDate: r.start_date,
    ...(r.end_date !== null ? { endDate: r.end_date } : {}),
    prescribed: r.prescribed,
  });
}

export function goalToInsert(g: Goal): Insert<"goals"> {
  return {
    habit_id: g.habitId,
    period: g.period,
    target: g.target,
    days: g.days ?? null,
    start_date: g.startDate,
    end_date: g.endDate ?? null,
    prescribed: g.prescribed,
  };
}

export interface LogInfo extends HabitLog {
  id: string;
  playerId: string;
}

export function logFromRow(r: Row<"habit_logs">): LogInfo {
  const log = HabitLog.parse({
    habitId: r.habit_id,
    date: r.date,
    kind: r.kind,
    ...(r.tier !== null ? { tier: r.tier } : {}),
    source: r.source,
    ...(r.health_workout_id !== null ? { healthWorkoutId: r.health_workout_id } : {}),
    ...(r.chore_id !== null ? { choreId: r.chore_id } : {}),
    ...(r.performed_on !== null ? { performedOn: r.performed_on } : {}),
  });
  return { ...log, id: r.id, playerId: r.player_id };
}

export function logToInsert(l: HabitLog): Insert<"habit_logs"> {
  return {
    habit_id: l.habitId,
    date: l.date,
    kind: l.kind,
    tier: l.tier ?? null,
    source: l.source,
    health_workout_id: l.healthWorkoutId ?? null,
    chore_id: l.choreId ?? null,
    performed_on: l.performedOn ?? null,
  };
}

function repeatFromRow(r: Row<"chores">): RepeatRule | undefined {
  if (r.repeat_kind === "every" && r.repeat_every_days !== null) return { kind: "every", days: r.repeat_every_days };
  if (r.repeat_kind === "weekly" && r.repeat_weekdays !== null) return { kind: "weekly", days: r.repeat_weekdays };
  return undefined;
}

export function choreFromRow(r: Row<"chores">): Chore {
  const repeat = repeatFromRow(r);
  return Chore.parse({
    id: r.id,
    title: r.title,
    roomId: r.room_id,
    size: r.size,
    ...(repeat ? { repeat } : {}),
    ...(r.assignee !== null ? { assignee: r.assignee } : {}),
    createdOn: r.created_on,
    ...(r.last_done_on !== null ? { lastDoneOn: r.last_done_on } : {}),
    ...(r.last_done_by !== null ? { lastDoneBy: r.last_done_by } : {}),
  });
}

export function choreToInsert(c: Omit<Chore, "id">): Insert<"chores"> {
  return {
    title: c.title,
    room_id: c.roomId,
    size: c.size,
    repeat_kind: c.repeat?.kind ?? null,
    repeat_every_days: c.repeat?.kind === "every" ? c.repeat.days : null,
    repeat_weekdays: c.repeat?.kind === "weekly" ? c.repeat.days : null,
    assignee: c.assignee ?? null,
    created_on: c.createdOn,
    last_done_on: c.lastDoneOn ?? null,
    last_done_by: c.lastDoneBy ?? null,
  };
}

export function pauseFromRow(r: Row<"pauses">): Pause {
  return Pause.parse({
    ...(r.habit_ids !== null ? { habitIds: r.habit_ids } : {}),
    startDate: r.start_date,
    endDate: r.end_date,
  });
}
