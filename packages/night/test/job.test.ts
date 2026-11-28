import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ITEMS, TIER1_EVENTS } from "@inn/content";
import { DEFAULT_TUNING, NEW_HOUSE, NEW_PLAYER_STATE, outingSeed, planOuting, resolveOuting } from "@inn/engine";
import { runNight } from "../src/job.ts";
import { MemoryDb } from "./memoryDb.ts";

const START = "2027-01-04"; // a Monday
/** Chicago in January is UTC-6, so 4:00 local is 10:00Z. */
const at = (iso: string) => new Date(iso);

function house(): MemoryDb {
  const db = new MemoryDb();
  db.houses.set("h1", "The house by the wall");
  db.players_ = [
    { id: "kyle", householdId: "h1", name: "Kyle", timeZone: "America/Chicago", classPathId: "rider", startedOn: START },
    { id: "sam", householdId: "h1", name: "Sam", timeZone: "America/Chicago", classPathId: "chef", startedOn: START },
  ];
  db.habits_.set("kyle", [{ id: "ride", name: "Biking", domain: "endurance", tier: "normal", tinyVersion: "a spin" }]);
  db.habits_.set("sam", [{ id: "eat", name: "Eating well", domain: "nourish", tier: "normal", tinyVersion: "one good thing" }]);
  db.goals_.set("kyle", [{ habitId: "ride", period: "week", target: 3, startDate: START, prescribed: false }]);
  db.goals_.set("sam", [{ habitId: "eat", period: "day", target: 1, startDate: START, prescribed: false }]);
  db.logs_.push({ playerId: "kyle", habitId: "ride", date: START, kind: "full", source: "apple_health", healthWorkoutId: "w1" });
  db.logs_.push({ playerId: "sam", habitId: "eat", date: START, kind: "full", source: "tap" });
  return db;
}

const run = (db: MemoryDb, iso: string, call?: Parameters<typeof runNight>[0]["call"]) =>
  runNight({ db, now: at(iso), promptVersion: "system-v1", ...(call ? { call } : {}) });

