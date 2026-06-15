import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogTable, type CatalogRow, type Column } from "../_catalog-table";
import { createUnitType } from "../ref-actions";

export const metadata: Metadata = { title: "Unités" };
export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const [units, unitTypes] = await Promise.all([
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        typeId: true,
        _count: { select: { recipeIngredients: true } },
      },
    }),
    prisma.unitType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: CatalogRow[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation,
    typeId: u.typeId,
    uses: u._count.recipeIngredients,
  }));

  const columns: Column[] = [
    {
      key: "name",
      label: "Nom",
      type: "text",
      strong: true,
      width: "minmax(150px,1.4fr)",
      placeholder: "ex. Gramme",
    },
    {
      key: "abbreviation",
      label: "Abréviation",
      type: "text",
      width: "minmax(110px,0.8fr)",
      placeholder: "ex. g",
    },
    {
      key: "typeId",
      label: "Type",
      type: "combo",
      options: unitTypes.map((t) => ({ value: t.id, label: t.name })),
      onCreate: createUnitType,
      width: "minmax(150px,1fr)",
      placeholder: "Type…",
    },
  ];

  return (
    <CatalogTable
      title="Unités"
      subtitle="Les unités de mesure disponibles pour les quantités."
      addLabel="Ajouter une unité"
      catalogKind="unit"
      hasImage={false}
      columns={columns}
      initialRows={rows}
      requiredKeys={["abbreviation", "typeId"]}
    />
  );
}
