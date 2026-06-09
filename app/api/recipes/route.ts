import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRecipeInput } from "@/lib/recipes";

// GET /api/recipes — liste des recettes (plus récentes d'abord)
export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recipes);
}

// POST /api/recipes — création
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

  const recipe = await prisma.recipe.create({ data: result.data });
  return NextResponse.json(recipe, { status: 201 });
}