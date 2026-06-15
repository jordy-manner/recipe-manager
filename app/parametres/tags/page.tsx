import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RefList } from "../_ref-list";
import { createTag, renameTag, deleteTag } from "../ref-actions";

export const metadata: Metadata = { title: "Tags" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { recipeTags: true } } },
  });
  const rows = tags.map((t) => ({ id: t.id, name: t.name, uses: t._count.recipeTags }));

  return (
    <RefList
      title="Tags"
      subtitle="Étiquettes libres pour qualifier les recettes (végé, rapide…)."
      icon="tag"
      addLabel="Ajouter un tag"
      placeholder="ex. Sans gluten"
      usageNoun="recette"
      note="Un tag utilisé par une recette ne peut pas être supprimé — retirez-le d'abord des recettes concernées."
      initialRows={rows}
      create={createTag}
      rename={renameTag}
      remove={deleteTag}
    />
  );
}
