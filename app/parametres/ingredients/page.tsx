import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogTable, type CatalogRow, type Column } from "../_catalog-table";
import { createAisle, createUnitNamed } from "../ref-actions";

export const metadata: Metadata = { title: "Ingrédients" };
export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const [ingredients, units, aisles] = await Promise.all([
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        aisleId: true,
        defaultUnitId: true,
        image: true,
        _count: { select: { recipeIngredients: true } },
      },
    }),
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, abbreviation: true },
    }),
    prisma.aisle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: CatalogRow[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    aisleId: i.aisleId,
    defaultUnitId: i.defaultUnitId,
    image: i.image,
    uses: i._count.recipeIngredients,
  }));

  const columns: Column[] = [
    {
      key: "name",
      label: "Nom",
      type: "text",
      strong: true,
      width: "minmax(160px,1.4fr)",
      placeholder: "Nom de l'ingrédient",
    },
    {
      key: "aisleId",
      label: "Rayon",
      type: "combo",
      options: aisles.map((a) => ({ value: a.id, label: a.name })),
      onCreate: createAisle,
      width: "minmax(130px,1fr)",
      placeholder: "Rayon…",
    },
    {
      key: "defaultUnitId",
      label: "Unité par défaut",
      type: "combo",
      options: units.map((u) => ({
        value: u.id,
        label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
      })),
      onCreate: createUnitNamed,
      width: "minmax(140px,1fr)",
      placeholder: "Unité…",
    },
  ];

  return (
    <CatalogTable
      title="Ingrédients"
      subtitle="Le catalogue partagé par toutes les recettes."
      addLabel="Ajouter un ingrédient"
      catalogKind="ingredient"
      hasImage
      columns={columns}
      initialRows={rows}
      requiredKeys={["aisleId", "defaultUnitId"]}
    />
  );
}
