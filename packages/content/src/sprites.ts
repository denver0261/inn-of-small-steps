/**
 * Pixel characters, drawn as text. Each row is one line of pixels; each character is a palette key,
 * and "." is see-through. A character is the base body, recolored and topped by its class outfit.
 * Gear later adds more overlays on top (decision 0019).
 */

export const SPRITE_WIDTH = 16;
export const SPRITE_HEIGHT = 20;

/**
 * k outline · h hair · s skin · S skin shade · e eyes · c cloth · C cloth shade · b belt · p legs · f boots
 */
export const BASE_BODY: readonly string[] = [
  "................",
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...ksessssesk...",
  "...kssssssssk...",
  "...ksssSSsssk...",
  "....kssssssk....",
  ".....kkkkkk.....",
  "...kcccccccck...",
  "..kcccccccccck..",
  "..kcCccccccCck..",
  "..ksccccccccsk..",
  "...kbbbbbbbbk...",
  "...kcccccccck...",
  "....kppkkppk....",
  "....kppkkppk....",
  "....kffkkffk....",
  "....kkkkkkkk....",
];

/** Fixed colors shared by every character and outfit. */
export const SPRITE_PALETTE: Readonly<Record<string, string>> = {
  k: "#14110f",
  s: "#e8b48a",
  S: "#c98d66",
  e: "#14110f",
  m: "#b9c0c9",
  M: "#6f7884",
  g: "#f7a71b",
  r: "#a33b2b",
  w: "#f2ede4",
  a: "#e9e2d3",
  l: "#7a5232",
  G: "#4f7a3a",
  P: "#4b3a78",
};

/** Hair colors, picked per player until players can choose their own look. */
export const HAIR_COLORS: readonly string[] = ["#5a3a22", "#2a211c", "#c9a052", "#9a4a24", "#7d7468"];

export interface Outfit {
  /** Colors for the base body's cloth (c, C), belt (b), legs (p) and boots (f). */
  colors: { c: string; C: string; b: string; p: string; f: string };
  /** Rows drawn over the body, by row index. "." keeps what's below. */
  overlay: Readonly<Record<number, string>>;
}

/** One outfit per class path, plus the Earther's plain clothes before the first night. */
export const OUTFITS: Readonly<Record<string, Outfit>> = {
  earther: { colors: { c: "#7d8591", C: "#626a75", b: "#3b2a1e", p: "#4a4f58", f: "#2e2620" }, overlay: {} },
  warrior: {
    colors: { c: "#7a3b2e", C: "#5c2b21", b: "#6b4a2e", p: "#4a4038", f: "#2e2620" },
    overlay: {
      10: "..mmm......mmm..",
      11: "..mM........Mm..",
      14: ".......gg.......",
    },
  },
  rider: {
    colors: { c: "#3c5a86", C: "#2c4466", b: "#6b4a2e", p: "#5b5048", f: "#3b2a1e" },
    overlay: {
      10: "....rrrrrrrr....",
      11: "....r...........",
      12: "....r...........",
    },
  },
  housekeeper: {
    colors: { c: "#6b7f5a", C: "#55664a", b: "#e9e2d3", p: "#6b7f5a", f: "#3b2a1e" },
    overlay: {
      2: "....rrrrrrrr....",
      12: ".....aaaaaa.....",
      13: ".....aaaaaa.....",
      15: ".....aaaaaa.....",
    },
  },
  chef: {
    colors: { c: "#e9e2d3", C: "#c9c0ae", b: "#a33b2b", p: "#4a4038", f: "#2e2620" },
    overlay: {
      0: "....wwwwwwww....",
      1: "...wwwwwwwwww...",
      2: "...kwwwwwwwwk...",
      10: ".......rr.......",
    },
  },
  monk: {
    colors: { c: "#c77a2e", C: "#9e5e22", b: "#5c2b21", p: "#c77a2e", f: "#6b4a2e" },
    overlay: {
      11: "......gggg......",
    },
  },
  mage: {
    colors: { c: "#4b3a78", C: "#382b5c", b: "#f7a71b", p: "#382b5c", f: "#2e2620" },
    overlay: {
      0: ".......PP.......",
      1: "......PPPP......",
      2: "..PPPPPPPPPPPP..",
      16: "....kcccccck....",
      17: "....kcccccck....",
    },
  },
  artisan: {
    colors: { c: "#8a6a3e", C: "#6b5230", b: "#3b2a1e", p: "#4a4038", f: "#2e2620" },
    overlay: {
      12: ".....llllll..MM.",
      13: ".....llllll..l..",
      15: ".....llllll.....",
    },
  },
  bard: {
    colors: { c: "#a33b2b", C: "#7d2c20", b: "#f7a71b", p: "#3c5a86", f: "#3b2a1e" },
    overlay: {
      0: "...........w....",
      1: "....GGGGGGGGw...",
      2: "...GGGGGGGGGG...",
    },
  },
  druid: {
    colors: { c: "#4f7a3a", C: "#3b5c2b", b: "#8a6a3e", p: "#3b5c2b", f: "#3b2a1e" },
    overlay: {
      2: "....G.G..G.G....",
      16: "....kcccccck....",
      17: "....kcccccck....",
    },
  },
};
