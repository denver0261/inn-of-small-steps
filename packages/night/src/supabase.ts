import type { SupabaseClient } from "@supabase/supabase-js";
import type { LevelEvent, NightChoices } from "@inn/engine";
import type { Database, Goal, HabitLog, LocalDate, Pause } from "@inn/schema";
import { goalFromRow, habitFromRow, logFromRow, pauseFromRow } from "@inn/schema/rows";
import type { Json } from "@inn/schema";
import type { HabitRow, NightDb, PlayerRow, StoryRecord } from "./db.ts";

type Client = SupabaseClient<Database>;

function ok<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

/** Like `ok`, for a lookup that may find nothing. */
function maybe<R extends { data: unknown; error: { message: string } | null }>(res: R): R["data"] {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** The nightly job's database, through the service role (row-level security doesn't apply). */
export function supabaseNightDb(db: Client): NightDb {
  return {
    async players(): Promise<PlayerRow[]> {
      const rows = ok(await db.from("players").select("id, household_id, display_name, time_zone, class_path_id, started_on"));
      return rows.map((r) => ({ id: r.id, householdId: r.household_id, name: r.display_name, timeZone: r.time_zone, classPathId: r.class_path_id, startedOn: r.started_on }));
    },
    async householdName(id) {
      return ok(await db.from("households").select("name").eq("id", id).single()).name;
    },
    async lastClosed(playerId) {
      const row = ok(await db.from("day_closes").select("date").eq("player_id", playerId).order("date", { ascending: false }).limit(1));
      return row[0]?.date;
    },
    async autoClose(playerId, dates) {
      ok(await db.from("day_closes").upsert(dates.map((date) => ({ player_id: playerId, date, source: "auto" })), { onConflict: "player_id,date", ignoreDuplicates: true }));
    },
    async unprocessed(playerId) {
      return ok(await db.from("day_closes").select("date").eq("player_id", playerId).is("processed_at", null).order("date")).map((r) => r.date);
    },
    async loadState(playerId) {
      const row = maybe(await db.from("player_states").select("state").eq("player_id", playerId).maybeSingle());
      return row?.state ?? undefined;
    },
    async habits(playerId): Promise<HabitRow[]> {
      return ok(await db.from("habits").select("*").eq("player_id", playerId)).map((r) => {
        const { id, name, domain, tier, tinyVersion, archivedOn } = habitFromRow(r);
        return { id, name, domain, tier, tinyVersion, ...(archivedOn ? { archivedOn } : {}) };
      });
    },
    async goals(playerId): Promise<Goal[]> {
      return ok(await db.from("goals").select("*, habits!inner(player_id)").eq("habits.player_id", playerId)).map(({ habits: _, ...g }) => goalFromRow(g));
    },
    async pauses(playerId): Promise<Pause[]> {
      return ok(await db.from("pauses").select("*").eq("player_id", playerId)).map(pauseFromRow);
    },
    async logs(playerId, date): Promise<HabitLog[]> {
      return ok(await db.from("habit_logs").select("*").eq("player_id", playerId).eq("date", date)).map((r) => {
        const { id: _, playerId: __, ...log } = logFromRow(r);
        return log;
      });
    },
    async choices(playerId, date): Promise<NightChoices> {
      const r = maybe(await db.from("night_choices").select("*").eq("player_id", playerId).eq("date", date).maybeSingle());
      if (!r) return {};
      return { ...(r.skill ? { skill: r.skill } : {}), ...(r.evolution ? { evolution: r.evolution } : {}), ...(r.reroll_evolution ? { rerollEvolution: true } : {}), grace: r.grace };
    },
    async recordNight(playerId, date, state, events) {
      ok(await db.rpc("record_night", { p: playerId, d: date, new_state: state as Json, day_events: events as unknown as Json }));
    },
    async night(playerId, date) {
      const r = maybe(await db.from("level_events").select("events, state_after").eq("player_id", playerId).eq("date", date).maybeSingle());
      return r ? { events: r.events as LevelEvent[], stateAfter: r.state_after } : undefined;
    },
    async pendingStoryDates(householdId) {
      const members = ok(await db.from("players").select("id").eq("household_id", householdId)).map((r) => r.id);
      const done = new Set(ok(await db.from("story_entries").select("date").eq("household_id", householdId)).map((r) => r.date));
      const dates = ok(await db.from("level_events").select("date").in("player_id", members)).map((r) => r.date);
      return [...new Set(dates)].filter((d) => !done.has(d)).sort();
    },
    async recentScenes(householdId, before: LocalDate, count) {
      const rows = ok(await db.from("story_entries").select("scene").eq("household_id", householdId).lt("date", before).order("date", { ascending: false }).limit(count));
      return rows.map((r) => r.scene).reverse();
    },
    async skillNames(playerId) {
      const rows = ok(await db.from("skill_names").select("def_id, tier, name").eq("player_id", playerId));
      return Object.fromEntries(rows.map((r) => [`${r.def_id}:${r.tier}`, r.name]));
    },
    async evolutionName(playerId, optionId) {
      const r = maybe(await db.from("evolution_names").select("name").eq("player_id", playerId).eq("option_id", optionId).maybeSingle());
      return r?.name;
    },
    async recordStory(s: StoryRecord) {
      ok(
        await db.rpc("record_story", {
          house: s.householdId,
          d: s.date,
          scene: s.scene,
          src: s.source,
          err: s.error ?? "",
          version: s.promptVersion,
          players: s.players.map((p) => ({
            player_id: p.playerId,
            messages: p.messages,
            skill_names: p.skillNames.map((n) => ({ def_id: n.defId, tier: n.tier, name: n.name, text: n.text })),
            evolution_names: p.evolutionNames.map((n) => ({ option_id: n.optionId, name: n.name, text: n.text })),
          })) as unknown as Json,
        }),
      );
    },
  };
}
