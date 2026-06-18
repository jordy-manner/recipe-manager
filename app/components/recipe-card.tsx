"use client";

import Link from "next/link";
import { Icon } from "./icons";
import { Difficulty, FavoriteButton, RecipePhoto, Tag, formatTime } from "./recipe-ui";

export type RecipeCardData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  prepTime: number | null;
  cookTime: number | null;
  restTime: number | null;
  servings: number | null;
  difficulty: number | null;
  rating: number | null;
  imageUrl: string | null;
  tags: string[];
  categories: string[];
};

export type RecipeView = "grille" | "liste" | "magazine";

const DIFF_LABELS: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

function MetaRow({ r }: { r: RecipeCardData }) {
  const total = (r.prepTime ?? 0) + (r.cookTime ?? 0) + (r.restTime ?? 0);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium text-ink-faint">
      {total > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={14} /> {formatTime(total)}
        </span>
      )}
      {r.servings != null && (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="users" size={14} /> {r.servings} pers.
        </span>
      )}
      {r.difficulty != null && (
        <span className="inline-flex items-center gap-1.5">
          <Difficulty level={r.difficulty} /> {DIFF_LABELS[r.difficulty]}
        </span>
      )}
      {r.rating != null && (
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <Icon name="star" size={14} className="text-accent" fill="currentColor" />
          {r.rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function RecipeCard({
  r,
  big = false,
  match,
  seasonCount,
}: {
  r: RecipeCardData;
  big?: boolean;
  match?: { count: number; total: number };
  seasonCount?: number;
}) {
  const category = r.categories[0];
  const otherTags = r.tags.slice(0, big ? 3 : 2);

  return (
    <Link
      href={`/recettes/${r.slug}`}
      className={`group relative flex overflow-hidden rounded-card border border-line-soft bg-surface shadow-card transition duration-200 hover:-translate-y-1 hover:border-line hover:shadow-card-lg ${
        big ? "flex-col md:col-span-2 md:flex-row" : "flex-col"
      }`}
    >
      {/* Photo */}
      <div
        className={`relative ${big ? "aspect-[16/10] md:aspect-auto md:min-h-[360px] md:flex-[1.1]" : "aspect-[16/10]"}`}
      >
        <RecipePhoto imageUrl={r.imageUrl} title={r.title} label={category ?? "recette"} />
        {category && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-surface/90 px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-ink backdrop-blur-[2px]">
            {category}
          </span>
        )}
        <FavoriteButton className="absolute right-3.5 top-3.5 h-9 w-9 shadow-card" />
        {match && (
          <span className="absolute bottom-3.5 left-3.5 rounded-full bg-veg px-3 py-1 font-mono text-[11px] font-medium text-white">
            {match.count}/{match.total} ingrédients
          </span>
        )}
      </div>

      {/* Body */}
      <div
        className={`flex flex-1 flex-col gap-3 ${big ? "justify-center p-7 md:p-10" : "p-5 sm:p-6"}`}
      >
        {(otherTags.length > 0 || category) && (
          <div className="flex flex-wrap gap-2">
            {otherTags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
        <h3
          className={`font-display font-semibold leading-tight text-ink ${big ? "text-[30px] sm:text-[38px]" : "text-[22px]"}`}
        >
          {r.title}
        </h3>
        {r.description && (
          <p className={`text-ink-soft ${big ? "text-[15px] leading-relaxed" : "line-clamp-2 text-sm leading-relaxed"}`}>
            {r.description}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <MetaRow r={r} />
          {seasonCount != null && seasonCount > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-veg">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-veg-soft">
                <Icon name="leaf" size={12} strokeWidth={2} />
              </span>
              {seasonCount} de saison
            </span>
          )}
        </div>
        {big && (
          <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-bold text-accent-ink transition group-hover:gap-3">
            Voir la recette <Icon name="arrow" size={16} />
          </span>
        )}
      </div>
    </Link>
  );
}

/** Horizontal row card for list view. */
export function RecipeCardRow({
  r,
  match,
}: {
  r: RecipeCardData;
  match?: { count: number; total: number };
}) {
  const category = r.categories[0];
  return (
    <Link
      href={`/recettes/${r.slug}`}
      className="group flex gap-0 overflow-hidden rounded-card border border-line-soft bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg"
    >
      <div className="relative w-[190px] shrink-0 self-stretch">
        <RecipePhoto imageUrl={r.imageUrl} title={r.title} label={category ?? "recette"} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {category && (
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
              {category}
            </span>
          )}
          {r.tags.slice(0, 2).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          {match && (
            <span className="rounded-full bg-veg-soft px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-veg">
              {match.count}/{match.total} ingrédients
            </span>
          )}
        </div>
        <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {r.title}
        </h3>
        {r.description && (
          <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
            {r.description}
          </p>
        )}
        <MetaRow r={r} />
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between px-4 py-4">
        {r.rating != null && (
          <span className="inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-ink-soft">
            <Icon name="star" size={13} className="text-accent" fill="currentColor" />
            {r.rating.toFixed(1)}
          </span>
        )}
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink-soft transition group-hover:bg-accent group-hover:text-white">
          <Icon name="arrow" size={18} />
        </span>
      </div>
    </Link>
  );
}
