"use server";

// Server Actions for the editable referentials managed from /parametres:
// Aisle (rayons), UnitType (types d'unité), Tag, Category. Each one supports
// create / rename / delete with the same contract:
//  - create: accent-insensitive dedupe (reuse a close match instead of making a
//    duplicate); also called by the catalog comboboxes' "+ Créer".
//  - rename: a plain update — the relation follows the id, so every entity that
//    references the referential is renamed for free (no cascade query needed).
//  - delete: blocked server-side when the referential is still in use (usage =
//    number of related entities), mirroring the catalog "merge, don't delete".
//
// Server-only (imports prisma). Usage counts are recomputed by the reading
// pages; these actions only return the row identity on create.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { norm, type RefRow } from "@/lib/catalog";

export type RefResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const nameSchema = z.string().trim().min(1, "Le nom est obligatoire").max(60);

/** Revalidate the pages that read referentials (settings + recipe form). */
function revalidateRefConsumers() {
  revalidatePath("/parametres/ingredients");
  revalidatePath("/parametres/unites");
  revalidatePath("/parametres/rayons");
  revalidatePath("/parametres/types-unite");
  revalidatePath("/parametres/tags");
  revalidatePath("/parametres/categories");
  revalidatePath("/recettes/nouvelle");
}

function writeError(e: unknown, dupMessage: string): string {
  const msg = e instanceof Error ? e.message : "Échec de l'enregistrement";
  if (msg.includes("Unique") || msg.includes("P2002")) return dupMessage;
  return msg;
}

/* ------------------------------------------------------------------ */
/* Aisle (rayons)                                                      */
/* ------------------------------------------------------------------ */

export async function createAisle(rawName: string): Promise<RefResult<{ row: RefRow }>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const existing = await prisma.aisle.findMany({ select: { id: true, name: true } });
  const near = existing.find((a) => norm(a.name) === norm(name));
  if (near) return { ok: true, row: { id: near.id, name: near.name, uses: 0 } };
  try {
    const created = await prisma.aisle.create({ data: { name }, select: { id: true, name: true } });
    revalidateRefConsumers();
    return { ok: true, row: { ...created, uses: 0 } };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un rayon porte déjà ce nom") };
  }
}

export async function renameAisle(id: string, rawName: string): Promise<RefResult> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.aisle.update({ where: { id }, data: { name: parsed.data } });
    revalidateRefConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un rayon porte déjà ce nom") };
  }
}

export async function deleteAisle(id: string): Promise<RefResult> {
  const count = await prisma.ingredient.count({ where: { aisleId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisé par ${count} ingrédient${count > 1 ? "s" : ""} — réaffectez-les d'abord.` };
  }
  await prisma.aisle.delete({ where: { id } });
  revalidateRefConsumers();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Unit (created from the ingredient "Unité par défaut" combobox)      */
/* ------------------------------------------------------------------ */

/**
 * Creates a Unit from a typed name for the ingredient default-unit combobox
 * (abbreviation = the name, type left null → the unit shows as "À compléter").
 * Dedupes by name like the other "+ Créer" paths.
 */
export async function createUnitNamed(rawName: string): Promise<RefResult<{ row: RefRow }>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const existing = await prisma.unit.findMany({ select: { id: true, name: true } });
  const near = existing.find((u) => norm(u.name) === norm(name));
  if (near) return { ok: true, row: { id: near.id, name: near.name, uses: 0 } };
  try {
    const created = await prisma.unit.create({
      data: { name, abbreviation: name },
      select: { id: true, name: true },
    });
    revalidateRefConsumers();
    return { ok: true, row: { ...created, uses: 0 } };
  } catch (e) {
    return { ok: false, error: writeError(e, "Une unité porte déjà ce nom") };
  }
}

/* ------------------------------------------------------------------ */
/* UnitType (types d'unité)                                            */
/* ------------------------------------------------------------------ */

export async function createUnitType(rawName: string): Promise<RefResult<{ row: RefRow }>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const existing = await prisma.unitType.findMany({ select: { id: true, name: true } });
  const near = existing.find((t) => norm(t.name) === norm(name));
  if (near) return { ok: true, row: { id: near.id, name: near.name, uses: 0 } };
  try {
    const created = await prisma.unitType.create({ data: { name }, select: { id: true, name: true } });
    revalidateRefConsumers();
    return { ok: true, row: { ...created, uses: 0 } };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un type porte déjà ce nom") };
  }
}

export async function renameUnitType(id: string, rawName: string): Promise<RefResult> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.unitType.update({ where: { id }, data: { name: parsed.data } });
    revalidateRefConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un type porte déjà ce nom") };
  }
}

export async function deleteUnitType(id: string): Promise<RefResult> {
  const count = await prisma.unit.count({ where: { typeId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisé par ${count} unité${count > 1 ? "s" : ""} — réaffectez-les d'abord.` };
  }
  await prisma.unitType.delete({ where: { id } });
  revalidateRefConsumers();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Tag                                                                 */
/* ------------------------------------------------------------------ */

export async function createTag(rawName: string): Promise<RefResult<{ row: RefRow }>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const existing = await prisma.tag.findMany({ select: { id: true, name: true } });
  const near = existing.find((t) => norm(t.name) === norm(name));
  if (near) return { ok: true, row: { id: near.id, name: near.name, uses: 0 } };
  try {
    const created = await prisma.tag.create({ data: { name }, select: { id: true, name: true } });
    revalidateRefConsumers();
    return { ok: true, row: { ...created, uses: 0 } };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un tag porte déjà ce nom") };
  }
}

export async function renameTag(id: string, rawName: string): Promise<RefResult> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.tag.update({ where: { id }, data: { name: parsed.data } });
    revalidateRefConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Un tag porte déjà ce nom") };
  }
}

export async function deleteTag(id: string): Promise<RefResult> {
  const count = await prisma.recipeTag.count({ where: { tagId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisé par ${count} recette${count > 1 ? "s" : ""} — retirez-le d'abord.` };
  }
  await prisma.tag.delete({ where: { id } });
  revalidateRefConsumers();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Category                                                            */
/* ------------------------------------------------------------------ */

export async function createCategory(rawName: string): Promise<RefResult<{ row: RefRow }>> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const name = parsed.data;
  const existing = await prisma.category.findMany({ select: { id: true, name: true } });
  const near = existing.find((c) => norm(c.name) === norm(name));
  if (near) return { ok: true, row: { id: near.id, name: near.name, uses: 0 } };
  try {
    const created = await prisma.category.create({ data: { name }, select: { id: true, name: true } });
    revalidateRefConsumers();
    return { ok: true, row: { ...created, uses: 0 } };
  } catch (e) {
    return { ok: false, error: writeError(e, "Une catégorie porte déjà ce nom") };
  }
}

export async function renameCategory(id: string, rawName: string): Promise<RefResult> {
  const parsed = nameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await prisma.category.update({ where: { id }, data: { name: parsed.data } });
    revalidateRefConsumers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: writeError(e, "Une catégorie porte déjà ce nom") };
  }
}

export async function deleteCategory(id: string): Promise<RefResult> {
  const count = await prisma.recipeCategory.count({ where: { categoryId: id } });
  if (count > 0) {
    return { ok: false, error: `Utilisée par ${count} recette${count > 1 ? "s" : ""} — retirez-la d'abord.` };
  }
  await prisma.category.delete({ where: { id } });
  revalidateRefConsumers();
  return { ok: true };
}
