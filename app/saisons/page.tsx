import { Icon } from "../components/icons";
import { RecipeCard } from "../components/recipe-card";
import { getProduce, resolveMonth, seasonalRecipes } from "@/lib/seasons";
import { produceImage } from "@/lib/pexels";
import { MONTHS } from "@/lib/seasons-data";
import { MonthBand } from "./month-band";
import { ProductCard } from "./product-card";
import { SeasonControls } from "./season-controls";

export const metadata = { title: "Calendrier des saisons" };

// DB + API dependent → rendered on demand.
export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SaisonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const month = resolveMonth(str(sp.m));
  const cat = str(sp.cat) || null;
  const sort = str(sp.sort) || "saison";
  const currentMonth = new Date().getMonth() + 1;

  const produce = await getProduce();

  const counts: Record<string, number> = {
    tout: produce.length,
    fruits: 0,
    légumes: 0,
    herbes: 0,
  };
  for (const p of produce) counts[p.category] += 1;

  let list = cat ? produce.filter((p) => p.category === cat) : produce;
  if (sort === "az") {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } else if (sort === "carbone") {
    list = [...list].sort((a, b) => (a.ecv ?? 99) - (b.ecv ?? 99));
  } else {
    // "saison": in-season this month first, then alphabetical.
    const inSeason = (m: number[]) => Number(m.includes(month));
    list = [...list].sort(
      (a, b) => inSeason(b.months) - inSeason(a.months) || a.name.localeCompare(b.name, "fr"),
    );
  }

  const images = await Promise.all(list.map((p) => produceImage(p)));
  const recipes = await seasonalRecipes(month, produce);

  const monthName = MONTHS[month - 1];
  const year = new Date().getFullYear();

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] sm:px-8">
      {/* Hero */}
      <section className="pb-6 pt-12">
        <p className="eyebrow">
          De saison · {monthName} {year}
        </p>
        <h1 className="mb-[18px] mt-3 font-display text-[clamp(38px,5.2vw,64px)] font-medium leading-[1.0] tracking-[-0.025em]">
          Que cuisiner en <em className="italic text-accent">{monthName.toLowerCase()}</em>&nbsp;?
        </h1>
        <p className="mb-7 max-w-[560px] text-[18px] leading-relaxed text-ink-soft">
          Fruits, légumes et herbes de saison, leur empreinte carbone, et les recettes à
          cuisiner maintenant.
        </p>
        <SeasonControls
          products={produce}
          counts={counts}
          currentCat={cat}
          currentSort={sort}
          month={month}
        />
      </section>

      {/* Month band */}
      <section className="pb-8">
        <MonthBand current={currentMonth} selected={month} />
      </section>

      {/* Produce grid */}
      <section className="pb-2">
        <h2 className="mb-5 font-display text-[26px] font-medium tracking-[-0.015em]">
          {list.length} produit{list.length > 1 ? "s" : ""} · {monthName}
        </h2>
        <div
          className="grid gap-[18px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(208px, 1fr))" }}
        >
          {list.map((p, i) => (
            <ProductCard key={p.slug} product={p} month={month} imageUrl={images[i]} />
          ))}
        </div>
      </section>

      {/* Seasonal recipes */}
      {recipes.length > 0 && (
        <section className="pb-20 pt-14">
          <h2 className="mb-5 inline-flex items-center gap-2.5 font-display text-[26px] font-medium tracking-[-0.015em]">
            <Icon name="calendar" size={22} className="text-accent" /> Recettes de saison
          </h2>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {recipes.map(({ recipe, count }) => (
              <RecipeCard key={recipe.id} r={recipe} seasonCount={count} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
