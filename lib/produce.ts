// Seasonal produce mapping + committed fallback. The source of truth at runtime
// is the DB: seasonal data lives on Ingredient (slug/category/months/ecv), read
// by getProduce() in lib/seasons.ts. This module provides:
//  - the DB-row → Produce mapper (toProduce),
//  - the category enum ↔ French-label maps,
//  - PRODUCE_FALLBACK: the committed seasonality.json + carbon-ademe.json, used
//    only when the DB has no seasonal ingredient yet (safe pre-seed rollout) and
//    as the source the CLI seeds from.

import { z } from "zod";
import seasonalityJson from "@/lib/data/seasonality.json";
import carbonJson from "@/lib/data/carbon-ademe.json";
import { slugify } from "@/lib/recipes";
import { hueForSlug, type Produce, type ProduceCategory } from "@/lib/seasons-data";

/** DB enum values (unaccented Prisma identifiers). */
export type DbCategory = "fruits" | "legumes" | "herbes" | "legumineuses";

export const CATEGORY_LABEL: Record<DbCategory, ProduceCategory> = {
  fruits: "fruits",
  legumes: "légumes",
  herbes: "herbes",
  legumineuses: "légumineuses",
};

export const CATEGORY_ENUM: Record<ProduceCategory, DbCategory> = {
  fruits: "fruits",
  légumes: "legumes",
  herbes: "herbes",
  légumineuses: "legumineuses",
};

const cleanMonths = (m: number[]): number[] =>
  [...new Set(m.filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);

/** A seasonal Ingredient row (with a non-null category) → Produce. */
export function toProduce(row: {
  name: string;
  slug: string | null;
  category: DbCategory;
  months: number[];
  ecv: number | null;
}): Produce {
  const slug = row.slug ?? slugify(row.name);
  return {
    name: row.name,
    slug,
    months: cleanMonths(row.months),
    ecv: row.ecv,
    category: CATEGORY_LABEL[row.category],
    hue: hueForSlug(slug),
  };
}

// --- Committed fallback (seasonality.json + carbon-ademe.json) ---

const ItemSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["fruits", "legumes", "herbes", "legumineuses"]),
  months: z.array(z.number().int().min(1).max(12)).min(1),
});
const FileSchema = z.object({ items: z.array(ItemSchema).min(1) });
const CarbonSchema = z.object({ ecv: z.record(z.string(), z.number().nonnegative()) });

const CARBON = CarbonSchema.parse(carbonJson).ecv;
const { items } = FileSchema.parse(seasonalityJson);

/** Committed seasonal produce, used when the DB isn't seeded yet (and by the CLI). */
export const PRODUCE_FALLBACK: Produce[] = items
  .map((it) =>
    toProduce({
      name: it.label,
      slug: it.slug,
      category: it.category,
      months: it.months,
      ecv: CARBON[it.slug] ?? null,
    }),
  )
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));
