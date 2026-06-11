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

// In Next 16, a dynamic route's params are asynchronous (Promise).
type Params = { params: Promise<{ id: string }> };

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

// GET /api/recipes/[id]
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: withRelations,
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }
  return NextResponse.json(flattenRecipe(recipe));
}

// PUT /api/recipes/[id] — full update
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;

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

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      ...recipeScalars(result.data),
      // Replace all of the recipe's ingredient rows.
      recipeIngredients: {
        deleteMany: {},
        create: recipeIngredientsCreate(result.data),
      },
      // Replace all of the recipe's utensil rows.
      recipeUtensils: {
        deleteMany: {},
        create: recipeUtensilsCreate(result.data),
      },
      // Replace the tag links (the links, not the Tags themselves).
      recipeTags: { deleteMany: {}, create: recipeTagsCreate(result.data) },
      // Replace the category links.
      recipeCategories: {
        deleteMany: {},
        create: recipeCategoriesCreate(result.data),
      },
    },
    include: withRelations,
  });
  return NextResponse.json(flattenRecipe(recipe));
}

// DELETE /api/recipes/[id]
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  // RecipeIngredient and RecipeTag rows are deleted in cascade (onDelete: Cascade).
  await prisma.recipe.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
