import { Domain, Tier } from "@inn/schema";
import { z } from "zod";

/** A ready-made habit offered on day one: the design's five core habits plus sleep later. */
export const StarterHabit = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: Domain,
  tier: Tier,
  tinyVersion: z.string().min(1),
  healthType: z.enum(["cycling", "strength"]).optional(),
  /** False when the habit only ever comes from Apple Health. */
  allowTap: z.boolean(),
  goal: z.object({
    period: z.enum(["day", "week"]),
    target: z.number().int().min(1),
    prescribed: z.boolean(),
  }),
});
export type StarterHabit = z.infer<typeof StarterHabit>;

/** From docs/design.md, "How the core habits are tracked". */
export const STARTER_HABITS: readonly StarterHabit[] = z.array(StarterHabit).parse([
  {
    id: "biking",
    name: "Biking",
    domain: "endurance",
    tier: "normal",
    tinyVersion: "a 10-minute spin",
    healthType: "cycling",
    allowTap: false,
    goal: { period: "week", target: 3, prescribed: false },
  },
  {
    id: "lifting",
    name: "Lifting",
    domain: "strength",
    tier: "normal",
    tinyVersion: "one set",
    healthType: "strength",
    allowTap: false,
    goal: { period: "week", target: 2, prescribed: false },
  },
  {
    id: "eating-well",
    name: "Eating well",
    domain: "nourish",
    tier: "normal",
    tinyVersion: "one good thing: home-cooked, vegetables, protein or water",
    allowTap: true,
    goal: { period: "day", target: 1, prescribed: false },
  },
  {
    id: "tidying",
    name: "Tidying",
    domain: "home",
    tier: "normal",
    tinyVersion: "a 10-minute reset",
    allowTap: true,
    goal: { period: "day", target: 1, prescribed: false },
  },
  {
    id: "physical-therapy",
    name: "Physical therapy",
    domain: "recovery",
    tier: "normal",
    tinyVersion: "one exercise",
    allowTap: true,
    goal: { period: "week", target: 3, prescribed: true },
  },
]);
