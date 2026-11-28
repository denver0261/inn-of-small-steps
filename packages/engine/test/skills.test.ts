import type { SkillDef } from "@inn/schema";
import { describe, expect, it } from "vitest";
import {
  addDays,
  closeDay,
  DEFAULT_TUNING,
  migrateState,
  NEW_PLAYER_STATE,
  seeded,
  skillXpBonus,
  STATE_VERSION,
  type LevelEvent,
  type NightInput,
  type PlayerState,
  type Tuning,
} from "../src/index.ts";
import { baseInput, daily, log, MON, pt, ride, tidy, weekly, xpEvents } from "./fixtures.ts";

const day = (n: number) => addDays(MON, n);

/** A small catalog so the tests don't move when the real content changes. */
const CATALOG: SkillDef[] = [
  { id: "long_road", theme: "endurance", type: "passive", effect: { kind: "xp_bonus", domains: ["endurance"], percent: [10, 20, 30] }, fallbackNames: ["[Long Road]", "[Longer Road]", "[Longest Road]"], summary: "+{n}% XP on rides." },
  { id: "clean_sweep", theme: "home", type: "triggered", effect: { kind: "after_miss_bonus", domains: ["home"], percent: [25, 35, 50] }, fallbackNames: ["[Clean Sweep]"], summary: "+{n}% after a miss." },
  { id: "mend", theme: "recovery", type: "active", effect: { kind: "grace_day", domains: ["recovery", "endurance"], chargesPerWeek: [1, 2] }, fallbackNames: ["[Mend]", "[Greater Mend]"], summary: "{n} a week." },
];
const QUALIFIERS = { endurance: "Long Road", home: "Hearth", recovery: "Mended" };

/** Every night is a level, so slots come quickly. */
const FAST: Tuning = { ...DEFAULT_TUNING, curve: { base: 1, exponent: 0 } };

const input = (date: string, logs = [log("ride", date)], over: Partial<NightInput> = {}): NightInput =>
  baseInput(date, logs, { playerId: "p1", className: "[Rider]", catalog: CATALOG, qualifiers: QUALIFIERS, habits: [ride, tidy, pt], goals: [daily("ride"), daily("tidy"), weekly("pt", 3)], ...over });

