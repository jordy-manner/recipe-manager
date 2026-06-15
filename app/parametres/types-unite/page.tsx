import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RefList } from "../_ref-list";
import { createUnitType, renameUnitType, deleteUnitType } from "../ref-actions";

export const metadata: Metadata = { title: "Types d'unité" };
export const dynamic = "force-dynamic";

export default async function UnitTypesPage() {
  const types = await prisma.unitType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { units: true } } },
  });
  const rows = types.map((t) => ({ id: t.id, name: t.name, uses: t._count.units }));

  return (
    <RefList
      title="Types d'unité"
      subtitle="Les familles de mesure des unités (masse, volume…)."
      icon="layers"
      addLabel="Ajouter un type"
      placeholder="ex. Volume"
      usageNoun="unité"
      note="Un type utilisé par une unité ne peut pas être supprimé — réaffectez d'abord les unités concernées."
      initialRows={rows}
      create={createUnitType}
      rename={renameUnitType}
      remove={deleteUnitType}
    />
  );
}
