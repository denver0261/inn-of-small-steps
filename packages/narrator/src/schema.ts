import { Domain, LocalDate } from "@inn/schema";
import { z } from "zod";

/** A bracketed System name, e.g. "[Long Road]" or "[Hearth Rider]". Never digits: names carry no numbers. */
export const SystemName = z.string().regex(/^\[[^\]\d]{1,38}\]$/, "a bracketed name of up to 38 characters, no digits");

/** One player's night, as plain facts. Every number Claude may use appears here. */
export const PlayerNight = z.object({
  playerId: z.string().min(1),
  name: z.string().min(1),
  /** The class as shown, e.g. "[Rider]" or an evolved "[Hearth Rider]". */
  className: z.string().min(1),
  level: z.number().int().min(0),
  levelsGained: z.array(z.number().int().min(1)),
  /** Skills granted or upgraded tonight. `summary` has its numbers filled in. */
  skillsGained: z.array(
    z.object({
      defId: z.string().min(1),
      tier: z.number().int().min(1),
      upgradedFrom: z.object({ tier: z.number().int().min(1), name: z.string().min(1) }).optional(),
      theme: Domain,
      summary: z.string().min(1),
      fallbackName: SystemName,
    }),
  ),
  /** The Level 10 Skill choice, waiting for the player. */
  skillChoice: z.array(z.object({ defId: z.string().min(1), tier: z.number().int().min(1), theme: Domain, summary: z.string().min(1), fallbackName: SystemName })),
  /** The Level 10 evolution offer, waiting for the player. */
  evolutionOffer: z.array(z.object({ optionId: z.string().min(1), domain: Domain, fallbackName: SystemName })),
  evolutionChosen: z.string().optional(),
  /** Habit names done today, for the story. */
  habitsDone: z.array(z.string()),
  /** Habit names marked done with a grace-day Skill. */
  graced: z.array(z.string()),
  comebackAfterDays: z.number().int().min(1).optional(),
  /** Names of every Skill held, for flavor. */
  skillsHeld: z.array(z.string()),
});
export type PlayerNight = z.infer<typeof PlayerNight>;

export const NarrationRequest = z.object({
  date: LocalDate,
  householdName: z.string().min(1),
  players: z.array(PlayerNight).min(1),
  /** The last few morning scenes, oldest first, so the story continues. */
  recentScenes: z.array(z.string()).max(7),
});
export type NarrationRequest = z.infer<typeof NarrationRequest>;

/** What Claude returns. Names and prose only: the engine already decided every number. */
export const NarrationOutput = z.object({
  players: z.array(
    z.object({
      playerId: z.string(),
      levelMessages: z.array(z.string().min(1).max(120)).max(10),
      skillNames: z.array(z.object({ defId: z.string(), tier: z.number().int(), name: SystemName, text: z.string().min(1).max(240) })),
      evolutionNames: z.array(z.object({ optionId: z.string(), name: SystemName, text: z.string().min(1).max(240) })),
    }),
  ),
  morningScene: z.string().min(1).max(1600),
});
export type NarrationOutput = z.infer<typeof NarrationOutput>;

export interface Narration {
  output: NarrationOutput;
  source: "claude" | "template";
  /** Why Claude's text wasn't used, when it wasn't. */
  error?: string;
}
