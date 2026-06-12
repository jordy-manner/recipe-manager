"use server";

// Server Actions for managing seasonal produce (Ingredient season fields) from
// the app — the contract consumed by the /parametres produce editor (built
// separately). All season data lives on Ingredient; a produce is an ingredient
// with a `category`. ecv can be pre-filled from ADEME Agribalyse (suggestEcv).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/recipes";
import { CATEGORY_ENUM, CATEGORY_LABEL } from "@/lib/produce";
import { fetchAgribalyseEcv } from "@/lib/agribalyse";
import type { ProduceCategory } from "@/lib/seasons-data";

export type ProduceAdmin = {
  id: string;
  name: string;
  slug: string;
  category: ProduceCategory;
  months: number[];
  ecv: number | null;
  ecvSource: string | null;
};

export type UpsertResult =
  | { ok: true; produce: ProduceAdmin }
  | { ok: false; errors: string[] };

const upsertSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  slug: z.string().trim().min(1).optional(),
  category: z.enum(["fruits", "légumes", "herbes", "légumineuses"]),
  months: z
    .array(z.coerce.number().int().min(1).max(12))
    .transform((m) => [...new Set(m)].sort((a, b) => a - b)),
  ecv: z.coerce.number().nonnegative().nullable().optional(),
  ecvSource: z.string().optional(),
});

export type ProduceInput = z.input<typeof upsertSchema>;

const toAdmin = (r: {
  id: string;
  name: string;
  slug: string | null;
  category: keyof typeof CATEGORY_LABEL;
  months: number[];
  ecv: number | null;
  ecvSource: string | null;
}): ProduceAdmin => ({
  id: r.id,
  name: r.name,
  slug: r.slug ?? slugify(r.name),
  category: CATEGORY_LABEL[r.category],
  months: r.months,
  ecv: r.ecv,
  ecvSource: r.ecvSource,
});

/** All seasonal produce (ingredients with a category), by name. */
export async function listProduce(): Promise<ProduceAdmin[]> {
  const rows = await prisma.ingredient.findMany({
    where: { category: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, category: true, months: true, ecv: true, ecvSource: true },
  });
  return rows.map((r) => toAdmin({ ...r, category: r.category! }));
}

/** ADEME Agribalyse carbon footprint for a produce name, to pre-fill the form. */
export async function suggestEcv(name: string): Promise<number | null> {
  if (!name.trim()) return null;
  return fetchAgribalyseEcv(name.trim());
}

/** Create or update a seasonal produce (by slug, then name). */
export async function upsertProduce(input: ProduceInput): Promise<UpsertResult> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  }
  const d = parsed.data;
  const slug = d.slug ?? slugify(d.name);
  const data = {
    name: d.name,
    slug,
    category: CATEGORY_ENUM[d.category],
    months: d.months,
    ecv: d.ecv ?? null,
    ecvSource: d.ecvSource ?? (d.ecv != null ? "manual" : null),
    seasonUpdatedAt: new Date(),
  };

  try {
    const existing =
      (await prisma.ingredient.findUnique({ where: { slug } })) ??
      (await prisma.ingredient.findUnique({ where: { name: d.name } }));
    const row = existing
      ? await prisma.ingredient.update({ where: { id: existing.id }, data })
      : await prisma.ingredient.create({ data });
    revalidatePath("/saisons");
    return { ok: true, produce: toAdmin({ ...row, category: row.category! }) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec de l'enregistrement";
    return { ok: false, errors: [msg.includes("Unique") ? "Ce slug est déjà utilisé" : msg] };
  }
}

/** Remove the seasonal status of a produce (keeps the Ingredient for recipes). */
export async function removeProduce(slug: string): Promise<{ ok: boolean }> {
  const row = await prisma.ingredient.findUnique({ where: { slug } });
  if (!row) return { ok: false };
  await prisma.ingredient.update({
    where: { id: row.id },
    data: { slug: null, category: null, months: [], ecv: null, ecvSource: null, seasonUpdatedAt: null },
  });
  revalidatePath("/saisons");
  return { ok: true };
}
