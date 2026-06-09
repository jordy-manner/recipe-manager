"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recipeInputFromFormData } from "@/lib/recipes";

// État renvoyé au formulaire via useActionState (affichage des erreurs).
export type FormState = { error: string | null };

export async function createRecipeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = recipeInputFromFormData(formData);
  if (!result.ok) {
    return { error: result.errors.join(" · ") };
  }

  const recipe = await prisma.recipe.create({ data: result.data });

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

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Recette introuvable" };
  }

  await prisma.recipe.update({ where: { id }, data: result.data });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.recipe.delete({ where: { id } });

  revalidatePath("/recipes");
  redirect("/recipes");
}