import { ItemDef, Recipe, Upgrade } from "@inn/schema";
import { z } from "zod";

/**
 * The house upgrade ladder (docs/design.md, "House upgrades"). Step 1 is where everyone
 * starts. Costs are FLAGGED (decision 0011): tuned so a steady pair builds the kitchen in
 * the first week and the guest room near Level 10.
 */
export const UPGRADES: readonly Upgrade[] = z.array(Upgrade).parse([
  { id: "cots", step: 1, name: "Two cleared rooms", description: "Somewhere to sleep, if not much else.", cost: {}, scene: "Two rooms are cleared, with a cot in each and a window that mostly shuts." },
  { id: "kitchen", step: 2, name: "Working kitchen", description: "A real stove. Unlocks kitchen recipes.", cost: { coins: 100, supplies: 50 }, scene: "The kitchen works now: a stove that draws, a table with four legs, a shelf of chipped bowls." },
  { id: "yard", step: 3, name: "Training yard", description: "A swept yard out back. The Watch notices.", cost: { coins: 300, supplies: 150 }, scene: "Out back, the yard is swept and a straw dummy leans against the wall, already a little battered." },
  { id: "shed", step: 4, name: "Supply shed", description: "Room to store what you bring home.", cost: { coins: 550, supplies: 250 }, scene: "A supply shed stands by the gate, its door on new hinges, crates stacked neatly inside." },
  { id: "garden", step: 5, name: "Garden", description: "Optional. Needs someone with a Spirit Skill to tend it.", cost: { coins: 400, supplies: 150, mana: 60 }, needsSkillTheme: "spirit", scene: "A small garden grows where the rubble was. Something in it hums faintly at night." },
  { id: "guest_room", step: 6, name: "Guest room and the door", description: "A spare room, and a door that opens onto the Wandering Inn.", cost: { coins: 900, supplies: 400, mana: 80 }, scene: "There's a guest room now, and a plain door in the hall that opens onto the Wandering Inn up the hill." },
]);

/** Everything that can land in the shared stash. */
export const ITEMS: readonly ItemDef[] = z.array(ItemDef).parse([
  { id: "herbs", name: "Floodplain herbs", kind: "bulk", description: "Bitter, useful, everywhere after the rains." },
  { id: "crab_shell", name: "Rock crab shell", kind: "bulk", description: "Heavier than it looks. Someone will buy it." },
  { id: "stew", name: "Floodplains stew", kind: "food", stamina: 5, description: "Whatever was in the pot, and better for it." },
  { id: "trail_bread", name: "Trail bread", kind: "food", stamina: 8, description: "Dense enough to stop an arrow." },
  { id: "breakfast", name: "Hearty breakfast", kind: "food", stamina: 12, description: "Eggs, bread and a sausage of uncertain origin." },
  { id: "platter", name: "Guest platter", kind: "food", stamina: 4, goodwill: 3, description: "Made for sharing. Visitors remember a meal like this." },
  { id: "claw_trophy", name: "Mounted rock crab claw", kind: "trophy", description: "It took two of you to carry it home." },
  { id: "watch_badge", name: "A Watch recruit's spare badge", kind: "trophy", description: "Given in thanks, and not strictly allowed." },
  { id: "goblin_note", name: "A Goblin's thank-you note", kind: "trophy", description: "Mostly drawings. The meaning is clear." },
]);

export const RECIPES: readonly Recipe[] = z.array(Recipe).parse([
  { id: "stew", name: "Floodplains stew", station: "cookfire", cost: { supplies: 4 }, output: { itemId: "stew", qty: 2 }, description: "Two bowls. +5 stamina each, eaten the night after." },
  { id: "trail_bread", name: "Trail bread", station: "cookfire", cost: { supplies: 5, coins: 2 }, output: { itemId: "trail_bread", qty: 2 }, description: "Two loaves. +8 stamina each." },
  { id: "breakfast", name: "Hearty breakfast", station: "kitchen", cost: { supplies: 8, coins: 4 }, output: { itemId: "breakfast", qty: 2 }, description: "Two plates. +12 stamina each." },
  { id: "platter", name: "Guest platter", station: "kitchen", cost: { supplies: 10, coins: 6 }, output: { itemId: "platter", qty: 1 }, description: "For visitors. +3 goodwill when served." },
]);

/** How a real room's chores show in its Liscor twin. Only a look: it never takes anything away. */
export const ROOM_LOOKS: Readonly<Record<"tidy" | "dusty" | "cluttered", string>> = {
  tidy: "The {room} is in good order.",
  dusty: "Dust is gathering in the {room}.",
  cluttered: "The {room} has gone to clutter; you'll want to set it right.",
};

export function upgrade(id: string): Upgrade {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`unknown upgrade: ${id}`);
  return u;
}

export function item(id: string): ItemDef {
  const i = ITEMS.find((x) => x.id === id);
  if (!i) throw new Error(`unknown item: ${id}`);
  return i;
}