describe("the nightly job", () => {
  it("does nothing before 4:00", async () => {
    const r = await run(house(), "2027-01-05T09:30:00Z");
    expect(r).toMatchObject({ autoClosed: [], processed: [], stories: [], errors: [] });
  });

  it("closes the day at 4:00, levels both players and writes one morning for the house", async () => {
    const db = house();
    const r = await run(db, "2027-01-05T10:15:00Z");
    expect(r.autoClosed.map((a) => a.dates)).toEqual([[START], [START]]);
    expect(r.processed).toEqual([
      { playerId: "kyle", date: START, levels: [1, 2] },
      { playerId: "sam", date: START, levels: [1, 2] },
    ]);
    expect(r.stories).toEqual([{ householdId: "h1", date: START, source: "template", error: "no Claude client" }]);
    const story = db.stories.get(`h1|${START}`)!;
    expect(story.players.find((p) => p.playerId === "kyle")?.messages[0]).toBe("[Rider Class obtained!]");
    expect(story.scene).toMatch(/Kyle and Sam/);
  });

  it("is idempotent: a second run changes nothing", async () => {
    const db = house();
    await run(db, "2027-01-05T10:15:00Z");
    const before = JSON.stringify([...db.states, ...db.stories]);
    const again = await run(db, "2027-01-05T10:30:00Z");
    expect(again).toMatchObject({ autoClosed: [], processed: [], stories: [] });
    expect(JSON.stringify([...db.states, ...db.stories])).toBe(before);
  });

  it("closes skipped days if the job didn't run for a while", async () => {
    const db = house();
    const r = await run(db, "2027-01-08T12:00:00Z");
    expect(r.autoClosed[0]?.dates).toEqual(["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"]);
    expect(r.stories.map((s) => s.date)).toEqual(["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"]);
  });

  it("waits for the housemate before settling an early sleeper's day", async () => {
    const db = house();
    await run(db, "2027-01-05T10:15:00Z");
    db.logs_.push({ playerId: "kyle", habitId: "ride", date: "2027-01-05", kind: "full", source: "apple_health", healthWorkoutId: "w2" });
    db.sleep("kyle", "2027-01-05");
    const evening = await run(db, "2027-01-06T03:00:00Z"); // 21:00 in Chicago
    expect(evening.processed).toEqual([]);
    expect(evening.stories).toEqual([]);
    const morning = await run(db, "2027-01-06T10:05:00Z");
    expect(morning.processed.map((p) => p.playerId).sort()).toEqual(["kyle", "sam"]);
    expect(morning.stories.map((s) => s.date)).toEqual(["2027-01-05"]);
  });

  it("settles the house's night: income, orders and outings, and tells the morning", async () => {
    const db = house();
    db.houseStates.set("h1", { ...NEW_HOUSE, resources: { coins: 200, supplies: 100, mana: 0, goodwill: 0 } });
    db.states.set("kyle", { ...NEW_PLAYER_STATE, stamina: 20 });
    db.orders_.push({ householdId: "h1", date: START, playerId: "sam", kind: "build", ref: "kitchen" });
    db.orders_.push({ householdId: "h1", date: START, playerId: "sam", kind: "craft", ref: "stew" });
    db.outings_.push({ playerId: "kyle", date: START, index: 0, choices: [0, 0, 0] });
    await run(db, "2027-01-05T10:15:00Z");
    const h = db.houseStates.get("h1") as { upgrades: string[]; stash: Record<string, number>; resources: { coins: number } };
    expect(h.upgrades).toContain("kitchen");
    expect(h.stash.stew).toBeGreaterThanOrEqual(2);
    // The outing the app previewed is the one the job paid out.
    const seed = outingSeed("kyle", START, 0);
    const preview = resolveOuting({ seed, eventIds: planOuting(seed, TIER1_EVENTS, DEFAULT_TUNING), choices: [0, 0, 0] }, TIER1_EVENTS, { level: 0, skills: [], pity: 0 }, ITEMS.filter((i) => i.kind === "trophy").map((i) => i.id), DEFAULT_TUNING);
    const paid = db.houseNights.get(`h1|${START}`)!.events.find((e) => e.type === "outing");
    expect(paid && paid.type === "outing" && paid.result).toEqual(preview);
    expect((db.states.get("kyle") as { stamina: number }).stamina).toBe(20 - 10 + 5);
    expect(db.stories.get(`h1|${START}`)?.scene).toMatch(/Working kitchen is finished overnight/);
  });

  it("runs a visitor's quest from acceptance to reward, from the habits logged anyway", async () => {
    const db = house();
    const offer = { id: `gnoll_butcher:${START}`, templateId: "gnoll_butcher", arrivedOn: START, leavesOn: "2027-01-06" };
    db.houseStates.set("h1", { ...NEW_HOUSE, visitors: [offer] });
    db.orders_.push({ householdId: "h1", date: START, playerId: "sam", kind: "accept", ref: offer.id });
    db.orders_.push({ householdId: "h1", date: START, playerId: "kyle", kind: "inn", ref: "inn" });
    for (const d of ["2027-01-05", "2027-01-06", "2027-01-07"]) db.logs_.push({ playerId: "sam", habitId: "eat", date: d, kind: "full", source: "tap" });
    await run(db, "2027-01-08T10:15:00Z");
    const nights = ["2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07"].map((d) => db.houseNights.get(`h1|${d}`)!.events.map((e) => e.type));
    expect(nights[0]).toEqual(expect.arrayContaining(["quest_accepted", "inn_evening", "visitor_arrived"]));
    expect(nights[3]).toContain("quest_done");
    const h = db.houseStates.get("h1") as { questsDone: Record<string, number>; resources: { goodwill: number } };
    expect(h.questsDone.gnoll_butcher).toBe(1);
    expect(h.resources.goodwill).toBeGreaterThanOrEqual(3 + 1);
    expect(db.stories.get("h1|2027-01-07")?.scene).toMatch(/lost the bet on purpose/);
    expect(db.stories.get(`h1|${START}`)?.scene).toMatch(/Kyle spent the evening at the Wandering Inn/);
  });

  it("recovers if a run died between the house's night and the players'", async () => {
    const db = house();
    db.states.set("kyle", { ...NEW_PLAYER_STATE, stamina: 20 });
    db.outings_.push({ playerId: "kyle", date: START, index: 0, choices: [0, 0, 0] });
    db.autoClose("kyle", [START]);
    db.autoClose("sam", [START]);
    // Simulate the crash: the house night is recorded, the players are not.
    const realRecord = db.recordNight.bind(db);
    db.recordNight = async () => {
      throw new Error("crash");
    };
    await run(db, "2027-01-05T10:15:00Z");
    db.recordNight = realRecord;
    await run(db, "2027-01-05T10:30:00Z");
    expect((db.states.get("kyle") as { stamina: number }).stamina).toBe(20 - 10 + 5);
  });

  it("uses Claude's morning when it validates, and keeps its Skill names for later nights", async () => {
    const db = house();
    const r = await run(db, "2027-01-05T10:15:00Z", async (req) => ({
      players: req.players.map((p) => ({
        playerId: p.playerId,
        levelMessages: ["[A class!]", "[A level!]", "[A Skill!]"],
        skillNames: p.skillsGained.map((s) => ({ defId: s.defId, tier: s.tier, name: `[${p.name}'s Knack]`, text: s.summary })),
        evolutionNames: [],
      })),
      morningScene: "Morning comes to Liscor.",
    }));
    expect(r.stories[0]?.source).toBe("claude");
    expect(Object.values(await db.skillNames("kyle"))).toEqual(["[Kyle's Knack]"]);
  });

  it("falls back to templates when Claude fails, and still writes the morning", async () => {
    const db = house();
    const r = await run(db, "2027-01-05T10:15:00Z", async () => {
      throw new Error("overloaded");
    });
    expect(r.stories[0]).toMatchObject({ source: "template", error: "overloaded" });
  });

  it("processes a player with no house but writes no morning for them", async () => {
    const db = house();
    db.players_.push({ id: "solo", householdId: null, name: "Solo", timeZone: "America/Chicago", classPathId: null, startedOn: START });
    const r = await run(db, "2027-01-05T10:15:00Z");
    expect(r.processed.map((p) => p.playerId)).toContain("solo");
    expect(r.stories).toHaveLength(1);
  });

  it("applies the player's choices from the day", async () => {
    const db = house();
    db.choices_.set(`kyle|${START}`, { grace: ["ride"] });
    const r = await run(db, "2027-01-05T10:15:00Z");
    // Kyle has no grace Skill on day one, so the choice is ignored, not an error.
    expect(r.errors).toEqual([]);
  });
});

describe("the nightly workflow", () => {
  it("only runs when its secrets exist", () => {
    const yml = readFileSync(new URL("../../../.github/workflows/nightly.yml", import.meta.url), "utf8");
    expect(yml).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(yml).toMatch(/cron:/);
  });
});
