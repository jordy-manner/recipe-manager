import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMediaStore } from "@/lib/media";
import { Icon } from "../../components/icons";
import { createRecipeAction } from "../actions";
import { RecipeForm } from "../recipe-form";

export const metadata = { title: "Nouvelle recette" };

// Catalogs (ingredients/units/tags/categories) read from the DB → on demand.
export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const [ingredients, units, utensils, tags, categories] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.unit.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.utensil.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] animate-fade-up px-[18px] pb-20 pt-7 sm:px-8">
      <Link
        href="/recipes"
        className="inline-flex items-center gap-2 py-1.5 text-[15px] font-semibold text-ink-soft transition hover:text-accent"
      >
        <Icon name="back" size={18} /> Retour
      </Link>
      <h1 className="mb-8 mt-3 font-display text-[clamp(30px,4vw,44px)] font-medium tracking-[-0.02em]">
        Nouvelle recette
      </h1>
      <RecipeForm
        action={createRecipeAction}
        submitLabel="Publier la recette"
        ingredientOptions={ingredients.map((i) => i.name)}
        unitOptions={units.map((u) => u.name)}
        utensilOptions={utensils.map((u) => u.name)}
        tagOptions={tags.map((t) => t.name)}
        categoryOptions={categories.map((c) => c.name)}
        mediaEnabled={getMediaStore().configured}
      />
    </main>
  );
}
