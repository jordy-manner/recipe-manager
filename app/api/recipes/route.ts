import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  flattenRecipe,
  recipeCategoriesCreate,
  recipeIngredientsCreate,
  recipeScalars,
  recipeTagsCreate,
  recipeUtensilsCreate,
  validateRecipeInput,
} from "@/lib/recipes";

// Includes the relations: ordered ingredients (with their unit), ordered
// utensils, sorted tags, ordered categories.
const withRelations = {
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
} as const;

// GET /api/recipes — list of recipes (most recent first)
export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: withRelations,
  });
  return NextResponse.json(recipes.map(flattenRecipe));
}

// POST /api/recipes — create
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const result = validateRecipeInput(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeScalars(result.data),
      recipeIngredients: { create: recipeIngredientsCreate(result.data) },
      recipeUtensils: { create: recipeUtensilsCreate(result.data) },
      recipeTags: { create: recipeTagsCreate(result.data) },
      recipeCategories: { create: recipeCategoriesCreate(result.data) },
    },
    include: withRelations,
  });
  return NextResponse.json(flattenRecipe(recipe), { status: 201 });
}
