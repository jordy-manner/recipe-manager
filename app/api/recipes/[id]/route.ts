import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  flattenRecipe,
  recipeIngredientsCreate,
  recipeScalars,
  recipeTagsCreate,
  validateRecipeInput,
} from "@/lib/recipes";

// En Next 16, les params d'une route dynamique sont asynchrones (Promise).
type Params = { params: Promise<{ id: string }> };

const withRelations = {
  recipeIngredients: {
    include: { ingredient: true, unit: true },
    orderBy: { position: "asc" },
  },
  recipeTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
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

// PUT /api/recipes/[id] — mise à jour complète
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
      // Remplace l'ensemble des lignes d'ingrédients de la recette.
      recipeIngredients: {
        deleteMany: {},
        create: recipeIngredientsCreate(result.data),
      },
      // Remplace les liens de tags (les liens, pas les Tags eux-mêmes).
      recipeTags: { deleteMany: {}, create: recipeTagsCreate(result.data) },
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

  // Lignes RecipeIngredient et RecipeTag supprimées en cascade (onDelete: Cascade).
  await prisma.recipe.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
