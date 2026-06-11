// Seasonal calendar logic: live ADEME fetch (with cache + snapshot fallback),
// season-state and carbon-tier computation, and the (accent-insensitive)
// matching between our DB recipes and seasonal produce. Server-only.

import { prisma } from "@/lib/prisma";
import type { RecipeCardData } from "@/app/components/recipe-card";
import { cardInclude, toCard, type CardRow } from "@/app/recettes/_shared";
import { produceImage } from "@/lib/pexels";
import { HERBS } from "@/lib/herbs";
import {
  PRODUCE_SNAPSHOT,
  hueForSlug,
  resolveMonth,
  seasonState,
  type Produce,
  type ProduceCategory,
  type SeasonStatus,
} from "@/lib/seasons-data";

// Pure season logic (month/state/carbon) lives in seasons-data (no DB) so it
// can be imported from Client Components too. Re-exported here for convenience.
export {
  resolveMonth,
  seasonState,
  carbonTier,
  SEASON_LABELS,
  CARBON_LABELS,
} from "@/lib/seasons-data";
export type { SeasonStatus, CarbonTier } from "@/lib/seasons-data";

/**
 * Live ADEME fetch (cached 24h) with the committed snapshot as fallback, plus
 * the committed herb dataset appended. `IMPACTCO2_API_KEY` is optional.
 */
export async function getProduce(): Promise<Produce[]> {
  let live: Produce[] | null = null;
  try {
    const res = await fetch("https://impactco2.fr/api/v1/fruitsetlegumes", {
      next: { revalidate: 86400 },
      headers: process.env.IMPACTCO2_API_KEY
        ? { Authorization: `Bearer ${process.env.IMPACTCO2_API_KEY}` }
        : {},
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: unknown };
      const data = Array.isArray(json.data) ? json.data : [];
      const mapped = data
        .map((d) => d as Record<string, unknown>)
        .filter((d) => typeof d.slug === "string" && Array.isArray(d.months))
        .map((d): Produce => {
          const category: ProduceCategory = String(d.category)
            .toLowerCase()
            .includes("fruit")
            ? "fruits"
            : "légumes";
          return {
            name: String(d.name ?? d.slug),
            slug: String(d.slug),
            months: (d.months as number[]).filter((n) => n >= 1 && n <= 12),
            ecv: typeof d.ecv === "number" ? d.ecv : null,
            category,
            hue: hueForSlug(String(d.slug)),
          };
        });
      if (mapped.length) live = mapped;
    }
  } catch {
    // Network/API failure → snapshot.
  }
  const base = live ?? PRODUCE_SNAPSHOT;
  return [...base, ...HERBS];
}

// --- Recipe ↔ produce matching (accent-insensitive, plural-tolerant) ---

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

/** True if an ingredient name refers to the given product. */
function ingredientMatches(ingredientName: string, product: Produce): boolean {
  const ing = deplural(norm(ingredientName));
  const term = deplural(norm(product.name));
  return term.length >= 3 && (ing.includes(term) || ing.includes(product.slug));
}

type RecipeWithIngredients = CardRow & {
  recipeIngredients: { ingredient: { name: string } }[];
};

const recipeInclude = {
  ...cardInclude,
  recipeIngredients: { include: { ingredient: { select: { name: true } } } },
} as const;

/** Distinct seasonal products a recipe uses, given the seasonal product list. */
function matchCount(recipe: RecipeWithIngredients, seasonal: Produce[]): number {
  const matched = new Set<string>();
  for (const ri of recipe.recipeIngredients) {
    for (const p of seasonal) {
      if (ingredientMatches(ri.ingredient.name, p)) matched.add(p.slug);
    }
  }
  return matched.size;
}

export type SeasonalRecipe = { recipe: RecipeCardData; count: number };

/** Recipes using ≥1 product in season this month, sorted by match count desc. */
export async function seasonalRecipes(
  month: number,
  produce: Produce[],
): Promise<SeasonalRecipe[]> {
  const seasonal = produce.filter((p) => p.months.includes(month));
  const rows = (await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: recipeInclude,
  })) as unknown as RecipeWithIngredients[];

  return rows
    .map((r) => ({ recipe: toCard(r), count: matchCount(r, seasonal) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Recipes that use a given product (any month). */
export async function recipesForProduct(product: Produce): Promise<RecipeCardData[]> {
  const rows = (await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: recipeInclude,
  })) as unknown as RecipeWithIngredients[];

  return rows
    .filter((r) =>
      r.recipeIngredients.some((ri) => ingredientMatches(ri.ingredient.name, product)),
    )
    .map(toCard);
}

export type ProductDetailData = {
  product: Produce;
  month: number;
  status: SeasonStatus;
  imageUrl: string | null;
  recipes: RecipeCardData[];
};

/** Everything a product page/drawer needs, or null if the slug is unknown. */
export async function loadProductDetail(
  slug: string,
  monthRaw: string | undefined,
): Promise<ProductDetailData | null> {
  const month = resolveMonth(monthRaw);
  const produce = await getProduce();
  const product = produce.find((p) => p.slug === slug);
  if (!product) return null;
  const [imageUrl, recipes] = await Promise.all([
    produceImage(product),
    recipesForProduct(product),
  ]);
  return { product, month, status: seasonState(product.months, month), imageUrl, recipes };
}
