"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMediaStore } from "@/lib/media";
import {
  recipeCategoriesCreate,
  recipeIngredientsCreate,
  recipeInputFromFormData,
  recipeScalars,
  recipeSourcesCreate,
  recipeStepsCreate,
  recipeTagsCreate,
  recipeUtensilsCreate,
  resolveSectionId,
  slugify,
  type RecipeInput,
} from "@/lib/recipes";

// State returned to the form via useActionState (error display).
export type FormState = { error: string | null };

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Creates ingredient + step sections inside a transaction and returns their DB
 * IDs indexed by position (matching the form's ingSectionTitles / stepSectionTitles).
 */
async function createSections(
  tx: TxClient,
  recipeId: string,
  input: RecipeInput,
): Promise<{ ingSectionIds: string[]; stepSectionIds: string[] }> {
  const ingSections = await Promise.all(
    input.ingSectionTitles.map((title, position) =>
      tx.ingredientSection.create({ data: { recipeId, title, position } }),
    ),
  );
  const stepSections = await Promise.all(
    input.stepSectionTitles.map((title, position) =>
      tx.stepSection.create({ data: { recipeId, title, position } }),
    ),
  );
  return {
    ingSectionIds: ingSections.map((s) => s.id),
    stepSectionIds: stepSections.map((s) => s.id),
  };
}

/** Creates RecipeIngredient rows with sectionId resolved from form indices. */
async function createIngredients(
  tx: TxClient,
  recipeId: string,
  input: RecipeInput,
  ingSectionIds: string[],
) {
  const rows = recipeIngredientsCreate(input);
  for (let i = 0; i < rows.length; i++) {
    const sectionId = resolveSectionId(input.ingredients[i]?.sectionIdx, ingSectionIds);
    await tx.recipeIngredient.create({
      data: {
        ...rows[i],
        // Use relational connect to stay consistent with ingredient/unit connectOrCreate.
        recipe: { connect: { id: recipeId } },
        ...(sectionId ? { section: { connect: { id: sectionId } } } : {}),
      },
    });
  }
}

/** Creates Step rows with sectionId resolved from form indices. */
async function createSteps(
  tx: TxClient,
  recipeId: string,
  input: RecipeInput,
  stepSectionIds: string[],
) {
  const rows = recipeStepsCreate(input);
  for (let i = 0; i < rows.length; i++) {
    const sectionId = resolveSectionId(input.stepSectionIdxs[i], stepSectionIds);
    await tx.step.create({
      data: {
        ...rows[i],
        recipe: { connect: { id: recipeId } },
        ...(sectionId ? { section: { connect: { id: sectionId } } } : {}),
      },
    });
  }
}

/** Returns a unique slug based on `base`, suffixing -2, -3… on collision. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.recipe.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n++}`;
  }
}

type ImageFields = { imageUrl: string | null; imagePublicId: string | null };

/**
 * Resolves the recipe image from the submitted form. A new file (`photo`) is
 * uploaded to the media store; the `removePhoto` flag clears it. `previous`
 * holds the currently stored asset (on edit) so we can keep it untouched when
 * nothing changed and delete it when it is replaced/removed.
 */
async function resolveImage(
  formData: FormData,
  previous?: ImageFields,
): Promise<ImageFields> {
  const file = formData.get("photo");
  const removePhoto = formData.get("removePhoto") === "true";
  const media = getMediaStore();

  if (file instanceof File && file.size > 0) {
    const uploaded = await media.upload(file);
    if (previous?.imagePublicId) await media.remove(previous.imagePublicId);
    return { imageUrl: uploaded.url, imagePublicId: uploaded.publicId };
  }

  if (removePhoto) {
    if (previous?.imagePublicId) await media.remove(previous.imagePublicId);
    return { imageUrl: null, imagePublicId: null };
  }

  // No upload: a web-imported image URL (no previous asset) is stored as-is.
  const prefilled = formData.get("prefilledImageUrl");
  if (!previous?.imageUrl && typeof prefilled === "string" && /^https?:\/\//i.test(prefilled)) {
    return { imageUrl: prefilled, imagePublicId: null };
  }

  // No change: keep whatever was already stored (null on create).
  return {
    imageUrl: previous?.imageUrl ?? null,
    imagePublicId: previous?.imagePublicId ?? null,
  };
}

export async function createRecipeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = recipeInputFromFormData(formData);
  if (!result.ok) {
    return { error: result.errors.join(" · ") };
  }

  let image: ImageFields;
  try {
    image = await resolveImage(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec de l'upload de la photo" };
  }

  const slug = await uniqueSlug(slugify(result.data.title));
  const input = result.data;

  const recipe = await prisma.$transaction(async (tx) => {
    const r = await tx.recipe.create({
      data: {
        slug,
        ...recipeScalars(input),
        ...image,
        ...(input.servingUnit
          ? { servingUnit: { connectOrCreate: { where: { name: input.servingUnit }, create: { name: input.servingUnit } } } }
          : {}),
        recipeUtensils: { create: recipeUtensilsCreate(input) },
        recipeTags: { create: recipeTagsCreate(input) },
        recipeCategories: { create: recipeCategoriesCreate(input) },
        recipeSources: { create: recipeSourcesCreate(input) },
      },
    });
    const { ingSectionIds, stepSectionIds } = await createSections(tx, r.id, input);
    await createIngredients(tx, r.id, input, ingSectionIds);
    await createSteps(tx, r.id, input, stepSectionIds);
    return r;
  }, { timeout: 15000 });

  revalidatePath("/recettes");
  redirect(`/recettes/${recipe.slug}`);
}

export async function updateRecipeAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = recipeInputFromFormData(formData);
  if (!result.ok) {
    return { error: result.errors.join(" · ") };
  }

  const existing = await prisma.recipe.findUnique({
    where: { id },
    select: { imageUrl: true, imagePublicId: true, slug: true },
  });
  if (!existing) {
    return { error: "Recette introuvable" };
  }

  let image: ImageFields;
  try {
    image = await resolveImage(formData, existing);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec de l'upload de la photo" };
  }

  const input = result.data;

  await prisma.$transaction(async (tx) => {
    // Delete sections first (SET NULL cascades to ingredients/steps via FK).
    await tx.ingredientSection.deleteMany({ where: { recipeId: id } });
    await tx.stepSection.deleteMany({ where: { recipeId: id } });

    await tx.recipe.update({
      where: { id },
      data: {
        ...recipeScalars(input),
        ...image,
        ...(input.servingUnit
          ? { servingUnit: { connectOrCreate: { where: { name: input.servingUnit }, create: { name: input.servingUnit } } } }
          : { servingUnitId: null }),
        recipeIngredients: { deleteMany: {} },
        recipeUtensils: { deleteMany: {}, create: recipeUtensilsCreate(input) },
        recipeTags: { deleteMany: {}, create: recipeTagsCreate(input) },
        recipeCategories: { deleteMany: {}, create: recipeCategoriesCreate(input) },
        recipeSteps: { deleteMany: {} },
        recipeSources: { deleteMany: {}, create: recipeSourcesCreate(input) },
      },
    });

    const { ingSectionIds, stepSectionIds } = await createSections(tx, id, input);
    await createIngredients(tx, id, input, ingSectionIds);
    await createSteps(tx, id, input, stepSectionIds);
  }, { timeout: 15000 });

  revalidatePath("/recettes");
  revalidatePath(`/recettes/${existing.slug}`);
  redirect(`/recettes/${existing.slug}`);
}

export async function deleteRecipeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const existing = await prisma.recipe.findUnique({
    where: { id },
    select: { imagePublicId: true },
  });
  await prisma.recipe.delete({ where: { id } });
  if (existing?.imagePublicId) {
    await getMediaStore().remove(existing.imagePublicId);
  }

  revalidatePath("/recettes");
  redirect("/recettes");
}
