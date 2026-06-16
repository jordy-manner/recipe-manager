import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMediaStore } from "@/lib/media";
import { flattenRecipe } from "@/lib/recipes";
import { Icon } from "../../../components/icons";
import { updateRecipeAction } from "../../actions";
import { RecipeForm } from "../../recipe-form";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Modifier la recette" };

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: Props) {
  const { slug } = await params;
  const [row, ingredients, units, utensils, tags, categories, unitTypes] = await Promise.all([
    prisma.recipe.findUnique({
      where: { slug },
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
        recipeSteps: { orderBy: { order: "asc" } },
        recipeSources: { orderBy: { position: "asc" } },
        ingredientSections: { orderBy: { position: "asc" } },
        stepSections: { orderBy: { position: "asc" } },
      },
    }),
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      select: { name: true, aisleId: true, defaultUnitId: true, defaultUnit: { select: { name: true } } },
    }),
    prisma.unit.findMany({ orderBy: { name: "asc" }, select: { name: true, abbreviation: true } }),
    prisma.utensil.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.unitType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!row) {
    notFound();
  }

  const recipe = flattenRecipe(row);

  // updateRecipeAction(id, prevState, formData) → we pin the id via bind.
  const action = updateRecipeAction.bind(null, recipe.id);

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] pb-20 pt-7 sm:px-8">
      <Link
        href={`/recettes/${recipe.slug}`}
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
        ingredientOptions={ingredients.map((i) => ({
          name: i.name,
          defaultUnit: i.defaultUnit?.name ?? null,
          incomplete: !i.defaultUnitId || !i.aisleId,
        }))}
        unitOptions={units.map((u) => ({ name: u.name, abbreviation: u.abbreviation }))}
        utensilOptions={utensils.map((u) => u.name)}
        tagOptions={tags.map((t) => t.name)}
        categoryOptions={categories.map((c) => c.name)}
        unitTypeOptions={unitTypes}
        mediaEnabled={getMediaStore().configured}
        defaultValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings?.toString() ?? "",
          prepTime: recipe.prepTime?.toString() ?? "",
          cookTime: recipe.cookTime?.toString() ?? "",
          restTime: recipe.restTime?.toString() ?? "",
          difficulty: recipe.difficulty,
          rating: recipe.rating?.toString() ?? "",
          author: recipe.author ?? "",
          popular: recipe.popular,
          kcal: recipe.kcal?.toString() ?? "",
          protein: recipe.protein?.toString() ?? "",
          carbs: recipe.carbs?.toString() ?? "",
          fat: recipe.fat?.toString() ?? "",
          imageUrl: recipe.imageUrl,
          ingSections: recipe.ingredientSections,
          stepSections: recipe.stepSections,
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity?.toString() ?? "",
            unit: i.unit ?? "",
            isPrimary: i.isPrimary,
            sectionId: i.sectionId,
          })),
          utensils: recipe.utensils.map((u) => ({
            name: u.name,
            quantity: u.quantity?.toString() ?? "",
          })),
          steps: recipe.steps,
          tags: recipe.tags.map((t) => t.name),
          categories: recipe.categories.map((c) => c.name),
          sources: recipe.sources.map((s) => s.value),
          seasonMode: recipe.seasonMode,
          seasonMonths: recipe.seasonMonths,
        }}
      />
    </main>
  );
}
