/**
 * Hand-written morning scenes for nights when Claude's text can't be used. `{names}` is
 * the players' names joined with "and", `{house}` the house name. No numbers: the level
 * messages carry those.
 */
export const FALLBACK_SCENES: Readonly<Record<"levels" | "quiet" | "comeback", readonly string[]>> = {
  levels: [
    "{names} wake in {house} to the System's quiet voice still ringing in their ears. Outside, Liscor's walls catch the first light, and the street below is already full of Drakes and Gnolls arguing over the price of bread.\n\nSomething in them has shifted overnight. It's a small change, but they can feel it.",
    "The morning bell from the Watch barracks carries over the rooftops. In {house}, {names} lie awake a moment longer, turning the night's messages over like coins.\n\nDown the hill, someone at the Wandering Inn is already frying eggs.",
    "Dawn comes grey over the Floodplains. {names} sit up in {house} with the strange certainty that yesterday counted for something.\n\nThe System doesn't explain itself. It never does.",
  ],
  quiet: [
    "A quiet night in {house}. No voice in the dark, no messages, only rain on the roof and a cart rattling past toward the market.\n\n{names} sleep well enough. Small steps are still steps.",
    "Liscor wakes slowly. In {house}, {names} find the morning ordinary: the same cracked shutters, the same smell of bread from the bakery on the corner.\n\nThe System has nothing to say today. Tomorrow it might.",
  ],
  comeback: [
    "{names} come home to {house} after days away. The dust has settled a little thicker, but the door still opens, and the beds are where they left them.\n\nThe System notices. It always does. Tonight it seems almost glad.",
  ],
};
