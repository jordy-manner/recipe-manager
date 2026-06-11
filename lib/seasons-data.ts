// Seasonal calendar data: committed snapshot of the ADEME Impact CO2
// "fruits et légumes" dataset (https://impactco2.fr/api/v1/fruitsetlegumes),
// used as a fallback when the live API is unavailable. Schema kept identical:
// { name, slug, months:[1..12], ecv (kg CO2e/kg), category }.
// Herbs are NOT in the ADEME source — they live in a committed dataset
// (lib/data/herbs-seasonality.json, loaded via lib/herbs.ts) and are merged in
// at runtime by getProduce(); they have no carbon data (ecv: null).

export type ProduceCategory = "fruits" | "légumes" | "herbes";

export type Produce = {
  name: string;
  slug: string;
  months: number[]; // 1..12
  ecv: number | null; // kg CO2e / kg (null for herbs — no ADEME footprint)
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

type RawProduce = Omit<Produce, "hue">;

const SNAPSHOT: RawProduce[] = [
  { name: "Fraise", slug: "fraise", months: [5, 6, 7], ecv: 0.51107, category: "fruits" },
  { name: "Artichaut", slug: "artichaut", months: [5, 6, 7, 8, 9], ecv: 2.556166, category: "légumes" },
  { name: "Asperge", slug: "asperge", months: [4, 5, 6], ecv: 1.638878, category: "légumes" },
  { name: "Blette", slug: "blette", months: [6, 7, 8, 9, 10, 11], ecv: 0.5811, category: "légumes" },
  { name: "Champignon de Paris", slug: "champignon", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 1.21, category: "légumes" },
  { name: "Concombre", slug: "concombre", months: [5, 6, 7, 8, 9, 10], ecv: 0.5122949, category: "légumes" },
  { name: "Courgette", slug: "courgette", months: [5, 6, 7, 8, 9, 10], ecv: 0.498507, category: "légumes" },
  { name: "Cresson", slug: "cresson", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 0.868145, category: "légumes" },
  { name: "Fenouil", slug: "fenouil", months: [4, 6, 7, 8, 9, 10, 11], ecv: 1.018233, category: "légumes" },
  { name: "Haricot vert", slug: "haricotvert", months: [6, 7, 8, 9, 10], ecv: 0.446457, category: "légumes" },
  { name: "Laitue", slug: "laitue", months: [5, 6, 7, 8, 9], ecv: 0.868145, category: "légumes" },
  { name: "Petit pois", slug: "petitpois", months: [5, 6, 7], ecv: 0.701761, category: "légumes" },
  { name: "Poivron", slug: "poivron", months: [6, 7, 8, 9], ecv: 0.7154, category: "légumes" },
  { name: "Radis", slug: "radis", months: [3, 4, 5, 6], ecv: 0.3847324, category: "légumes" },
  { name: "Aubergine", slug: "aubergine", months: [6, 7, 8, 9], ecv: 0.472037, category: "légumes" },
  { name: "Tomate", slug: "tomate", months: [6, 7, 8, 9], ecv: 0.6256, category: "légumes" },
  { name: "Avocat (importé)", slug: "avocat", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 1.552523, category: "légumes" },
  { name: "Cassis", slug: "cassis", months: [6, 7, 8], ecv: 1.903508, category: "fruits" },
  { name: "Pamplemousse", slug: "pamplemousse", months: [2, 3, 4, 5, 6], ecv: 0.9255958, category: "fruits" },
  { name: "Groseille", slug: "groseille", months: [6, 7, 8], ecv: 1.8945215, category: "fruits" },
  { name: "Melon", slug: "melon", months: [6, 7, 8, 9], ecv: 0.978343, category: "fruits" },
  { name: "Rhubarbe", slug: "rhubarbe", months: [4, 5, 6], ecv: 0.7015215, category: "fruits" },
  { name: "Pêche", slug: "peche", months: [6, 7, 8, 9], ecv: 0.5905215, category: "fruits" },
  { name: "Cerise", slug: "cerise", months: [6, 7], ecv: 1.744508, category: "fruits" },
  { name: "Abricot", slug: "abricot", months: [6, 7, 8], ecv: 1.451508, category: "fruits" },
  { name: "Framboise", slug: "framboise", months: [6, 7, 8], ecv: 1.5430878, category: "fruits" },
  { name: "Ananas (importé)", slug: "ananas", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 1.3614345, category: "fruits" },
  { name: "Banane (importée)", slug: "banane", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 0.908523, category: "fruits" },
  { name: "Mangue (importée par avion)", slug: "mangue", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ecv: 11.655508, category: "fruits" },
  { name: "Pastèque", slug: "pasteque", months: [6, 7, 8, 9], ecv: 0.6805, category: "fruits" },
];

const withHue = (p: RawProduce): Produce => ({ ...p, hue: hueForSlug(p.slug) });

/** Committed fallback for fruits & légumes (used when the API is unavailable). */
export const PRODUCE_SNAPSHOT: Produce[] = SNAPSHOT.map(withHue);

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;
export const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

// --- Pure season logic (no DB) — safe to import from Client Components ---

/** Resolves a month from `?m=`, defaulting to the current month (1–12). */
export function resolveMonth(raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return new Date().getMonth() + 1;
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
