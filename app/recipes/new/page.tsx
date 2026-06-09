import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createRecipeAction } from "../actions";
import { RecipeForm } from "../recipe-form";

export const metadata = { title: "Nouvelle recette" };

export default async function NewRecipePage() {
  const [ingredients, units] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.unit.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/recipes" className="text-sm text-zinc-500 hover:underline">
        ← Retour aux recettes
      </Link>
      <h1 className="mb-8 mt-4 text-2xl font-semibold">Nouvelle recette</h1>
      <RecipeForm
        action={createRecipeAction}
        submitLabel="Créer la recette"
        ingredientOptions={ingredients.map((i) => i.name)}
        unitOptions={units.map((u) => u.name)}
      />
    </main>
  );
}
