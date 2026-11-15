export type SkinId = "paper" | "slate" | "blueprint" | "phosphor" | "anodized";

export interface Skin {
  id: SkinId;
  name: string;
  tagline: string;
  /** What the skin is built from, in one line. */
  recipe: string;
  swatches: string[];
}

export const SKINS: Skin[] = [
  {
    id: "paper",
    name: "Paper",
    tagline: "Warm flat paper. The app's Light theme.",
    recipe: "Cotton stock: slips of card one ply thick, blind-embossed toolbar keys that deboss under the finger, flat ink-block colour, perforated dividers, debossed wells.",
    swatches: ["#e5e0d8", "#f1eee9", "#2a2520", "#4aaa4a", "#d86840"],
  },
  {
    id: "slate",
    name: "Slate",
    tagline: "Cool graphite pro-tool. Borders and soft layered shadows, no texture.",
    recipe: "1px white-alpha borders, two-layer shadows, blue accent, tabular numerals.",
    swatches: ["#15171c", "#1e2128", "#e6e8ee", "#5b8def", "#e5675a"],
  },
  {
    id: "blueprint",
    name: "Blueprint",
    tagline: "Cobalt drafting sheet. The app's Blueprint theme.",
    recipe: "Drafting sheet: inked rectangles with one offset line, hover sketches a hatch, pressing cross-hatches the face, construction-line ghost keys, dimension-line sliders, registration marks.",
    swatches: ["#1b4f8a", "#1f5894", "#f3f8fc", "#9fe0f7", "#ffd166"],
  },
  {
    id: "phosphor",
    name: "Phosphor",
    tagline: "CRT terminal. Green phosphor on black, scanlines over every panel.",
    recipe: "Glow text, inverted-block selection, bracketed tooltips, blinking caret, 2px corners, all mono.",
    swatches: ["#070a08", "#0c110d", "#8af5a8", "#4f9a63", "#ffd36a"],
  },
  {
    id: "anodized",
    name: "Anodized",
    tagline: "Dark machined instrument. The app's Dark theme.",
    recipe: "Matte graphite: soft dished keys on a solid wall that sink and lean under the finger, shallow wells, round caps, one amber lamp colour, no ornament.",
    swatches: ["#1b1c1f", "#2a2c30", "#ebe8e1", "#f2a33a", "#ff6b57"],
  },
];
