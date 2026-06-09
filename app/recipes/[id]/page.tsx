import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asLines } from "@/lib/recipes";
import { deleteRecipeAction } from "../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  return { title: recipe?.title ?? "Recette introuvable" };
}

function Meta({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div className="rounded-md bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-900">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });

  if (!recipe) {
    notFound();
  }

  const ingredients = asLines(recipe.ingredients);
  const steps = asLines(recipe.steps);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/recipes" className="text-sm text-zinc-500 hover:underline">
        ← Retour aux recettes
      </Link>

      <div className="mb-6 mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
          {recipe.description && (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{recipe.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Modifier
          </Link>
          <form action={deleteRecipeAction}>
            <input type="hidden" name="id" value={recipe.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Meta label="parts" value={recipe.servings} />
        <Meta label="prépa (min)" value={recipe.prepTime} />
        <Meta label="cuisson (min)" value={recipe.cookTime} />
      </div>

      {ingredients.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Ingrédients</h2>
          <ul className="list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            {ingredients.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Étapes</h2>
          <ol className="list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}