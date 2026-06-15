"use server";

// Server Actions for the /parametres catalog editors (ingredients, utensils,
// units). Reads happen in the server pages; these handle the writes: create,
// inline edit, delete (blocked when the entry is used), merge duplicates (in a
// transaction, reassigning the recipe relations), and the custom image field.
//
// "Usage" = number of recipes referencing the entry. A used entry can't be
// deleted directly — it must be merged into another (that's the dedupe path).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMediaStore } from "@/lib/media";
import { type IngredientRow, type UnitRow, type UtensilRow } from "@/lib/catalog";

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// Revalidate the pages that read these catalogs (recipe form + seasonal view).
function revalidateCatalogConsumers() {
  revalidatePath("/recettes");
  revalidatePath("/recettes/nouvelle");
  revalidatePath("/saisons");
}

/** Maps a Prisma unique-violation into a friendly message, else rethrows text. */
function writeError(e: unknown, dupMessage: string): string {
  const msg = e instanceof Error ? e.message : "Échec de l'enregistrement";
  if (msg.includes("Unique") || msg.includes("P2002")) return dupMessage;
  return msg;
}

/* ------------------------------------------------------------------ */
/* Ingredients                                                         */
/* ------------------------------------------------------------------ */

// The aisle / default unit / unit type are foreign keys to editable
// referentials (Aisle / Unit / UnitType): the input is the referential id, and
// the FK constraint enforces that it exists (no constant list to validate).
const ingredientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  aisleId: z.string().trim().min(1).nullable().optional(),
  defaultUnitId: z.string().trim().min(1).nullable().optional(),
});

export type IngredientPatch = {
  name?: string;
  aisleId?: string | null;
  defaultUnitId?: string | null;
};

async function ingredientRow(id: string): Promise<IngredientRow> {
  const r = await prisma.ingredient.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      aisleId: true,
      defaultUnitId: true,
      image: true,
      _count: { select: { recipeIngredients: true } },
    },
  });
  return {
    id: r.id,
    name: r.name,
    aisleId: r.aisleId,
    defaultUnitId: r.defaultUnitId,
    image: r.image,
    uses: r._count.recipeIngredients,
  };
}

export async function createIngredient(
  input: z.input<typeof ingredientSchema>,
): Promise<ActionResult<{ row: IngredientRow }>> {
  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const created = await prisma.ingredient.create({
      data: {
        name: parsed.data.name,
        aisleId: parsed.data.aisleId ?? null,
        defaultUnitId: parsed.data.defaultUnitId ?? null,
      },
      select: { id: true },
    });
    revalidateCatalogConsumers();
    return { ok: true, row: await ingredientRow(created.id) };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un ingrédient porte déjà ce nom") };
  }
}

