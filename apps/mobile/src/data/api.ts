import type { StarterHabit } from "@inn/content";
import type { Chore, Goal, HabitLog, LocalDate } from "@inn/schema";
import { supabase } from "../lib/supabase.ts";
import {
  choreFromRow,
  choreToInsert,
  goalFromRow,
  goalToInsert,
  habitFromRow,
  logFromRow,
  logToInsert,
  pauseFromRow,
  type Insert,
  type Row,
} from "./rows.ts";

export type Player = Row<"players">;
export type Room = Row<"rooms">;

/** Throws the database error so screens can show it; returns the data otherwise. */
function ok<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

/** Like `ok`, for a lookup that may find nothing. */
function maybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// Sign-in: a 6-digit code by email, no passwords.

export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Players and the house

export async function getMe(userId: string): Promise<Player | null> {
  return maybe(await supabase.from("players").select("*").eq("id", userId).maybeSingle());
}

export async function createPlayer(p: { id: string; displayName: string; timeZone: string; startedOn: LocalDate }): Promise<void> {
  ok(
    await supabase
      .from("players")
      .insert({ id: p.id, display_name: p.displayName, time_zone: p.timeZone, started_on: p.startedOn }),
  );
}

export async function updatePlayer(id: string, fields: Pick<Partial<Player>, "display_name" | "time_zone" | "class_path_id">): Promise<void> {
  ok(await supabase.from("players").update(fields).eq("id", id));
}

export async function listHousemates(): Promise<Player[]> {
  return ok(await supabase.from("players").select("*").order("created_at"));
}

export async function getHousehold(): Promise<{ id: string; name: string } | null> {
  return maybe(await supabase.from("households").select("id, name").maybeSingle());
}

export async function createHousehold(name: string): Promise<void> {
  ok(await supabase.rpc("create_household", { house_name: name }));
}

export async function createInvite(): Promise<string> {
  return ok(await supabase.rpc("create_invite"));
}

export async function acceptInvite(code: string): Promise<void> {
  ok(await supabase.rpc("accept_invite", { invite_code: code.trim() }));
}

// Rooms

export async function listRooms(): Promise<Room[]> {
  return ok(await supabase.from("rooms").select("*").order("sort_order").order("name"));
}

export async function addRoom(name: string, sortOrder: number): Promise<void> {
  ok(await supabase.from("rooms").insert({ name, sort_order: sortOrder }));
}

// Habits and goals. Everyone in the house is returned; screens filter to their own.

export async function listHabits() {
  return ok(await supabase.from("habits").select("*").is("archived_on", null).order("created_at")).map(habitFromRow);
}

export async function listGoals(): Promise<Goal[]> {
  return ok(await supabase.from("goals").select("*").order("start_date")).map(goalFromRow);
}

export async function addHabit(h: Omit<Insert<"habits">, "player_id">, goal: Omit<Goal, "habitId">): Promise<void> {
  const habit = ok(await supabase.from("habits").insert(h).select("id").single());
  ok(await supabase.from("goals").insert(goalToInsert({ ...goal, habitId: habit.id })));
}

export async function addStarterHabit(s: StarterHabit, startDate: LocalDate): Promise<void> {
  await addHabit(
    {
      name: s.name,
      domain: s.domain,
      tier: s.tier,
      tiny_version: s.tinyVersion,
      health_type: s.healthType ?? null,
      allow_tap: s.allowTap,
    },
    { ...s.goal, startDate },
  );
}

/** A goal change on `goal.startDate`; a second change that day replaces the first. */
export async function changeGoal(goal: Goal): Promise<void> {
  ok(await supabase.from("goals").upsert(goalToInsert(goal), { onConflict: "habit_id,start_date" }));
}

export async function archiveHabit(habitId: string, on: LocalDate): Promise<void> {
  ok(await supabase.from("habits").update({ archived_on: on }).eq("id", habitId));
}

// Logs

export async function listLogs(from: LocalDate, to: LocalDate) {
  return ok(await supabase.from("habit_logs").select("*").gte("date", from).lte("date", to).order("created_at")).map(logFromRow);
}

export async function addLog(log: HabitLog): Promise<void> {
  ok(await supabase.from("habit_logs").insert(logToInsert(log)));
}

export async function removeLog(id: string): Promise<void> {
  ok(await supabase.from("habit_logs").delete().eq("id", id));
}

export async function listMyPauses() {
  return ok(await supabase.from("pauses").select("*")).map(pauseFromRow);
}

// Chores

export async function listChores(): Promise<Chore[]> {
  return ok(await supabase.from("chores").select("*")).map(choreFromRow);
}

export async function addChore(c: Omit<Chore, "id">): Promise<void> {
  ok(await supabase.from("chores").insert(choreToInsert(c)));
}

/** Marks the chore done and writes its Home log (see `checkOffChore` in the engine). */
export async function saveCheckOff(chore: Chore, log: HabitLog): Promise<void> {
  ok(
    await supabase
      .from("chores")
      .update({ last_done_on: chore.lastDoneOn ?? null, last_done_by: chore.lastDoneBy ?? null })
      .eq("id", chore.id),
  );
  ok(await supabase.from("habit_logs").insert(logToInsert(log)));
}

export async function removeChore(id: string): Promise<void> {
  ok(await supabase.from("chores").delete().eq("id", id));
}
