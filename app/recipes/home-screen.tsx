"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "../components/icons";
import { RecipeCard, type RecipeCardData } from "../components/recipe-card";

type HomeRecipe = RecipeCardData & {
  ingredients: string[];
  popular: boolean;
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const TIME_OPTIONS = [
  { v: 0, l: "Tous" },
  { v: 30, l: "≤ 30 min" },
  { v: 60, l: "≤ 1 h" },
];
const DIFF_OPTIONS = [
  { v: 0, l: "Toutes" },
  { v: 1, l: "Facile" },
  { v: 2, l: "Moyen" },
  { v: 3, l: "Difficile" },
];

/** Magazine layout: first card is a full-width feature, rest in a 2-col grid. */
function MagazineGrid({
  recipes,
  matches,
}: {
  recipes: HomeRecipe[];
  matches?: Map<string, { count: number; total: number }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-[26px] md:grid-cols-2">
      {recipes.map((r, i) => (
        <RecipeCard key={r.id} r={r} big={i === 0} match={matches?.get(r.id)} />
      ))}
    </div>
  );
}

function SectionHead({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-[22px] flex items-end justify-between gap-5">
      <h2 className="inline-flex items-center gap-2.5 font-display text-[28px] font-medium tracking-[-0.015em]">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function HomeScreen({
  recipes,
  categories,
}: {
  recipes: HomeRecipe[];
  categories: string[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [maxTime, setMaxTime] = useState(0);
  const [diff, setDiff] = useState(0);
  const [byIngredient, setByIngredient] = useState(false);

  const active = q.trim() !== "" || cat !== null || maxTime !== 0 || diff !== 0;

  const { results, matches } = useMemo(() => {
    const matches = new Map<string, { count: number; total: number }>();
    let list = recipes;

    const query = norm(q);
    if (query && byIngredient) {
      const terms = query.split(",").map((t) => t.trim()).filter(Boolean);
      list = list
        .map((r) => {
          const ings = r.ingredients.map(norm);
          const count = terms.filter((t) => ings.some((i) => i.includes(t))).length;
          if (count > 0) matches.set(r.id, { count, total: terms.length });
          return { r, count };
        })
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((x) => x.r);
    } else if (query) {
      list = list.filter((r) => {
        const hay = [r.title, r.description ?? "", ...r.tags, ...r.categories, ...r.ingredients]
          .map(norm)
          .join(" ");
        return hay.includes(query);
      });
    }

    if (cat) list = list.filter((r) => r.categories.includes(cat));
    if (maxTime > 0)
      list = list.filter((r) => (r.prepTime ?? 0) + (r.cookTime ?? 0) <= maxTime);
    if (diff > 0) list = list.filter((r) => r.difficulty === diff);

    return { results: list, matches };
  }, [recipes, q, cat, maxTime, diff, byIngredient]);

  const popular = recipes.filter((r) => r.popular);

  const reset = () => {
    setQ("");
    setCat(null);
    setMaxTime(0);
    setDiff(0);
  };

  return (
    <main className="mx-auto w-full max-w-[1180px] animate-fade-up px-[18px] sm:px-8">
      {/* Hero */}
      <section className="pb-7 pt-14">
        <p className="eyebrow">
          Cuisine maison · {recipes.length} recette{recipes.length > 1 ? "s" : ""}
        </p>
        <h1 className="mb-[22px] mt-3 font-display text-[clamp(44px,6vw,76px)] font-medium leading-[0.98] tracking-[-0.025em]">
          Qu&apos;est-ce qu&apos;on
          <br />
          <em className="italic text-accent">cuisine</em> aujourd&apos;hui&nbsp;?
        </h1>
        <p className="mb-8 max-w-[540px] text-[18px] leading-relaxed text-ink-soft">
          Trouvez l&apos;inspiration parmi vos recettes, ou cherchez avec les ingrédients
          que vous avez déjà sous la main.
        </p>

        {/* Search block */}
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-[22px] pr-2 text-ink-faint shadow-pop transition focus-within:border-accent focus-within:shadow-[var(--shadow-pop),0_0_0_4px_var(--color-accent-soft)]">
            <Icon name={byIngredient ? "leaf" : "search"} size={20} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                byIngredient
                  ? "tomate, pois chiches, citron…"
                  : "Rechercher une recette, un ingrédient…"
              }
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[17px] text-ink outline-none placeholder:text-ink-faint"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Effacer la recherche"
                className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface-2 text-ink-soft transition hover:bg-line"
              >
                <Icon name="x" size={16} />
              </button>
            )}
            <button
              type="button"
              className="rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep active:translate-y-px"
            >
              Chercher
            </button>
          </div>

          <button
            type="button"
            onClick={() => setByIngredient((v) => !v)}
            className={`inline-flex items-center gap-2.5 self-start whitespace-nowrap rounded-full border px-[15px] py-2 text-[13.5px] font-semibold transition ${
              byIngredient
                ? "border-transparent bg-green-soft text-green-ink"
                : "border-line text-ink-soft hover:border-ink-faint"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full transition ${byIngredient ? "bg-green" : "bg-line"}`}
            />
            Chercher par ingrédients que j&apos;ai
          </button>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="mt-[26px] flex flex-wrap gap-2.5">
            {categories.map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(on ? null : c)}
                  className={`whitespace-nowrap rounded-full border px-[18px] py-2.5 text-[14px] font-semibold transition ${
                    on
                      ? "border-ink bg-ink text-bg"
                      : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter bar */}
      {active && (
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line-soft bg-surface px-5 py-3.5 shadow-soft">
          <span className="inline-flex items-center gap-2 text-[14px] font-bold">
            <Icon name="filter" size={16} /> Filtres
          </span>
          <FilterGroup
            label="Temps"
            options={TIME_OPTIONS}
            value={maxTime}
            onChange={setMaxTime}
          />
          <FilterGroup
            label="Difficulté"
            options={DIFF_OPTIONS}
            value={diff}
            onChange={setDiff}
          />
        </div>
      )}

      {/* Results / suggestions */}
      <div className="pb-4 pt-7">
        {recipes.length === 0 ? (
          <EmptyState />
        ) : active ? (
          <section>
            <SectionHead
              title={`${results.length} recette${results.length > 1 ? "s" : ""}`}
              action={
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-[14px] font-bold text-accent-ink transition hover:text-accent"
                >
                  Réinitialiser
                </button>
              }
            />
            {results.length > 0 ? (
              <MagazineGrid recipes={results} matches={matches} />
            ) : (
              <p className="rounded-card border border-dashed border-line px-4 py-12 text-center text-ink-soft">
                Aucune recette ne correspond à votre recherche.
              </p>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-12">
            {popular.length > 0 && (
              <section>
                <SectionHead
                  icon={<Icon name="flame" size={24} className="text-accent" />}
                  title="Populaires cette semaine"
                />
                <MagazineGrid recipes={popular} />
              </section>
            )}
            <section>
              <SectionHead title="Toutes les recettes" />
              <MagazineGrid recipes={recipes} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: number; l: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="mr-0.5 text-[12px] font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
              on
                ? "border-transparent bg-accent-soft text-accent-ink"
                : "border-line text-ink-soft hover:border-ink-faint"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-16 text-center">
      <p className="font-display text-2xl font-medium">Aucune recette pour l&apos;instant</p>
      <p className="mt-2 text-ink-soft">Lancez-vous et créez la première !</p>
      <Link
        href="/recipes/new"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-deep"
      >
        <Icon name="plus" size={17} /> Créer une recette
      </Link>
    </div>
  );
}