export async function updateIngredient(
  id: string,
  patch: IngredientPatch,
): Promise<ActionResult> {
  const parsed = ingredientSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.ingredient.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.aisleId !== undefined ? { aisleId: parsed.data.aisleId } : {}),
        ...(parsed.data.defaultUnitId !== undefined
          ? { defaultUnitId: parsed.data.defaultUnitId }
          : {}),
      },
    });
    revalidateCatalogConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un ingrédient porte déjà ce nom") };
  }
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  const count = await prisma.recipeIngredient.count({ where: { ingredientId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisé dans ${count} recette(s) — fusionnez-le plutôt.` };
  }
  const existing = await prisma.ingredient.findUnique({
    where: { id },
    select: { imagePublicId: true },
  });
  await prisma.ingredient.delete({ where: { id } });
  if (existing?.imagePublicId) await getMediaStore().remove(existing.imagePublicId);
  revalidateCatalogConsumers();
  return { ok: true };
}

export async function mergeIngredient(
  sourceId: string,
  targetId: string,
): Promise<ActionResult<{ moved: number }>> {
  if (sourceId === targetId) return { ok: false, error: "Cible invalide" };
  const moved = await prisma.recipeIngredient.count({ where: { ingredientId: sourceId } });
  const source = await prisma.ingredient.findUnique({
    where: { id: sourceId },
    select: { imagePublicId: true },
  });
  try {
    await prisma.$transaction(async (tx) => {
      // Recipes that already use the target would collide on the composite PK
      // (recipeId, ingredientId): drop the source rows there, move the rest.
      const targetRecipes = (
        await tx.recipeIngredient.findMany({
          where: { ingredientId: targetId },
          select: { recipeId: true },
        })
      ).map((r) => r.recipeId);
      await tx.recipeIngredient.deleteMany({
        where: { ingredientId: sourceId, recipeId: { in: targetRecipes } },
      });
      await tx.recipeIngredient.updateMany({
        where: { ingredientId: sourceId },
        data: { ingredientId: targetId },
      });
      await tx.ingredient.delete({ where: { id: sourceId } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la fusion" };
  }
  if (source?.imagePublicId) await getMediaStore().remove(source.imagePublicId);
  revalidateCatalogConsumers();
  return { ok: true, moved };
}

/* ------------------------------------------------------------------ */
/* Utensils                                                            */
/* ------------------------------------------------------------------ */

const utensilSchema = z.object({ name: z.string().trim().min(1, "Le nom est obligatoire") });

async function utensilRow(id: string): Promise<UtensilRow> {
  const r = await prisma.utensil.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, image: true, _count: { select: { recipeUtensils: true } } },
  });
  return { id: r.id, name: r.name, image: r.image, uses: r._count.recipeUtensils };
}

export async function createUtensil(
  input: z.input<typeof utensilSchema>,
): Promise<ActionResult<{ row: UtensilRow }>> {
  const parsed = utensilSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const created = await prisma.utensil.create({
      data: { name: parsed.data.name },
      select: { id: true },
    });
    revalidateCatalogConsumers();
    return { ok: true, row: await utensilRow(created.id) };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un ustensile porte déjà ce nom") };
  }
}

export async function updateUtensil(id: string, name: string): Promise<ActionResult> {
  const parsed = utensilSchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.utensil.update({ where: { id }, data: { name: parsed.data.name } });
    revalidateCatalogConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un ustensile porte déjà ce nom") };
  }
}

export async function deleteUtensil(id: string): Promise<ActionResult> {
  const count = await prisma.recipeUtensil.count({ where: { utensilId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisé dans ${count} recette(s) — fusionnez-le plutôt.` };
  }
  const existing = await prisma.utensil.findUnique({
    where: { id },
    select: { imagePublicId: true },
  });
  await prisma.utensil.delete({ where: { id } });
  if (existing?.imagePublicId) await getMediaStore().remove(existing.imagePublicId);
  revalidateCatalogConsumers();
  return { ok: true };
}

export async function mergeUtensil(
  sourceId: string,
  targetId: string,
): Promise<ActionResult<{ moved: number }>> {
  if (sourceId === targetId) return { ok: false, error: "Cible invalide" };
  const moved = await prisma.recipeUtensil.count({ where: { utensilId: sourceId } });
  const source = await prisma.utensil.findUnique({
    where: { id: sourceId },
    select: { imagePublicId: true },
  });
  try {
    await prisma.$transaction(async (tx) => {
      const targetRecipes = (
        await tx.recipeUtensil.findMany({
          where: { utensilId: targetId },
          select: { recipeId: true },
        })
      ).map((r) => r.recipeId);
      await tx.recipeUtensil.deleteMany({
        where: { utensilId: sourceId, recipeId: { in: targetRecipes } },
      });
      await tx.recipeUtensil.updateMany({
        where: { utensilId: sourceId },
        data: { utensilId: targetId },
      });
      await tx.utensil.delete({ where: { id: sourceId } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la fusion" };
  }
  if (source?.imagePublicId) await getMediaStore().remove(source.imagePublicId);
  revalidateCatalogConsumers();
  return { ok: true, moved };
}

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

const unitSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  abbreviation: z.string().trim().min(1).nullable().optional(),
  typeId: z.string().trim().min(1).nullable().optional(),
});

export type UnitPatch = {
  name?: string;
  abbreviation?: string | null;
  typeId?: string | null;
};

async function unitRow(id: string): Promise<UnitRow> {
  const r = await prisma.unit.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      abbreviation: true,
      typeId: true,
      _count: { select: { recipeIngredients: true } },
    },
  });
  return {
    id: r.id,
    name: r.name,
    abbreviation: r.abbreviation,
    typeId: r.typeId,
    uses: r._count.recipeIngredients,
  };
}

