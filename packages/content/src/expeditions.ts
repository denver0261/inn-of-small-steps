import { ExpeditionEvent } from "@inn/schema";
import { z } from "zod";

const c = (coins: number, supplies = 0, items?: Record<string, number>) => ({ resources: { coins, ...(supplies ? { supplies } : {}) }, ...(items ? { items } : {}) });

/**
 * The hand-written Tier 1 pool: short outings around Liscor. An outing draws three. The
 * design's nightly Claude-written decks will add to this; the pool is always the fallback.
 * Loot is FLAGGED (decision 0011).
 */
export const TIER1_EVENTS: readonly ExpeditionEvent[] = z.array(ExpeditionEvent).parse([
  {
    id: "market_spill", tier: 1, place: "Market Street",
    setup: "A Gnoll trader's cart tips at the corner and apples go bouncing toward the gutter.",
    choices: [
      { label: "Chase them down", theme: "endurance", difficulty: 9, success: { text: "You catch most before the drain does. The trader presses coins into your hand.", loot: c(6) }, failure: { text: "Half end up in the gutter. The trader shrugs and gives you one anyway.", loot: c(1) } },
      { label: "Help right the cart", theme: "strength", difficulty: 11, success: { text: "The cart rights with a groan. The trader insists you take a sack of bruised apples.", loot: c(3, 3) }, failure: { text: "It doesn't budge until three Drakes join in. Still, thanks are thanks.", loot: c(2) } },
    ],
  },
  {
    id: "watch_errand", tier: 1, place: "The Watch barracks",
    setup: "A harried Drake sergeant needs a message carried to the east gate before the shift changes.",
    choices: [
      { label: "Run it", theme: "endurance", difficulty: 10, success: { text: "You make the gate with time to spare. The sergeant remembers faces like yours.", loot: c(7) }, failure: { text: "The shift has changed by the time you arrive. The message gets there anyway.", loot: c(2) } },
      { label: "Take the long, safe way", theme: "mind", difficulty: 7, success: { text: "Slower, but you learn three shortcuts on the way.", loot: c(5) }, failure: { text: "You get properly lost behind the tanneries. A child walks you out.", loot: c(1) } },
    ],
  },
  {
    id: "herb_patch", tier: 1, place: "The Floodplains",
    setup: "After the rains, the low ground outside the walls is thick with useful green things.",
    choices: [
      { label: "Gather carefully", theme: "recovery", difficulty: 8, success: { text: "You come back with an armful of herbs and only mild nettle rash.", loot: c(0, 3, { herbs: 2 }) }, failure: { text: "Half of what you picked turns out to be weeds.", loot: c(0, 1) } },
      { label: "Gather fast and wide", theme: "endurance", difficulty: 12, success: { text: "You cover twice the ground before the light goes.", loot: c(0, 5, { herbs: 3 }) }, failure: { text: "You cover the ground. The herbs were elsewhere.", loot: c(0, 1) } },
    ],
  },
  {
    id: "rock_crab", tier: 1, place: "The Floodplains",
    setup: "A boulder by the stream has legs. Too many legs. It hasn't noticed you yet.",
    choices: [
      { label: "Back away slowly", theme: "spirit", difficulty: 6, success: { text: "You leave the rock crab to its afternoon. Some fights aren't yours.", loot: c(2) }, failure: { text: "It notices. You run. You are faster, just.", loot: {} } },
      { label: "Pry off a shed shell", theme: "strength", difficulty: 14, success: { text: "You haul home an old shell and, somehow, a claw it was done with.", loot: c(4, 2, { crab_shell: 1, claw_trophy: 1 }) }, failure: { text: "The crab objects. You come home with a story and a bruise.", loot: c(1) } },
    ],
  },
  {
    id: "inn_kitchen", tier: 1, place: "The Wandering Inn",
    setup: "The kitchen up the hill is short a pair of hands for the lunch rush.",
    choices: [
      { label: "Peel and chop", theme: "nourish", difficulty: 8, success: { text: "Mountains of potatoes later, you're fed and paid.", loot: c(5, 2) }, failure: { text: "You're slow, but nobody loses a finger.", loot: c(2) } },
      { label: "Carry plates", theme: "endurance", difficulty: 10, success: { text: "Not one dropped. The regulars tip well.", loot: c(8) }, failure: { text: "One dropped. It was a Minotaur's. He was gracious about it.", loot: c(2) } },
    ],
  },
  {
    id: "wall_stairs", tier: 1, place: "The city walls",
    setup: "A Watch recruit bets you can't run the wall stairs faster than him.",
    choices: [
      { label: "Race him", theme: "endurance", difficulty: 12, success: { text: "You win by a step. He pays up in coin and a badge he probably shouldn't give away.", loot: c(5, 0, { watch_badge: 1 }) }, failure: { text: "He wins by a flight. You buy the drinks.", loot: {} } },
      { label: "Decline politely", theme: "spirit", difficulty: 5, success: { text: "You watch him race himself. He wins.", loot: c(1) }, failure: { text: "He calls you something in Drake. You don't ask what it means.", loot: {} } },
    ],
  },
  {
    id: "goblin_trail", tier: 1, place: "The Floodplains",
    setup: "Small footprints and a cookfire's smoke. Goblins, not raiders by the look of it. Hungry ones.",
    choices: [
      { label: "Leave them some food", theme: "bonds", difficulty: 7, success: { text: "The next morning there's a note on your step. Mostly drawings. The meaning is clear.", loot: { items: { goblin_note: 1 } } }, failure: { text: "The food is gone by evening. No note. Maybe next time.", loot: {} } },
      { label: "Steer well clear", theme: "mind", difficulty: 6, success: { text: "You take the high ground home and find a clutch of herbs on the way.", loot: c(0, 2, { herbs: 1 }) }, failure: { text: "You get turned around in the reeds and come home soaked.", loot: {} } },
    ],
  },
  {
    id: "lost_cat", tier: 1, place: "A side street",
    setup: "An old Drake lady's cat is on a roof, and she is very sure you're the one to fetch it.",
    choices: [
      { label: "Climb up", theme: "strength", difficulty: 11, success: { text: "Cat retrieved. You're scratched, paid and invited to tea.", loot: c(6) }, failure: { text: "The cat comes down on its own the moment you're stuck. You are not.", loot: c(1) } },
      { label: "Coax it down", theme: "spirit", difficulty: 9, success: { text: "Patience wins. The lady approves of patience.", loot: c(5) }, failure: { text: "The cat is unmoved. So, eventually, are you.", loot: {} } },
    ],
  },
  {
    id: "flood_debris", tier: 1, place: "The north gate",
    setup: "The last flood left timber piled against the gate. The Watch is paying by the cartload.",
    choices: [
      { label: "Haul timber", theme: "strength", difficulty: 10, success: { text: "Three cartloads. Your back files a complaint.", loot: c(6, 4) }, failure: { text: "One cartload and a splinter the size of a pencil.", loot: c(2, 1) } },
      { label: "Sort what's worth keeping", theme: "craft", difficulty: 9, success: { text: "You find good boards among the rot and keep a few.", loot: c(3, 6) }, failure: { text: "It's mostly rot.", loot: c(1, 1) } },
    ],
  },
  {
    id: "scribe_copy", tier: 1, place: "A scribe's shop",
    setup: "A scribe needs a ledger copied before a merchant comes calling.",
    choices: [
      { label: "Copy it neatly", theme: "mind", difficulty: 10, success: { text: "Clean columns, no blots. The scribe pays and eyes you as a future hire.", loot: c(8) }, failure: { text: "One blot. The scribe sighs and pays you half.", loot: c(3) } },
      { label: "Copy it quickly", theme: "craft", difficulty: 12, success: { text: "Done before the merchant arrives, and legible besides.", loot: c(9) }, failure: { text: "Fast, yes. Legible, debatable.", loot: c(2) } },
    ],
  },
  {
    id: "well_bucket", tier: 1, place: "The neighborhood well",
    setup: "The well's crank has jammed and the whole street is waiting with empty buckets.",
    choices: [
      { label: "Force it", theme: "strength", difficulty: 12, success: { text: "It gives with a crack. The street cheers. Someone brings you bread.", loot: c(3, 3) }, failure: { text: "It doesn't give. A Gnoll smith arrives with oil and a look.", loot: c(1) } },
      { label: "Take it apart", theme: "craft", difficulty: 10, success: { text: "A bent pin, nothing more. You're the street's hero for a day.", loot: c(5, 2) }, failure: { text: "You find three bent pins and lose one.", loot: c(1) } },
    ],
  },
  {
    id: "bread_line", tier: 1, place: "The bakery",
    setup: "The baker's apprentice is sick and the morning loaves won't knead themselves.",
    choices: [
      { label: "Knead", theme: "nourish", difficulty: 9, success: { text: "Forty loaves. Your arms ache. The baker sends you home with a sack of flour.", loot: c(3, 5) }, failure: { text: "The loaves are flat. Edible, but flat.", loot: c(2, 1) } },
      { label: "Run the counter", theme: "bonds", difficulty: 8, success: { text: "You remember every regular's name by noon.", loot: c(6) }, failure: { text: "You remember none of them. They remember you.", loot: c(2) } },
    ],
  },
  {
    id: "dawn_patrol", tier: 1, place: "Outside the walls",
    setup: "The Watch wants someone to walk the outer road at dawn and report anything odd.",
    choices: [
      { label: "Walk the whole loop", theme: "endurance", difficulty: 11, success: { text: "Nothing odd but a very large heron. The sergeant pays anyway.", loot: c(7) }, failure: { text: "You turn back halfway with a blister. Half pay.", loot: c(3) } },
      { label: "Watch from a rise", theme: "rest", difficulty: 8, success: { text: "You see the whole plain go gold. And a cart with a broken axle, which you report.", loot: c(5) }, failure: { text: "You may have dozed. The cart reports itself.", loot: c(1) } },
    ],
  },
  {
    id: "shrine_sweep", tier: 1, place: "A small shrine",
    setup: "An old shrine near the walls has been neglected. Its keeper is too frail to sweep it.",
    choices: [
      { label: "Sweep it clean", theme: "home", difficulty: 7, success: { text: "It shines by the end. The keeper blesses you, which costs nothing and feels like something.", loot: c(3, 0) }, failure: { text: "You do your best. The dust does its best too.", loot: c(1) } },
      { label: "Sit with the keeper", theme: "spirit", difficulty: 8, success: { text: "You hear stories older than the walls. You leave lighter.", loot: { resources: { mana: 3 } } }, failure: { text: "The keeper falls asleep mid-story. You let them.", loot: { resources: { mana: 1 } } } },
    ],
  },
  {
    id: "smithy_bellows", tier: 1, place: "A Gnoll smithy",
    setup: "The smith needs someone on the bellows for an afternoon of shoeing.",
    choices: [
      { label: "Work the bellows", theme: "strength", difficulty: 9, success: { text: "Hot, loud, honest work. The smith pays in coin and scrap iron.", loot: c(5, 3) }, failure: { text: "You find the rhythm late. The smith is patient, mostly.", loot: c(2) } },
      { label: "Watch and learn", theme: "craft", difficulty: 11, success: { text: "By the end you could shoe a horse. Probably. The smith lets you keep offcuts.", loot: c(2, 5) }, failure: { text: "You learn mostly that it's hot.", loot: c(1) } },
    ],
  },
  {
    id: "riverbank_fish", tier: 1, place: "The river",
    setup: "The fish are running, and a Gnoll family has more net than hands.",
    choices: [
      { label: "Haul nets", theme: "strength", difficulty: 10, success: { text: "A good catch. They share it.", loot: c(2, 5) }, failure: { text: "You fall in. The fish are delighted.", loot: c(0, 1) } },
      { label: "Clean the catch", theme: "nourish", difficulty: 8, success: { text: "Quick knife, clean work. You go home with supper.", loot: c(3, 4) }, failure: { text: "Slow knife. Still supper.", loot: c(1, 2) } },
    ],
  },
  {
    id: "lost_child", tier: 1, place: "The market",
    setup: "A small Drake child is crying by the fountain, very sure their mother has been eaten.",
    choices: [
      { label: "Search the stalls", theme: "endurance", difficulty: 9, success: { text: "Mother found, uneaten, buying turnips. You get a hug and a coin.", loot: c(4) }, failure: { text: "The mother finds you both. She's grateful and a bit suspicious.", loot: c(1) } },
      { label: "Stay and calm them", theme: "bonds", difficulty: 7, success: { text: "Tears stop. Mother appears. You've made a friend for life, aged five.", loot: { resources: { coins: 3, goodwill: 1 } } }, failure: { text: "Tears continue until the mother arrives. Loudly.", loot: c(1) } },
    ],
  },
  {
    id: "garden_weeds", tier: 1, place: "A neighbor's garden",
    setup: "Your neighbor's vegetable patch is losing a war with the weeds.",
    choices: [
      { label: "Weed it", theme: "home", difficulty: 8, success: { text: "Victory. The neighbor sends you home with a basket.", loot: c(1, 4) }, failure: { text: "You pull a carrot by mistake. And then another.", loot: c(0, 1) } },
      { label: "Ask what grows best", theme: "mind", difficulty: 9, success: { text: "You learn more about Liscor's soil than you knew existed, and get seeds.", loot: c(1, 3, { herbs: 1 }) }, failure: { text: "The answer takes an hour. You nod a lot.", loot: c(1) } },
    ],
  },
]);
