import { readdirSync, readFileSync } from "node:fs";
import { EVOLUTION_QUALIFIERS, SKILL_CATALOG } from "@inn/content";
import { closeDay, DEFAULT_TUNING, NEW_PLAYER_STATE } from "@inn/engine";
import type { Habit } from "@inn/schema";
import { describe, expect, it } from "vitest";
import { narrate, NarrationRejected, NarrationRequest, playerNight, templateMessages, templateNarration, validateNarration } from "../src/index.ts";

const FIXTURES = new URL("../../../prompts/fixtures/", import.meta.url);
const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));
const request = (name: string) => NarrationRequest.parse(fixture(`${name}.request.json`));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("prompt fixtures", () => {
  const requests = readdirSync(FIXTURES).filter((f) => f.endsWith(".request.json"));

  it.each(requests)("%s is a valid request whose template narration validates", (file) => {
    const req = NarrationRequest.parse(fixture(file));
    expect(validateNarration(req, templateNarration(req))).toBeDefined();
  });

  it("accepts a well-behaved Claude answer and keeps its names", () => {
    const out = validateNarration(request("levels"), fixture("levels.claude.json"));
    expect(out.players[0]?.skillNames[0]?.name).toBe("[Floodplain Miles]");
    expect(out.morningScene).toMatch(/Kyle/);
  });
});

describe("validation", () => {
  const req = request("levels");
  const good = fixture("levels.claude.json") as { players: { levelMessages: string[]; skillNames: { text: string; name: string }[] }[]; morningScene: string };

  it("rejects a number the engine didn't produce", () => {
    const bad = clone(good);
    bad.players[0]!.levelMessages[0] = "[Rider Level 7!]";
    expect(() => validateNarration(req, bad)).toThrow(NarrationRejected);
    const scene = clone(good);
    scene.morningScene += "\n\nHe rode 40 kilometers.";
    expect(() => validateNarration(req, scene)).toThrow(/invented numbers/);
  });

  it("rejects a Skill name with digits or no brackets, and unbracketed messages", () => {
    const digits = clone(good);
    digits.players[0]!.skillNames[0]!.name = "[Road 2]";
    expect(() => validateNarration(req, digits)).toThrow(NarrationRejected);
    const plain = clone(good);
    plain.players[0]!.levelMessages[0] = "You reached a new level";
    expect(() => validateNarration(req, plain)).toThrow(/bracketed/);
  });

  it("rejects output for the wrong players", () => {
    const one = clone(good);
    one.players.pop();
    expect(() => validateNarration(req, one)).toThrow(/players/);
  });

  it("fills a missing name and too few messages from the templates", () => {
    const sparse = clone(good);
    sparse.players[0]!.skillNames = [];
    sparse.players[0]!.levelMessages = [];
    const out = validateNarration(req, sparse);
    expect(out.players[0]?.skillNames[0]?.name).toBe("[Long Road]");
    expect(out.players[0]?.levelMessages).toEqual(["[Rider Level 6!]", "[Skill – Long Road obtained!]"]);
  });

  it("rejects a scene longer than 4 paragraphs", () => {
    const long = clone(good);
    long.morningScene = Array.from({ length: 5 }, () => "A paragraph.").join("\n\n");
    expect(() => validateNarration(req, long)).toThrow(/paragraphs/);
  });
});

describe("narrate", () => {
  const req = request("capstone");

  it("uses Claude's text when it validates", async () => {
    const r = await narrate(request("levels"), async () => fixture("levels.claude.json"));
    expect(r.source).toBe("claude");
  });

  it("falls back to templates on any failure, so a night is never lost", async () => {
    const failed = await narrate(req, async () => {
      throw new Error("timeout");
    });
    expect(failed).toMatchObject({ source: "template", error: "timeout" });
    expect(failed.output.players[0]?.levelMessages).toEqual(["[Rider Level 10!]", "[Skill choice: Longer Road or Strong Back]", "[Class evolution available!]"]);
    const none = await narrate(req, undefined);
    expect(none.source).toBe("template");
    const garbage = await narrate(req, async () => ({ hello: "world" }));
    expect(garbage.source).toBe("template");
  });

  it("is deterministic without Claude", async () => {
    expect((await narrate(req, undefined)).output).toEqual((await narrate(req, undefined)).output);
  });
});

describe("facts from a real night", () => {
  const ride: Habit = { id: "ride", name: "Biking", domain: "endurance", tier: "normal", tinyVersion: "a spin" };

  it("turns engine events into the facts Claude sees", () => {
    const { state, events } = closeDay(
      NEW_PLAYER_STATE,
      {
        date: "2027-01-04",
        focusDomains: ["endurance"],
        habits: [ride],
        goals: [{ habitId: "ride", period: "week", target: 3, startDate: "2027-01-04", prescribed: false }],
        pauses: [],
        logs: [{ habitId: "ride", date: "2027-01-04", kind: "full", source: "apple_health", healthWorkoutId: "w1" }],
        playerId: "kyle",
        className: "[Rider]",
        catalog: SKILL_CATALOG,
        qualifiers: EVOLUTION_QUALIFIERS,
      },
      DEFAULT_TUNING,
    );
    const night = playerNight({ playerId: "kyle", name: "Kyle", className: "[Rider]", habits: [ride], skillNames: {} }, state, events, ["ride"]);
    expect(night.levelsGained).toEqual([1, 2]);
    expect(night.skillsGained).toHaveLength(1);
    expect(night.skillsGained[0]?.theme).toBe("endurance");
    expect(night.habitsDone).toEqual(["Biking"]);
    expect(templateMessages(night)[0]).toBe("[Rider Class obtained!]");
  });
});
