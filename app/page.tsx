import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "./components/icons";
import {
  cardInclude,
  EmptyState,
  MagazineGrid,
  SectionHead,
  toCard,
  type CardRow,
} from "./recettes/_shared";
import { SearchControls } from "./recettes/search-controls";

export const metadata = { title: "Mealoday — Recettes maison" };

// DB-dependent data → rendered on demand (no static prerender at build time).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, total, popularRows, recentRows] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.recipe.count(),
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

  // Featured section: popular recipes, or the 4 latest as a fallback.
  const hasPopular = popularRows.length > 0;
  const featured = (hasPopular ? popularRows : recentRows).map(toCard);

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] sm:px-8">
      {/* Hero */}
      <section className="pb-7 pt-14">
        <p className="eyebrow">
          Cuisine maison · {total} recette{total > 1 ? "s" : ""}
        </p>
        <h1 className="mb-[22px] mt-3 font-display text-[clamp(44px,6vw,76px)] font-medium leading-[0.98] tracking-[-0.025em]">
          Qu&apos;est-ce qu&apos;on
          <br />
          <em className="italic text-accent">cuisine</em>{" "}
          aujourd&apos;hui&nbsp;?
        </h1>
        <p className="mb-8 max-w-[540px] text-[18px] leading-relaxed text-ink-soft">
          Trouvez l&apos;inspiration parmi vos recettes, ou cherchez avec les ingrédients
          que vous avez déjà sous la main.
        </p>
        <SearchControls categories={categories.map((c) => c.name)} />
      </section>

      {/* One featured section only — the full catalogue lives on /recettes. */}
      <div className="pb-4 pt-7">
        {total === 0 ? (
          <EmptyState />
        ) : (
          <section>
            <SectionHead
              icon={
                hasPopular ? <Icon name="flame" size={24} className="text-accent" /> : undefined
              }
              title={hasPopular ? "Populaires cette semaine" : "Dernières recettes"}
              action={
                <Link
                  href="/recettes"
                  className="inline-flex items-center gap-1.5 text-[14px] font-bold text-accent-ink transition hover:gap-2.5 hover:text-accent"
                >
                  Tout voir <Icon name="arrow" size={16} />
                </Link>
              }
            />
            <MagazineGrid recipes={featured} />
          </section>
        )}
      </div>
    </main>
  );
}
