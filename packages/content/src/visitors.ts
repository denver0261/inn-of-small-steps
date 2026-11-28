import { InnScene, Recruit, VisitorTemplate } from "@inn/schema";
import { z } from "zod";

/**
 * Who knocks on the door. Every quest is measured from habits the players already log,
 * so a quest is a nudge, never a new chore list. No quest ever asks for more physical
 * therapy than prescribed: the game never raises a prescribed goal.
 * Rewards are FLAGGED (decision 0014).
 */
export const VISITORS: readonly VisitorTemplate[] = z.array(VisitorTemplate).parse([
  {
    id: "gnoll_butcher", name: "A Gnoll butcher from the market", rarity: "common", fromInn: false,
    line: "She leans on your doorframe, sniffing. \"Humans eat like birds. I bet you cannot eat something green every day for three days.\"",
    quest: { kind: "daily_domain", domain: "nourish", target: 3, days: 4, coop: false, ask: "Eat well three days running." },
    reward: { resources: { goodwill: 3, supplies: 15 } },
    thanks: "She hands over a parcel of good cuts, grumbling that she lost the bet on purpose.",
  },
  {
    id: "watch_sergeant", name: "A Drake Watch sergeant", rarity: "uncommon", needsUpgrade: "yard", fromInn: false,
    line: "He eyes the training yard. \"Not bad. I need a sparring partner who shows up. Three sessions this week, and I'll believe you.\"",
    quest: { kind: "domain_count", domain: "strength", target: 3, days: 7, coop: false, ask: "Lift three times this week." },
    reward: { resources: { goodwill: 4, coins: 40 }, recruit: "watch_recruit" },
    thanks: "He grunts something that might be approval and sends a recruit to help around the yard.",
  },
  {
    id: "antinium_worker", name: "An Antinium Worker", rarity: "uncommon", fromInn: false,
    line: "It stands very still in the hall. \"Why do humans tidy? I wish to observe. One room, every day, for five days.\"",
    quest: { kind: "daily_domain", domain: "home", target: 5, days: 6, coop: false, ask: "Tidy something every day for five days." },
    reward: { resources: { goodwill: 4, supplies: 20 }, recruit: "worker" },
    thanks: "It says it understands now. It does not. It offers to help anyway, and it is very good at it.",
  },
  {
    id: "hungry_goblins", name: "Two Goblins at the back gate", rarity: "common", fromInn: false,
    line: "They don't knock. They just wait, very politely for Goblins, looking at your kitchen window.",
    quest: { kind: "domain_count", domain: "nourish", target: 4, days: 7, coop: true, ask: "Between you, eat well four times this week." },
    reward: { resources: { goodwill: 5, mana: 5 } },
    thanks: "The plates come back licked clean, with a small bundle of herbs left on the step.",
  },
  {
    id: "courier", name: "A City Runner catching her breath", rarity: "common", fromInn: false,
    line: "\"Long legs, long roads. You two look like you could use more of both. Three rides between you this week?\"",
    quest: { kind: "domain_count", domain: "endurance", target: 3, days: 7, coop: true, ask: "Between you, ride three times this week." },
    reward: { resources: { goodwill: 3, coins: 30 } },
    thanks: "She leaves a map of the roads around Liscor, with the good shortcuts marked.",
  },
  {
    id: "landlord", name: "Your Drake landlord", rarity: "common", fromInn: false,
    line: "He runs a claw along the windowsill and looks at it. \"The lease says 'kept in good order.' Ten chores between you this week should do it.\"",
    quest: { kind: "chores", target: 10, days: 7, coop: true, ask: "Between you, check off ten chores this week." },
    reward: { resources: { goodwill: 4, coins: 50 } },
    thanks: "He knocks a little off next month's rent. He does not smile, but he thinks about it.",
  },
  {
    id: "student_mage", name: "A tired student from Wistram", rarity: "rare", fromInn: true,
    line: "She has ink on her scales and three books under one arm. \"I need a study partner who won't quit. Study three times this week?\"",
    quest: { kind: "domain_count", domain: "mind", target: 3, days: 7, coop: false, ask: "Study or read three times this week." },
    reward: { resources: { goodwill: 4, mana: 20 } },
    thanks: "She leaves you a page of her notes. It's in a cipher, and it hums.",
  },
  {
    id: "inn_regular", name: "A regular from the Wandering Inn", rarity: "common", fromInn: true,
    line: "\"Erin sent me. Said you two keep odd hours and might want company. Show up for yourselves this week: something good, every day, for three days.\"",
    quest: { kind: "daily_domain", domain: "nourish", target: 3, days: 5, coop: true, ask: "Between you, eat well three days running." },
    reward: { resources: { goodwill: 5, coins: 20 } },
    thanks: "They bring back word that there's a table kept for you at the Inn now.",
  },
  {
    id: "quiet_gardener", name: "An old Gnoll with soil on her paws", rarity: "rare", fromInn: true, needsUpgrade: "garden",
    line: "She kneels by your garden. \"It grows for patient people. Sit with it a while, a few mornings this week.\"",
    quest: { kind: "domain_count", domain: "spirit", target: 3, days: 7, coop: false, ask: "Three quiet moments this week: meditate, journal, or just sit." },
    reward: { resources: { goodwill: 5, mana: 25 }, recruit: "gardener" },
    thanks: "She stays to tend the garden, and the humming at night grows softer.",
  },
  {
    id: "dawn_rider", name: "A Courier passing through at dawn", rarity: "rare", fromInn: true,
    line: "\"Every road starts with getting out the door. Five rides between you this week, and I'll tell you about the High Passes.\"",
    quest: { kind: "domain_count", domain: "endurance", target: 5, days: 7, coop: true, ask: "Between you, ride five times this week." },
    reward: { resources: { goodwill: 6, coins: 60 } },
    thanks: "The stories about the High Passes are terrifying. You want to go anyway.",
  },
]);

export const RECRUITS: readonly Recruit[] = z.array(Recruit).parse([
  { id: "watch_recruit", name: "A Watch recruit", description: "Drills in your yard and sweeps it after.", perNight: { coins: 3 } },
  { id: "worker", name: "An Antinium Worker", description: "Tidies with alarming thoroughness.", perNight: { supplies: 2 } },
  { id: "gardener", name: "The old gardener", description: "Tends the garden; it gives back.", perNight: { mana: 2 } },
]);

/** Evenings at the Wandering Inn. Cameos only; the prose is original. */
export const INN_SCENES: readonly InnScene[] = z.array(InnScene).parse([
  { id: "erin_pasta", text: "Erin is trying a new pasta. It's good. She watches every bite and asks you three times whether it's good. It is." },
  { id: "chess", text: "Someone has left a chess game half-finished by the window. You play a few moves. Someone else, later, will finish it." },
  { id: "rainy_night", text: "Rain on the windows, a fire in the hearth, and a Gnoll telling a story you don't believe a word of. A good evening." },
  { id: "drake_argument", text: "Two Drakes argue about whose city has the better walls. Everyone else agrees it's Liscor, mostly to end it." },
  { id: "quiet_corner", text: "You find a quiet corner and a mug of something warm. Nobody asks you for anything. It's exactly what you needed." },
  { id: "music", text: "A traveling musician plays something sad and then something that makes half the room stamp along. You stay for both." },
  { id: "regulars", text: "The regulars nod when you come in now. You're not new anymore. Not quite." },
]);

export function visitor(id: string): VisitorTemplate {
  const v = VISITORS.find((x) => x.id === id);
  if (!v) throw new Error(`unknown visitor: ${id}`);
  return v;
}
