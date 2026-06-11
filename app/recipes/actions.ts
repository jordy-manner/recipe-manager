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
  recipeTagsCreate,
  recipeUtensilsCreate,
} from "@/lib/recipes";

// State returned to the form via useActionState (error display).
export type FormState = { error: string | null };

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

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeScalars(result.data),
      ...image,
      recipeIngredients: { create: recipeIngredientsCreate(result.data) },
      recipeUtensils: { create: recipeUtensilsCreate(result.data) },
      recipeTags: { create: recipeTagsCreate(result.data) },
      recipeCategories: { create: recipeCategoriesCreate(result.data) },
    },
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
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
    select: { imageUrl: true, imagePublicId: true },
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

  await prisma.recipe.update({
    where: { id },
    data: {
      ...recipeScalars(result.data),
      ...image,
      recipeIngredients: {
        deleteMany: {},
        create: recipeIngredientsCreate(result.data),
      },
      recipeUtensils: {
        deleteMany: {},
        create: recipeUtensilsCreate(result.data),
      },
      recipeTags: { deleteMany: {}, create: recipeTagsCreate(result.data) },
      recipeCategories: {
        deleteMany: {},
        create: recipeCategoriesCreate(result.data),
      },
    },
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
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

  revalidatePath("/recipes");
  redirect("/recipes");
}
