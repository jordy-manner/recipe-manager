import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { asLines, flattenRecipe } from "@/lib/recipes";
import type { RecipeCardData } from "../../components/recipe-card";
import { RecipeDetail } from "../recipe-detail";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  return { title: recipe?.title ?? "Recette introuvable" };
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const row = await prisma.recipe.findUnique({
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
  });

  if (!row) {
    notFound();
  }

  const flat = flattenRecipe(row);
  const categoryIds = row.recipeCategories.map((rc) => rc.categoryId);

  // Up to 3 other recipes sharing at least one category.
  const relatedRows = categoryIds.length
    ? await prisma.recipe.findMany({
        where: {
          id: { not: id },
          recipeCategories: { some: { categoryId: { in: categoryIds } } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          recipeTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
          recipeCategories: {
            include: { category: true },
            orderBy: { position: "asc" },
          },
        },
      })
    : [];

  const related: RecipeCardData[] = relatedRows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    difficulty: r.difficulty,
    rating: r.rating,
    imageUrl: r.imageUrl,
    tags: r.recipeTags.map((rt) => rt.tag.name),
    categories: r.recipeCategories.map((rc) => rc.category.name),
  }));

  const recipe = {
    id: flat.id,
    title: flat.title,
    description: flat.description,
    servings: flat.servings,
    prepTime: flat.prepTime,
    cookTime: flat.cookTime,
    difficulty: flat.difficulty,
    rating: flat.rating,
    author: flat.author,
    imageUrl: flat.imageUrl,
    kcal: flat.kcal,
    protein: flat.protein,
    carbs: flat.carbs,
    fat: flat.fat,
    tags: flat.tags.map((t) => t.name),
    categories: flat.categories.map((c) => c.name),
    ingredients: flat.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    utensils: flat.utensils.map((u) => ({ name: u.name, quantity: u.quantity })),
    steps: asLines(flat.steps),
  };

  return <RecipeDetail recipe={recipe} related={related} />;
}