export async function createUnit(
  input: z.input<typeof unitSchema>,
): Promise<ActionResult<{ row: UnitRow }>> {
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const created = await prisma.unit.create({
      data: {
        name: parsed.data.name,
        abbreviation: parsed.data.abbreviation ?? null,
        typeId: parsed.data.typeId ?? null,
      },
      select: { id: true },
    });
    revalidateCatalogConsumers();
    return { ok: true, row: await unitRow(created.id) };
  } catch (e) {
    return { ok: false, error: writeError(e, "Une unité porte déjà ce nom") };
  }
}

export async function updateUnit(
  id: string,
  patch: UnitPatch,
): Promise<ActionResult> {
  const parsed = unitSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.unit.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.abbreviation !== undefined
          ? { abbreviation: parsed.data.abbreviation }
          : {}),
        ...(parsed.data.typeId !== undefined ? { typeId: parsed.data.typeId } : {}),
      },
    });
    revalidateCatalogConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Une unité porte déjà ce nom") };
  }
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  const count = await prisma.recipeIngredient.count({ where: { unitId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisée dans ${count} recette(s) — fusionnez-la plutôt.` };
  }
  await prisma.unit.delete({ where: { id } });
  revalidateCatalogConsumers();
  return { ok: true };
}

export async function mergeUnit(
  sourceId: string,
  targetId: string,
): Promise<ActionResult<{ moved: number }>> {
  if (sourceId === targetId) return { ok: false, error: "Cible invalide" };
  // Units are referenced by a plain FK (RecipeIngredient.unitId) and as an
  // ingredient default — no composite-PK collision, so a straight repoint.
  const moved = await prisma.recipeIngredient.count({ where: { unitId: sourceId } });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.updateMany({
        where: { unitId: sourceId },
        data: { unitId: targetId },
      });
      await tx.ingredient.updateMany({
        where: { defaultUnitId: sourceId },
        data: { defaultUnitId: targetId },
      });
      await tx.unit.delete({ where: { id: sourceId } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la fusion" };
  }
  revalidateCatalogConsumers();
  return { ok: true, moved };
}

/* ------------------------------------------------------------------ */
/* Custom image (ingredients & utensils)                               */
/* ------------------------------------------------------------------ */

/** Uploads a custom image for an ingredient/utensil (priority over Pexels). */
export async function setCatalogImage(
  kind: "ingredient" | "utensil",
  id: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier" };
  }
  const media = getMediaStore();
  if (!media.configured) {
    return { ok: false, error: "Aucun service média configuré (Cloudinary)." };
  }
  let uploaded;
  try {
    uploaded = await media.upload(file);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'upload" };
  }

  if (kind === "ingredient") {
    const prev = await prisma.ingredient.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });
    await prisma.ingredient.update({
      where: { id },
      data: { image: uploaded.url, imagePublicId: uploaded.publicId },
    });
    if (prev?.imagePublicId) await media.remove(prev.imagePublicId);
  } else {
    const prev = await prisma.utensil.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });
    await prisma.utensil.update({
      where: { id },
      data: { image: uploaded.url, imagePublicId: uploaded.publicId },
    });
    if (prev?.imagePublicId) await media.remove(prev.imagePublicId);
  }
  revalidateCatalogConsumers();
  return { ok: true, url: uploaded.url };
}

/** Clears the custom image, reverting to the auto Pexels thumbnail. */
export async function clearCatalogImage(
  kind: "ingredient" | "utensil",
  id: string,
): Promise<ActionResult> {
  let prevPublicId: string | null = null;
  if (kind === "ingredient") {
    const prev = await prisma.ingredient.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });
    prevPublicId = prev?.imagePublicId ?? null;
    await prisma.ingredient.update({
      where: { id },
      data: { image: null, imagePublicId: null },
    });
  } else {
    const prev = await prisma.utensil.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });
    prevPublicId = prev?.imagePublicId ?? null;
    await prisma.utensil.update({
      where: { id },
      data: { image: null, imagePublicId: null },
    });
  }
  if (prevPublicId) await getMediaStore().remove(prevPublicId);
  revalidateCatalogConsumers();
  return { ok: true };
}
