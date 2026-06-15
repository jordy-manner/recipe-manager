import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RefList } from "../_ref-list";
import { createAisle, renameAisle, deleteAisle } from "../ref-actions";

export const metadata: Metadata = { title: "Rayons" };
export const dynamic = "force-dynamic";

export default async function RayonsPage() {
  const aisles = await prisma.aisle.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { ingredients: true } } },
  });
  const rows = aisles.map((a) => ({ id: a.id, name: a.name, uses: a._count.ingredients }));

  return (
    <RefList
      title="Rayons"
      subtitle="Les rayons utilisés pour classer les ingrédients."
      icon="folder"
      addLabel="Ajouter un rayon"
      placeholder="ex. Épicerie"
      usageNoun="ingrédient"
      note="Un rayon utilisé par un ingrédient ne peut pas être supprimé — réaffectez d'abord les ingrédients concernés."
      initialRows={rows}
      create={createAisle}
      rename={renameAisle}
      remove={deleteAisle}
    />
  );
}
