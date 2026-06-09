

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asLines } from "@/lib/recipes";
import { updateRecipeAction } from "../../actions";
import { RecipeForm } from "../../recipe-form";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Modifier la recette" };

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });

  if (!recipe) {
    notFound();
  }

  // updateRecipeAction(id, prevState, formData) → on fige l'id via bind.
  const action = updateRecipeAction.bind(null, recipe.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href={`/recipes/${recipe.id}`} className="text-sm text-zinc-500 hover:underline">
        ← Retour à la recette
      </Link>
      <h1 className="mb-8 mt-4 text-2xl font-semibold">Modifier la recette</h1>
      <RecipeForm
        action={action}
        submitLabel="Enregistrer"
        defaultValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings?.toString() ?? "",
          prepTime: recipe.prepTime?.toString() ?? "",
          cookTime: recipe.cookTime?.toString() ?? "",
          ingredients: asLines(recipe.ingredients).join("\n"),
          steps: asLines(recipe.steps).join("\n"),
          tags: recipe.tags.join(", "),
        }}
      />
    </main>
  );
}