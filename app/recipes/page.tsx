import { prisma } from "@/lib/prisma";
import { HomeScreen } from "./home-screen";

export const metadata = { title: "Recettes" };

// DB-dependent data → rendered on demand (no static prerender at build time).
export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [rows, categories] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        recipeTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
        recipeCategories: {
          include: { category: true },
          orderBy: { position: "asc" },
        },
        recipeIngredients: {
          include: { ingredient: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const recipes = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    difficulty: r.difficulty,
    rating: r.rating,
    imageUrl: r.imageUrl,
    popular: r.popular,
    tags: r.recipeTags.map((rt) => rt.tag.name),
    categories: r.recipeCategories.map((rc) => rc.category.name),
    ingredients: r.recipeIngredients.map((ri) => ri.ingredient.name),
  }));

  return <HomeScreen recipes={recipes} categories={categories.map((c) => c.name)} />;
}
