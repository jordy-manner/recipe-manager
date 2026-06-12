// Seasonal calendar logic: the committed produce dataset (lib/produce.ts),
// season-state and carbon-tier computation, and the (accent-insensitive)
// matching between our DB recipes and seasonal produce. Server-only.

import { prisma } from "@/lib/prisma";
import type { RecipeCardData } from "@/app/components/recipe-card";
import { cardInclude, toCard, type CardRow } from "@/app/recettes/_shared";
import { produceImage } from "@/lib/pexels";
import { PRODUCE_FALLBACK, toProduce } from "@/lib/produce";
import { getRecipeActiveMonths, type SeasonMode } from "@/lib/seasonality";
import {
  ingredientMatches,
  resolveMonth,
  seasonState,
  type Produce,
  type SeasonStatus,
} from "@/lib/seasons-data";

// Pure season logic (month/state/carbon) lives in seasons-data (no DB) so it
// can be imported from Client Components too. Re-exported here for convenience.
export {
  resolveMonth,
  resolveMonths,
  seasonState,
  carbonTier,
  SEASON_LABELS,
  CARBON_LABELS,
} from "@/lib/seasons-data";
export type { SeasonStatus, CarbonTier } from "@/lib/seasons-data";

/**
 * Seasonal produce, from the DB (Ingredient rows with a `category`). Falls back
 * to the committed snapshot when nothing is seeded yet (safe pre-seed rollout).
 */
export async function getProduce(): Promise<Produce[]> {
  const rows = await prisma.ingredient.findMany({
    where: { category: { not: null } },
    select: { name: true, slug: true, category: true, months: true, ecv: true },
    orderBy: { name: "asc" },
  });
  if (!rows.length) return PRODUCE_FALLBACK;
  return rows
    .map((r) => toProduce({ ...r, category: r.category! }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

// --- Recipe ↔ produce matching (accent-insensitive, plural-tolerant) ---
// The pure name-matching helper lives in seasons-data (client-safe, no DB).

type RecipeWithIngredients = CardRow & {
  seasonMode: SeasonMode;
  seasonMonths: number[];
  recipeIngredients: { isPrimary: boolean; ingredient: { name: string } }[];
};

const recipeInclude = {
  ...cardInclude,
  recipeIngredients: { include: { ingredient: { select: { name: true } } } },
} as const;

/** Distinct primary produce slugs a recipe uses (any month). */
function primaryProduceSlugs(recipe: RecipeWithIngredients, produce: Produce[]): string[] {
  const slugs = new Set<string>();
  for (const ri of recipe.recipeIngredients) {
    if (!ri.isPrimary) continue;
    for (const p of produce) {
      if (ingredientMatches(ri.ingredient.name, p)) slugs.add(p.slug);
    }
  }
  return [...slugs];
}

/** A recipe with everything the client needs to match it to a month selection. */
export type SeasonalRecipeData = {
  recipe: RecipeCardData;
  activeMonths: number[]; // getRecipeActiveMonths (AUTO/MANUAL/ALWAYS)
  slugs: string[]; // primary produce slugs it uses
};

/**
 * All recipes pre-resolved for client-side, multi-month seasonal matching: the
 * card data, the recipe's active months, and the primary produce slugs it uses.
 * The page fetches this once; the client filters by the (interactive) month
 * selection without further round-trips.
 */
export async function seasonalRecipesData(produce: Produce[]): Promise<SeasonalRecipeData[]> {
  const rows = (await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: recipeInclude,
  })) as unknown as RecipeWithIngredients[];

  return rows.map((r) => ({
    recipe: toCard(r),
    activeMonths: getRecipeActiveMonths(r, produce),
    slugs: primaryProduceSlugs(r, produce),
  }));
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
