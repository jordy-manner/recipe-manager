// ADEME Agribalyse carbon footprint lookup. Fetches the "agribalyse-synthese"
// (data.ademe.fr DataFair API) and matches a French produce name to the
// raw/fresh food's "Changement climatique" (kg CO2 eq/kg). Used at build/admin
// time (CLI refresh + the upsert action's ecv suggestion), NOT on /saisons
// reads (those use the DB). Network failures degrade to null.

const AGRIBALYSE_URL =
  "https://data.ademe.fr/data-fair/api/v1/datasets/agribalyse-synthese/lines?size=3000";

const OK_GROUPS = new Set([
  "fruits, légumes, légumineuses et oléagineux",
  "aides culinaires et ingrédients divers",
  "produits céréaliers",
]);

// Prefer raw/fresh forms; penalise processed ones (cooked, juice, canned, dried…).
const PROCESSED =
  /(cuit|appert|surgel|jus |jus,|conserve|poele|poêle|frit|sech|séch|\bsec\b|sauce|puree|purée|concentr|deshydr|déshydr|grill|vapeur|compote|confit|sirop|fume|fumé|saumure|huile|pesto|farine|flocon|boisson|lait |steril)/;
const RAW = /(cru|crue|crus|crues|frais|fraiche|fraîche|pulpe|complet|blanchi)/;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const deplural = (s: string) =>
  s
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ");

type AgbFood = { name: string; cc: number; group: string };

let cache: AgbFood[] | null = null;

/** Fetches the Agribalyse synthese dataset (cached per-process). */
export async function getAgribalyseFoods(): Promise<AgbFood[]> {
  if (cache) return cache;
  try {
    const res = await fetch(AGRIBALYSE_URL, { next: { revalidate: 604800 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Record<string, unknown>[] };
    const foods = (json.results ?? [])
      .map((r) => ({
        name: String(r["Nom_du_Produit_en_Français"] ?? ""),
        cc: typeof r["Changement_climatique"] === "number" ? (r["Changement_climatique"] as number) : NaN,
        group: String(r["Groupe_d'aliment"] ?? ""),
      }))
      .filter((f) => f.name && Number.isFinite(f.cc) && OK_GROUPS.has(f.group));
    cache = foods;
    return foods;
  } catch {
    return [];
  }
}

const headOf = (n: string) => deplural(norm(n.split(",")[0]));

/** Best raw/fresh Agribalyse match for a produce label, or null. */
export function matchEcv(label: string, foods: AgbFood[]): number | null {
  const L = deplural(norm(label));
  let c = foods.filter((x) => headOf(x.name) === L);
  if (!c.length) c = foods.filter((x) => headOf(x.name).split(" ")[0] === L);
  if (!c.length) {
    c = foods.filter((x) => {
      const h = headOf(x.name);
      return h.startsWith(L + " ") || L.startsWith(h + " ");
    });
  }
  if (!c.length) return null;
  const score = (x: AgbFood) => {
    const n = norm(x.name);
    let s = n.length * 0.01;
    if (RAW.test(n)) s -= 5;
    if (PROCESSED.test(n)) s += 5;
    return s;
  };
  const best = [...c].sort((a, b) => score(a) - score(b))[0];
  return Math.round(best.cc * 10000) / 10000;
}

/** Carbon footprint (kg CO2e/kg) for a produce name from Agribalyse, or null. */
export async function fetchAgribalyseEcv(name: string): Promise<number | null> {
  const foods = await getAgribalyseFoods();
  if (!foods.length) return null;
  return matchEcv(name, foods);
}
