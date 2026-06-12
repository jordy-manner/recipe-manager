// Seasonal calendar types and pure logic. The produce dataset itself lives in
// lib/data/seasonality.json (loaded + validated by lib/produce.ts); the carbon
// footprint (ecv) is merged from an ADEME snapshot (lib/data/carbon-ademe.json).
// Items not covered by ADEME keep ecv: null and their carbon UI stays hidden.

export type ProduceCategory = "fruits" | "légumes" | "herbes" | "légumineuses";

export type Produce = {
  name: string;
  slug: string;
  months: number[]; // 1..12
  ecv: number | null; // kg CO2e / kg (ADEME; null when ADEME doesn't cover it)
  category: ProduceCategory;
  image?: string; // optional custom image, takes priority over Pexels
  hue: number; // deterministic, for the warm placeholder gradient
};

/** Deterministic hue (0–360) from a slug, for photo placeholders. */
export function hueForSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;
export const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;
export const MONTHS_ABBR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
] as const;

export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// --- Pure season logic (no DB) — safe to import from Client Components ---

/** Resolves a month from `?m=`, defaulting to the current month (1–12). */
export function resolveMonth(raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return new Date().getMonth() + 1;
}

/**
 * Resolves a month *set* from `?m=6,7,8` (comma-separated, 1–12, de-duped and
 * sorted). Defaults to the current month when empty/invalid. An explicit empty
 * selection (no valid month) is allowed via `allowEmpty` for the "Tout effacer"
 * shareable state.
 */
export function resolveMonths(raw: string | undefined, allowEmpty = false): number[] {
  if (raw === undefined) return [new Date().getMonth() + 1];
  const parsed = [
    ...new Set(
      raw
        .split(",")
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12),
    ),
  ].sort((a, b) => a - b);
  if (parsed.length) return parsed;
  return allowEmpty ? [] : [new Date().getMonth() + 1];
}

export type SeasonStatus = "pleine" | "début" | "fin" | "année" | "hors";

/** Season state of a product for a given month (neighbours give start/end). */
export function seasonState(months: number[], m: number): SeasonStatus {
  if (months.length >= 12) return "année";
  if (!months.includes(m)) return "hors";
  const prev = m === 1 ? 12 : m - 1;
  const next = m === 12 ? 1 : m + 1;
  const hasPrev = months.includes(prev);
  const hasNext = months.includes(next);
  if (!hasPrev && hasNext) return "début";
  if (hasPrev && !hasNext) return "fin";
  return "pleine";
}

export const SEASON_LABELS: Record<SeasonStatus, string> = {
  pleine: "Pleine saison",
  début: "Début de saison",
  fin: "Fin de saison",
  année: "Toute l'année",
  hors: "Hors saison",
};

export type CarbonTier = "low" | "med" | "high";

/** Carbon footprint tier (kg CO2e/kg): <0.7 low, ≤1.6 med, >1.6 high. */
export function carbonTier(ecv: number): CarbonTier {
  if (ecv < 0.7) return "low";
  if (ecv <= 1.6) return "med";
  return "high";
}

export const CARBON_LABELS: Record<CarbonTier, string> = {
  low: "Faible",
  med: "Modéré",
  high: "Élevé",
};

// --- Ingredient ↔ produce matching (accent-insensitive, plural-tolerant) ---

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Drops trailing "s" on words longer than 3 chars (cheap plural folding). */
const deplural = (s: string) =>
  s
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ");

/**
 * Canonical key for dedupe: accent-insensitive + plural-folded. Two catalog
 * names that collapse to the same key are considered the same entry (e.g.
 * "Tomates" / "tomate"). Used by the on-the-fly creation Server Actions.
 */
export function fuzzyKey(name: string): string {
  return deplural(norm(name));
}

/** True if an ingredient name refers to the given product. */
export function ingredientMatches(ingredientName: string, product: Produce): boolean {
  const ing = deplural(norm(ingredientName));
  const term = deplural(norm(product.name));
  return term.length >= 3 && (ing.includes(term) || ing.includes(product.slug));
}

/** English Pexels search terms per slug (better photo results). */
export const PEXELS_EN: Record<string, string> = {
  fraise: "strawberries",
  artichaut: "artichoke",
  asperge: "asparagus",
  blette: "swiss chard",
  champignon: "button mushrooms",
  concombre: "cucumber",
  courgette: "zucchini",
  cresson: "watercress",
  fenouil: "fennel",
  haricotvert: "green beans",
  laitue: "lettuce",
  petitpois: "green peas",
  poivron: "bell peppers",
  radis: "radishes",
  aubergine: "eggplant",
  tomate: "tomatoes",
  avocat: "avocado",
  cassis: "blackcurrant",
  pamplemousse: "grapefruit",
  groseille: "redcurrant",
  melon: "cantaloupe melon",
  rhubarbe: "rhubarb",
  peche: "peaches",
  cerise: "cherries",
  abricot: "apricots",
  framboise: "raspberries",
  ananas: "pineapple",
  banane: "bananas",
  mangue: "mango",
  pasteque: "watermelon",
  basilic: "basil",
  aneth: "dill",
  persil: "parsley",
  ciboulette: "chives",
  menthe: "mint leaves",
  thym: "thyme",
  estragon: "tarragon",
  coriandre: "coriander leaves",
};
