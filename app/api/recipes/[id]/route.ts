import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRecipeInput } from "@/lib/recipes";

// En Next 16, les params d'une route dynamique sont asynchrones (Promise).
type Params = { params: Promise<{ id: string }> };

// GET /api/recipes/[id]
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id } });

  if (!recipe) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }
  return NextResponse.json(recipe);
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

  const recipe = await prisma.recipe.update({ where: { id }, data: result.data });
  return NextResponse.json(recipe);
}

// DELETE /api/recipes/[id]
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}