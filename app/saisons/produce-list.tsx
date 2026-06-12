"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "../components/icons";
import { RecipePhoto } from "../components/recipe-ui";
import { ProductCard } from "./product-card";
import { CarbonBadge, CategoryBadge, SeasonBar, SeasonStatePill } from "./product-ui";
import {
  seasonState,
  type Produce,
  type ProduceCategory,
} from "@/lib/seasons-data";

export type SeasonView = "grille" | "dense" | "etageres";

const CAT_ORDER: ProduceCategory[] = ["fruits", "légumes", "légumineuses", "herbes"];
const CAT_PLURAL: Record<ProduceCategory, string> = {
  fruits: "Fruits",
  légumes: "Légumes",
  légumineuses: "Légumineuses",
  herbes: "Herbes",
};

type Common = {
  items: Produce[];
  images: Record<string, string | null>;
  /** Reference month for season-state badges + the drawer link (`?m=`). */
  refMonth: number;
};

/** Dense row: thumbnail + name + state pill + carbon + 12-month bar. Links to the drawer. */
function ProduceRow({
  p,
  imageUrl,
  refMonth,
}: {
  p: Produce;
  imageUrl: string | null;
  refMonth: number;
}) {
  const status = seasonState(p.months, refMonth);
  return (
    <Link
      href={`/saisons/${p.slug}?m=${refMonth}`}
      className="group flex items-center gap-3.5 rounded-card border border-line-soft bg-surface px-3 py-3 shadow-card transition hover:border-line hover:shadow-card-lg"
    >
      <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-input">
        <RecipePhoto imageUrl={imageUrl} title={p.name} label={p.category} hue={p.hue} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <CategoryBadge category={p.category} className="border border-line-soft" />
          <SeasonStatePill status={status} />
        </div>
        <h3 className="truncate font-display text-[17px] font-semibold leading-tight">
          {p.name}
        </h3>
      </div>
      <div className="hidden w-[180px] shrink-0 sm:block">
        <SeasonBar months={p.months} current={refMonth} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <CarbonBadge ecv={p.ecv} />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-ink-soft transition group-hover:bg-accent-soft group-hover:text-accent-ink">
          <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}

/** Shelf: one category row, horizontal slider (arrows + native swipe/scroll-snap). */
function Shelf({
  category,
  list,
  images,
  refMonth,
}: {
  category: ProduceCategory;
  list: Produce[];
  images: Record<string, string | null>;
  refMonth: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-[19px] font-medium">
          {CAT_PLURAL[category]}
          <span className="font-mono text-[12.5px] text-ink-faint">{list.length}</span>
        </h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Précédent"
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-ink-faint hover:text-ink"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Suivant"
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-ink-faint hover:text-ink"
          >
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth pb-1"
      >
        {list.map((p) => (
          <div key={p.slug} className="w-[208px] shrink-0 snap-start">
            <ProductCard product={p} month={refMonth} imageUrl={images[p.slug] ?? null} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Produce list with three layouts: grid (cards), dense rows, or category shelves. */
export function ProduceList({
  items,
  images,
  refMonth,
  view,
}: Common & { view: SeasonView }) {
  if (items.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line bg-surface px-5 py-10 text-center text-[15px] text-ink-soft">
        Aucun produit ne correspond à la sélection. Ajustez les mois, la catégorie ou la
        recherche.
      </p>
    );
  }

  if (view === "dense") {
    return (
      <div className="flex flex-col gap-2.5">
        {items.map((p) => (
          <ProduceRow key={p.slug} p={p} imageUrl={images[p.slug] ?? null} refMonth={refMonth} />
        ))}
      </div>
    );
  }

  if (view === "etageres") {
    const groups = CAT_ORDER.map((c) => ({
      c,
      list: items.filter((p) => p.category === c),
    })).filter((g) => g.list.length);
    return (
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <Shelf key={g.c} category={g.c} list={g.list} images={images} refMonth={refMonth} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-[18px]"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(208px, 1fr))" }}
    >
      {items.map((p) => (
        <ProductCard key={p.slug} product={p} month={refMonth} imageUrl={images[p.slug] ?? null} />
      ))}
    </div>
  );
}
