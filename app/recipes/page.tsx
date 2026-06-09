import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Recettes" };

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes recettes</h1>
        <Link
          href="/recipes/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + Nouvelle recette
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-12 text-center text-zinc-500 dark:border-zinc-700">
          Aucune recette pour l’instant. Créez la première !
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="block rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{recipe.title}</span>
                  {recipe.tags.length > 0 && (
                    <span className="shrink-0 text-xs text-zinc-500">
                      {recipe.tags.join(" · ")}
                    </span>
                  )}
                </div>
                {recipe.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                    {recipe.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}