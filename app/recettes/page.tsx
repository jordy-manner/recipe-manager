import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isSearchActive, searchRecipeIds, type SearchParams } from "@/lib/search";
import type { RecipeCardData, RecipeView } from "../components/recipe-card";
import {
  cardInclude,
  EmptyState,
  RECIPE_VIEWS,
  RecipesLayout,
  SectionHead,
  ViewSwitcher,
  toCard,
  type CardRow,
} from "./_shared";
import { SearchControls } from "./search-controls";

export const metadata = { title: "Catalogue" };

// DB-dependent data → rendered on demand (no static prerender at build time).
export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params: SearchParams = {
    q: str(sp.q),
    byIngredient: str(sp.ing) === "1",
    category: str(sp.cat) || null,
    maxTime: Number(str(sp.t)) || 0,
    difficulty: Number(str(sp.d)) || 0,
  };
  const viewRaw = str(sp.view) as RecipeView;
  const view: RecipeView = RECIPE_VIEWS.some((v) => v.key === viewRaw) ? viewRaw : "magazine";
  const active = isSearchActive(params);

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });

  let resultsView: React.ReactNode;

  if (active) {
    const hits = await searchRecipeIds(params);
    const rows = hits.length
      ? ((await prisma.recipe.findMany({
          where: { id: { in: hits.map((h) => h.id) } },
          include: cardInclude,
        })) as unknown as CardRow[])
      : [];
    const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
    const results = hits.map((h) => byId.get(h.id)).filter(Boolean) as RecipeCardData[];

    const termCount = params.q.split(",").map((t) => t.trim()).filter(Boolean).length;
    const matches =
      params.byIngredient && params.q.trim()
        ? new Map(hits.map((h) => [h.id, { count: h.score, total: termCount }]))
        : undefined;

    resultsView = (
      <section>
        <SectionHead
          title={`${results.length} recette${results.length > 1 ? "s" : ""}`}
          action={
            <div className="flex items-center gap-3">
              <ViewSwitcher current={view} />
              <Link
                href="/recettes"
                className="inline-flex items-center gap-1 text-[14px] font-bold text-accent-ink transition hover:text-accent"
              >
                Réinitialiser
              </Link>
            </div>
          }
        />
        {results.length > 0 ? (
          <RecipesLayout view={view} recipes={results} matches={matches} />
        ) : (
          <p className="rounded-card border border-dashed border-line px-4 py-12 text-center text-ink-soft">
            Aucune recette ne correspond à votre recherche.
          </p>
        )}
      </section>
    );
  } else {
    const rows = (await prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      include: cardInclude,
    })) as unknown as CardRow[];

    resultsView =
      rows.length === 0 ? (
        <EmptyState />
      ) : (
        <section>
          <SectionHead
            title={`${rows.length} recette${rows.length > 1 ? "s" : ""}`}
            action={<ViewSwitcher current={view} />}
          />
          <RecipesLayout view={view} recipes={rows.map(toCard)} />
        </section>
      );
  }

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] sm:px-8">
      <section className="pb-6 pt-12">
        <p className="eyebrow">Catalogue</p>
        <h1 className="mb-7 mt-3 font-display text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">
          Toutes les recettes
        </h1>
        <SearchControls categories={categories.map((c) => c.name)} />
      </section>

      <div className="pb-4 pt-7">{resultsView}</div>
    </main>
  );
}
