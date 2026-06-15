"use server";

// On-the-fly catalog creation from the recipe form: create an ingredient, a
// unit or a utensil without leaving the form. Each action validates with Zod,
// then DEDUPES (accent-insensitive + plural-tolerant via fuzzyKey) before
// creating — if a close entry already exists, it is reused instead of creating
// a duplicate. New ingredients/utensils keep their optional fields null, so they
// surface as "À compléter" in /parametres (status is derived, never stored).
//
// Creation is optimistic on the client; the recipe submit reconciles the link
// via connectOrCreate (lib/recipes), so these never produce duplicates.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fuzzyKey } from "@/lib/seasons-data";

export type IngredientEntry = { name: string; defaultUnit: string | null; incomplete: boolean };
export type UnitEntry = { name: string; abbreviation: string | null };
export type UtensilEntry = { name: string };

export type CreateResult<T> =
  | { ok: true; entry: T; reused: boolean }
  | { ok: false; error: string };

const nameSchema = z.string().trim().min(1, "Le nom est obligatoire").max(80);

function ingredientIncomplete(i: { defaultUnitId: string | null; aisleId: string | null }): boolean {
  return !i.defaultUnitId || !i.aisleId;
}

/** Create (or reuse a close match for) an ingredient. Name suffices. */
export async function createIngredientEntry(
  rawName: string,
): Promise<CreateResult<IngredientEntry>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const key = fuzzyKey(name);

  const existing = await prisma.ingredient.findMany({
    select: { name: true, aisleId: true, defaultUnitId: true, defaultUnit: { select: { name: true } } },
  });
  const near = existing.find((i) => fuzzyKey(i.name) === key);
  if (near) {
    return {
      ok: true,
      reused: near.name.toLowerCase() !== name.toLowerCase(),
      entry: {
        name: near.name,
        defaultUnit: near.defaultUnit?.name ?? null,
        incomplete: ingredientIncomplete(near),
      },
    };
  }

  try {
    const created = await prisma.ingredient.create({ data: { name }, select: { name: true } });
    revalidatePath("/parametres/ingredients");
    return { ok: true, reused: false, entry: { name: created.name, defaultUnit: null, incomplete: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la création" };
  }
}

/** Create (or reuse a close match for) a utensil. Name suffices. */
export async function createUtensilEntry(
  rawName: string,
): Promise<CreateResult<UtensilEntry>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const key = fuzzyKey(name);

  const existing = await prisma.utensil.findMany({ select: { name: true } });
  const near = existing.find((u) => fuzzyKey(u.name) === key);
  if (near) {
    return { ok: true, reused: near.name.toLowerCase() !== name.toLowerCase(), entry: { name: near.name } };
  }

  try {
    const created = await prisma.utensil.create({ data: { name }, select: { name: true } });
    revalidatePath("/parametres/ustensiles");
    return { ok: true, reused: false, entry: { name: created.name } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de la création" };
  }
}

const unitSchema = z.object({
  // The name (= the typed value) is what recipe rows store and display.
  name: z.string().trim().min(1, "Le nom est obligatoire").max(40),
  abbreviation: z.string().trim().min(1, "L'abréviation est obligatoire").max(20),
  // FK to the UnitType referential (null = type to complete later).
  typeId: z.string().trim().min(1).nullable().optional(),
});

/** Create (or reuse a close match for) a unit. Abbreviation + type required. */
export async function createUnitEntry(input: {
  name: string;
  abbreviation: string;
  typeId?: string | null;
}): Promise<CreateResult<UnitEntry>> {
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, abbreviation, typeId } = parsed.data;
  const key = fuzzyKey(name);

  const existing = await prisma.unit.findMany({ select: { name: true, abbreviation: true } });
  const near = existing.find((u) => fuzzyKey(u.name) === key);
  if (near) {
    return {
      ok: true,
      reused: near.name.toLowerCase() !== name.toLowerCase(),
      entry: { name: near.name, abbreviation: near.abbreviation },
    };
  }

  try {
    const created = await prisma.unit.create({
      data: { name, abbreviation, typeId: typeId ?? null },
      select: { name: true, abbreviation: true },
    });
    revalidatePath("/parametres/unites");
    return { ok: true, reused: false, entry: created };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec de la création";
    if (msg.includes("Unique") || msg.includes("P2002")) {
      return { ok: true, reused: true, entry: { name, abbreviation } };
    }
    return { ok: false, error: msg };
  }
}
