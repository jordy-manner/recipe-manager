import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isSearchActive, searchRecipeIds, type SearchParams } from "@/lib/search";
import { Icon } from "./components/icons";
import {
  cardInclude,
  EmptyState,
  RECIPE_VIEWS,
  RecipesLayout,
  SectionHead,
  ViewSwitcher,
  toCard,
  type CardRow,
} from "./recettes/_shared";
import { SearchControls } from "./recettes/search-controls";
import type { RecipeCardData, RecipeView } from "./components/recipe-card";

export const metadata = { title: "Sur le Plat — Recettes maison" };

// DB-dependent data → rendered on demand (no static prerender at build time).
export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function HomePage({
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

  const [categories, total] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.recipe.count(),
  ]);

  let mainSection: React.ReactNode;

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

    mainSection = (
      <section>
        <SectionHead
          title={`${results.length} recette${results.length > 1 ? "s" : ""}`}
          action={
            <div className="flex items-center gap-3">
              <ViewSwitcher current={view} basePath="/" />
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-[14px] font-bold text-accent-ink transition hover:text-accent"
              >
                Réinitialiser
              </Link>
            </div>
          }
        />
        {results.length > 0 ? (
          <RecipesLayout view={view} recipes={results} />
        ) : (
          <p className="rounded-card border border-dashed border-line px-4 py-12 text-center text-ink-soft">
            Aucune recette ne correspond à votre recherche.
          </p>
        )}
      </section>
    );
  } else {
    const [popularRows, recentRows] = await Promise.all([
      prisma.recipe.findMany({
        where: { popular: true },
        orderBy: { createdAt: "desc" },
        include: cardInclude,
      }) as unknown as Promise<CardRow[]>,
      prisma.recipe.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: cardInclude,
      }) as unknown as Promise<CardRow[]>,
    ]);
    const hasPopular = popularRows.length > 0;
    const featured = (hasPopular ? popularRows : recentRows).map(toCard);

    mainSection =
      total === 0 ? (
        <EmptyState />
      ) : (
        <section>
          <SectionHead
            icon={
              hasPopular ? <Icon name="flame" size={24} className="text-accent" /> : undefined
            }
            title={hasPopular ? "Populaires cette semaine" : "Dernières recettes"}
            action={
              <div className="flex items-center gap-3">
                <ViewSwitcher current={view} basePath="/" />
                <Link
                  href="/recettes"
                  className="inline-flex items-center gap-1.5 text-[14px] font-bold text-accent-ink transition hover:gap-2.5 hover:text-accent"
                >
                  Tout voir <Icon name="arrow" size={16} />
                </Link>
              </div>
            }
          />
          <RecipesLayout view={view} recipes={featured} />
        </section>
      );
  }

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] sm:px-8">
      {/* Hero */}
      <section className="pb-7 pt-14">
        <p className="eyebrow">
          Cuisine maison · {total} recette{total > 1 ? "s" : ""}
        </p>
        <h1 className="hero-title mb-[22px] mt-3 font-display text-[clamp(44px,6vw,76px)] font-extrabold leading-[0.98] tracking-[-0.025em]">
          Qu&apos;est-ce qu&apos;on
          <br />
          <em>cuisine</em>{" "}
          aujourd&apos;hui&nbsp;?
        </h1>
        <p className="mb-8 max-w-[540px] text-[18px] leading-relaxed text-ink-soft">
          Trouvez l&apos;inspiration parmi vos recettes, ou cherchez avec les ingrédients
          que vous avez déjà sous la main.
        </p>
        <SearchControls categories={categories.map((c) => c.name)} />
      </section>

      <div className="pb-4 pt-7">{mainSection}</div>
    </main>
  );
}
