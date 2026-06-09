import Link from "next/link";
import { createRecipeAction } from "../actions";
import { RecipeForm } from "../recipe-form";

export const metadata = { title: "Nouvelle recette" };

export default function NewRecipePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/recipes" className="text-sm text-zinc-500 hover:underline">
        ← Retour aux recettes
      </Link>
      <h1 className="mb-8 mt-4 text-2xl font-semibold">Nouvelle recette</h1>
      <RecipeForm action={createRecipeAction} submitLabel="Créer la recette" />
    </main>
  );
}