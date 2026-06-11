import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMediaStore } from "@/lib/media";
import { asLines, flattenRecipe } from "@/lib/recipes";
import { Icon } from "../../../components/icons";
import { updateRecipeAction } from "../../actions";
import { RecipeForm } from "../../recipe-form";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Modifier la recette" };

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  const [row, ingredients, units, utensils, tags, categories] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        recipeIngredients: {
          include: { ingredient: true, unit: true },
          orderBy: { position: "asc" },
        },
        recipeUtensils: {
          include: { utensil: true },
          orderBy: { position: "asc" },
        },
        recipeTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
        recipeCategories: {
          include: { category: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.unit.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.utensil.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  if (!row) {
    notFound();
  }

  const recipe = flattenRecipe(row);

  // updateRecipeAction(id, prevState, formData) → we pin the id via bind.
  const action = updateRecipeAction.bind(null, recipe.id);

  return (
    <main className="mx-auto w-full max-w-[1180px] animate-fade-up px-[18px] pb-20 pt-7 sm:px-8">
      <Link
        href={`/recipes/${recipe.id}`}
        className="inline-flex items-center gap-2 py-1.5 text-[15px] font-semibold text-ink-soft transition hover:text-accent"
      >
        <Icon name="back" size={18} /> Retour à la recette
      </Link>
      <h1 className="mb-8 mt-3 font-display text-[clamp(30px,4vw,44px)] font-medium tracking-[-0.02em]">
        Modifier la recette
      </h1>
      <RecipeForm
        action={action}
        submitLabel="Enregistrer"
        ingredientOptions={ingredients.map((i) => i.name)}
        unitOptions={units.map((u) => u.name)}
        utensilOptions={utensils.map((u) => u.name)}
        tagOptions={tags.map((t) => t.name)}
        categoryOptions={categories.map((c) => c.name)}
        mediaEnabled={getMediaStore().configured}
        defaultValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings?.toString() ?? "",
          prepTime: recipe.prepTime?.toString() ?? "",
          cookTime: recipe.cookTime?.toString() ?? "",
          difficulty: recipe.difficulty,
          rating: recipe.rating?.toString() ?? "",
          author: recipe.author ?? "",
          popular: recipe.popular,
          kcal: recipe.kcal?.toString() ?? "",
          protein: recipe.protein?.toString() ?? "",
          carbs: recipe.carbs?.toString() ?? "",
          fat: recipe.fat?.toString() ?? "",
          imageUrl: recipe.imageUrl,
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity?.toString() ?? "",
            unit: i.unit ?? "",
          })),
          utensils: recipe.utensils.map((u) => ({
            name: u.name,
            quantity: u.quantity?.toString() ?? "",
          })),
          steps: asLines(recipe.steps),
          tags: recipe.tags.map((t) => t.name),
          categories: recipe.categories.map((c) => c.name),
        }}
      />
    </main>
  );
}