function play(days: NightInput[], tuning: Tuning = FAST, start: PlayerState = NEW_PLAYER_STATE) {
  let state = start;
  const events: LevelEvent[] = [];
  for (const i of days) {
    const r = closeDay(state, i, tuning);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const of = <T extends LevelEvent["type"]>(events: LevelEvent[], type: T) => events.filter((e): e is Extract<LevelEvent, { type: T }> => e.type === type);

describe("Skill grants", () => {
  it("grants a Skill themed on what you did at a slot level", () => {
    const { state, events } = play([input(MON)], DEFAULT_TUNING);
    // Night one reaches Level 2, the first slot.
    const [granted] = of(events, "skill_granted");
    expect(granted?.level).toBe(2);
    expect(granted?.grant).toMatchObject({ kind: "new", skill: { defId: "long_road", theme: "endurance", tier: 1 } });
    expect(state.skills).toHaveLength(1);
  });

  it("upgrades a held theme instead of stacking a second Skill", () => {
    const days = Array.from({ length: 4 }, (_, n) => input(day(n)));
    const { state, events } = play(days, { ...FAST, skillSlotLevels: [2, 3] });
    expect(of(events, "skill_granted").map((e) => e.grant.kind)).toEqual(["new", "upgrade"]);
    expect(state.skills).toEqual([{ defId: "long_road", theme: "endurance", tier: 2, grantedLevel: 2 }]);
  });

  it("spreads slots across themes you actually do", () => {
    const both = (d: string) => input(d, [log("ride", d), log("tidy", d), log("tidy", d)]);
    const { state } = play([both(MON), both(day(1)), both(day(2))], { ...FAST, skillSlotLevels: [2, 3] });
    expect(state.skills.map((s) => s.theme).sort()).toEqual(["endurance", "home"]);
  });

  it("is deterministic: the same night always grants the same Skill", () => {
    const a = play([input(MON)], DEFAULT_TUNING).state.skills;
    const b = play([input(MON)], DEFAULT_TUNING).state.skills;
    expect(a).toEqual(b);
    expect(seeded("p1", MON)()).toBe(seeded("p1", MON)());
  });
});

describe("Skill effects", () => {
  it("adds passive XP in its domains, and caps all Skill bonuses at +50%", () => {
    const held = [{ defId: "long_road", theme: "endurance" as const, tier: 3, grantedLevel: 2 }];
    expect(skillXpBonus(held, CATALOG, "endurance", false, 0.5)).toBeCloseTo(0.3);
    expect(skillXpBonus(held, CATALOG, "home", false, 0.5)).toBe(0);
    const stacked = [...held, { defId: "long_road", theme: "endurance" as const, tier: 3, grantedLevel: 4 }];
    expect(skillXpBonus(stacked, CATALOG, "endurance", false, 0.5)).toBe(0.5);
  });

  it("pays the after-miss bonus only on the first log after a miss", () => {
    const sweep: PlayerState = { ...NEW_PLAYER_STATE, skills: [{ defId: "clean_sweep", theme: "home", tier: 1, grantedLevel: 2 }] };
    const { events } = play(
      [input(MON, [log("ride", MON)]), input(day(1), [log("tidy", day(1))]), input(day(2), [log("tidy", day(2))])],
      DEFAULT_TUNING,
      sweep,
    );
    const tidyXp = xpEvents(events).filter((e) => e.habitId === "tidy");
    expect(tidyXp.map((e) => e.factors.skill)).toEqual([0.25, 0]);
  });

  it("uses a grace charge to mark a missed habit done, with no XP, once per week", () => {
    const mend: PlayerState = { ...NEW_PLAYER_STATE, skills: [{ defId: "mend", theme: "recovery", tier: 1, grantedLevel: 2 }] };
    const { state, events } = play(
      [
        input(MON, [log("tidy", MON)], { choices: { grace: ["ride"] } }),
        input(day(1), [log("tidy", day(1))], { choices: { grace: ["ride"] } }),
        input(day(7), [log("tidy", day(7))], { choices: { grace: ["ride"] } }),
      ],
      DEFAULT_TUNING,
      mend,
    );
    expect(of(events, "grace").map((e) => e.date)).toEqual([MON, day(7)]);
    expect(xpEvents(events).some((e) => e.habitId === "ride")).toBe(false);
    // Monday's ride was graced, so it isn't a miss; Tuesday's was refused, so it is.
    expect(state.history.find((d) => d.date === MON)?.sessions.ride).toBe(1);
    expect(state.history.find((d) => d.date === day(1))?.sessions.ride).toBeUndefined();
  });

  it("ignores grace for a habit already done or with no matching Skill", () => {
    const mend: PlayerState = { ...NEW_PLAYER_STATE, skills: [{ defId: "mend", theme: "recovery", tier: 1, grantedLevel: 2 }] };
    const { events } = play([input(MON, [log("ride", MON)], { choices: { grace: ["ride", "tidy"] } })], DEFAULT_TUNING, mend);
    expect(of(events, "grace")).toEqual([]);
  });
});

describe("the Level 10 capstone", () => {
  const toTen = () => play(Array.from({ length: 9 }, (_, n) => input(day(n), [log("ride", day(n)), log("tidy", day(n)), log("pt", day(n))])));

  it("offers 1 of 2 Skills in different themes and 3 evolutions instead of a plain grant", () => {
    const { state, events } = toTen();
    expect(state.progress.level).toBeGreaterThanOrEqual(10);
    const [offer] = of(events, "skill_choice_offered");
    expect(offer?.options).toHaveLength(2);
    expect(new Set(offer?.options.map((o) => o.skill.theme)).size).toBe(2);
    expect(of(events, "skill_granted").every((e) => e.level < 10)).toBe(true);
    const [evo] = of(events, "evolution_offered");
    expect(evo?.options.map((o) => o.fallbackName)).toHaveLength(3);
    expect(evo?.options[0]?.fallbackName).toMatch(/^\[.+ Rider\]$/);
  });

  it("applies the picks the next night, and the evolution's domain earns full XP", () => {
    const ten = toTen();
    const skill = ten.state.pendingSkillChoice!.options[1]!.skill.defId;
    const evo = ten.state.pendingEvolution!.options.find((o) => o.domain === "home")!;
    const next = play([input(day(9), [log("tidy", day(9))], { choices: { skill, evolution: evo.id } })], FAST, ten.state);
    expect(next.state.pendingSkillChoice).toBeUndefined();
    expect(next.state.evolution).toEqual(evo);
    expect(of(next.events, "skill_granted")[0]?.grant.skill.defId).toBe(skill);
    expect(xpEvents(next.events)[0]?.factors.path).toBe(1);
  });

  it("allows one reroll of the evolution offer", () => {
    const ten = toTen();
    const first = ten.state.pendingEvolution!.options.map((o) => o.id);
    const once = play([input(day(9), [], { choices: { rerollEvolution: true } })], FAST, ten.state);
    const second = once.state.pendingEvolution!;
    expect(second.rerolled).toBe(true);
    expect(second.options.map((o) => o.id)).not.toEqual(first);
    const twice = play([input(day(10), [], { choices: { rerollEvolution: true } })], FAST, once.state);
    expect(twice.state.pendingEvolution).toEqual(second);
  });
});

describe("saved state", () => {
  it("upgrades an unversioned (M0) save", () => {
    const { version: _, skills: __, ...m0 } = NEW_PLAYER_STATE;
    const s = migrateState({ ...m0, lastClosed: MON });
    expect(s).toMatchObject({ version: STATE_VERSION, skills: [], lastClosed: MON });
  });

  it("rejects a save from an unknown future version", () => {
    expect(() => migrateState({ ...NEW_PLAYER_STATE, version: 99 })).toThrow(/version/);
  });

  it("round-trips through JSON (the database stores it as jsonb)", () => {
    const { state } = play([input(MON)], DEFAULT_TUNING);
    expect(migrateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});
