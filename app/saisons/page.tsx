import { getProduce, resolveMonths, seasonalRecipesData } from "@/lib/seasons";
import { produceImage } from "@/lib/pexels";
import type { SeasonView } from "./produce-list";
import { SeasonsBrowser } from "./seasons-browser";

export const metadata = { title: "Calendrier des saisons" };

// DB + API dependent → rendered on demand.
export const dynamic = "force-dynamic";

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const VIEWS: SeasonView[] = ["grille", "dense", "etageres"];

export default async function SaisonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const months = resolveMonths(sp.m === undefined ? undefined : str(sp.m), true);
  const cat = str(sp.cat) || null;
  const sort = str(sp.sort) || "az";
  const viewRaw = str(sp.view) as SeasonView;
  const view: SeasonView = VIEWS.includes(viewRaw) ? viewRaw : "etageres";
  const currentMonth = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const produce = await getProduce();

  // Images + recipe matching are fetched for the FULL catalogue once, so the
  // client can filter by the (interactive) month selection without round-trips.
  const [imageList, recipes] = await Promise.all([
    Promise.all(produce.map((p) => produceImage(p))),
    seasonalRecipesData(produce),
  ]);
  const images = Object.fromEntries(produce.map((p, i) => [p.slug, imageList[i]]));

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] sm:px-8">
      <SeasonsBrowser
        products={produce}
        images={images}
        recipes={recipes}
        currentMonth={currentMonth}
        year={year}
        initial={{ months, cat, sort, view }}
      />
    </main>
  );
}
