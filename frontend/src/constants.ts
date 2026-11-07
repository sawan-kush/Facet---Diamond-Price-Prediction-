import type { Clarity, Color, Cut, DiamondInput } from "./types";

export const CUTS: Cut[] = ["Fair", "Good", "Very Good", "Premium", "Ideal"];
export const COLORS: Color[] = ["D", "E", "F", "G", "H", "I", "J"];
export const CLARITIES: Clarity[] = ["I1", "SI2", "SI1", "VS2", "VS1", "VVS2", "VVS1", "IF"];

export const CUT_NOTES: Record<Cut, string> = {
  Fair: "Basic proportions; limited brilliance.",
  Good: "Reflects most light; a solid everyday cut.",
  "Very Good": "Reflects nearly all light that enters.",
  Premium: "Refined proportions with strong brilliance.",
  Ideal: "Best proportions; maximum brilliance and fire.",
};
export const COLOR_NOTES: Record<Color, string> = {
  D: "Colorless, the highest grade.",
  E: "Colorless; traces only a gemologist can detect.",
  F: "Colorless; looks pure to the eye.",
  G: "Near colorless; excellent value.",
  H: "Near colorless; faint warmth in side view.",
  I: "Near colorless; slight warmth.",
  J: "Near colorless; warmth visible in larger stones.",
};
export const CLARITY_NOTES: Record<Clarity, string> = {
  I1: "Included; inclusions visible to the unaided eye.",
  SI2: "Slightly included; easy to see at 10× magnification.",
  SI1: "Slightly included; visible at 10×, rarely to the eye.",
  VS2: "Very slightly included; minor and hard to see at 10×.",
  VS1: "Very slightly included; difficult to see at 10×.",
  VVS2: "Very, very slightly included; extremely hard to see.",
  VVS1: "Very, very slightly included; barely detectable at 10×.",
  IF: "Internally flawless; no inclusions visible at 10×.",
};

export type NumericKey = "carat" | "depth" | "table" | "x" | "y" | "z";

/** Ranges mirror the backend's Pydantic validation (backend/schemas.py). */
export const NUMERIC_FIELDS: {
  key: NumericKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}[] = [
  { key: "carat", label: "Carat", unit: "ct", min: 0.2, max: 6, step: 0.01, hint: "Weight of the stone." },
  { key: "depth", label: "Depth", unit: "%", min: 40, max: 80, step: 0.1, hint: "Total depth as a percentage of diameter." },
  { key: "table", label: "Table", unit: "%", min: 40, max: 100, step: 0.1, hint: "Width of the top facet relative to the girdle." },
  { key: "x", label: "Length (x)", unit: "mm", min: 2, max: 12, step: 0.01, hint: "Longest girdle diameter." },
  { key: "y", label: "Width (y)", unit: "mm", min: 2, max: 12, step: 0.01, hint: "Shortest girdle diameter." },
  { key: "z", label: "Height (z)", unit: "mm", min: 1, max: 8, step: 0.01, hint: "Table to culet." },
];

/** Starting inputs for the form. These are measurements, not predictions. */
export const DEFAULT_INPUT: DiamondInput = {
  carat: 1,
  cut: "Ideal",
  color: "G",
  clarity: "VS2",
  depth: 61.5,
  table: 57,
  x: 6.4,
  y: 6.43,
  z: 3.95,
};

export const PRESETS: { label: string; input: DiamondInput }[] = [
  { label: "0.5 ct", input: { carat: 0.5, cut: "Good", color: "H", clarity: "SI1", depth: 62, table: 58, x: 5.1, y: 5.12, z: 3.16 } },
  { label: "1 ct", input: DEFAULT_INPUT },
  { label: "1.5 ct", input: { carat: 1.5, cut: "Premium", color: "F", clarity: "VVS2", depth: 61, table: 58, x: 7.35, y: 7.4, z: 4.5 } },
  { label: "2.5 ct", input: { carat: 2.5, cut: "Very Good", color: "E", clarity: "VS1", depth: 62, table: 59, x: 8.65, y: 8.7, z: 5.37 } },
];
