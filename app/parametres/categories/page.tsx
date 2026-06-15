import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RefList } from "../_ref-list";
import { createCategory, renameCategory, deleteCategory } from "../ref-actions";

export const metadata: Metadata = { title: "Catégories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { recipeCategories: true } } },
  });
  const rows = categories.map((c) => ({ id: c.id, name: c.name, uses: c._count.recipeCategories }));

  return (
    <RefList
      title="Catégories"
      subtitle="Les types de plats (entrée, plat, dessert…)."
      icon="grid"
      addLabel="Ajouter une catégorie"
      placeholder="ex. Dessert"
      usageNoun="recette"
      note="Une catégorie utilisée par une recette ne peut pas être supprimée — retirez-la d'abord des recettes concernées."
      initialRows={rows}
      create={createCategory}
      rename={renameCategory}
      remove={deleteCategory}
    />
  );
}
