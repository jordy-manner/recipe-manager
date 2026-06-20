"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/icons";
import { RecipeCard, type RecipeCardData } from "../components/recipe-card";
import { Dropdown } from "./dropdown";
import { FilterDisclosure } from "../components/filter-disclosure";
import { MonthSelect } from "./month-select";
import { ProduceList, type SeasonView } from "./produce-list";
import { MONTHS, type Produce, type ProduceCategory } from "@/lib/seasons-data";

type RecipeEntry = { recipe: RecipeCardData; activeMonths: number[]; slugs: string[] };

const CATS: { key: "tout" | ProduceCategory; label: string }[] = [
  { key: "tout", label: "Tout" },
  { key: "fruits", label: "Fruits" },
  { key: "légumes", label: "Légumes" },
  { key: "légumineuses", label: "Légumineuses" },
  { key: "herbes", label: "Herbes" },
];

const VIEWS: { key: SeasonView; icon: "grid" | "rows" | "shelf"; label: string }[] = [
  { key: "grille", icon: "grid", label: "Grille" },
  { key: "dense", icon: "rows", label: "Liste dense" },
  { key: "etageres", icon: "shelf", label: "Étagères" },
];

// When the selection matches a season exactly, the copy uses its own phrasing
// ("au printemps", "en été"…) instead of the generic "sur N mois".
const SEASONS_COPY: { months: number[]; em: string; label: string }[] = [
  { months: [3, 4, 5, 6], em: "au printemps", label: "Printemps" },
  { months: [6, 7, 8, 9], em: "en été", label: "Été" },
  { months: [9, 10, 11, 12], em: "en automne", label: "Automne" },
  { months: [12, 1, 2, 3], em: "en hiver", label: "Hiver" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const isCat = (v: string): v is ProduceCategory =>
  v === "fruits" || v === "légumes" || v === "légumineuses" || v === "herbes";

export function SeasonsBrowser({
  products,
  images,
  recipes,
  currentMonth,
  year,
  initial,
}: {
  products: Produce[];
  images: Record<string, string | null>;
  recipes: RecipeEntry[];
  currentMonth: number;
  year: number;
  initial: { months: number[]; cat: string | null; sort: string; view: SeasonView };
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [months, setMonths] = useState<number[]>(initial.months);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(
    initial.cat && isCat(initial.cat) ? initial.cat : "tout",
  );
  const [sort, setSort] = useState(initial.sort === "carbone" ? "carbone" : "az");
  const [view, setView] = useState<SeasonView>(initial.view);

  // Reflect the (interactive) state into the URL for shareable/back-able links —
  // but skip the first run so a clean initial URL isn't rewritten on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // Don't clobber the URL while a drawer (intercepted /saisons/[slug]) is open.
    if (pathname !== "/saisons") return;
    const params = new URLSearchParams();
    if (months.length === 0) params.set("m", "none");
    else if (!(months.length === 1 && months[0] === currentMonth)) params.set("m", months.join(","));
    if (category !== "tout") params.set("cat", category);
    if (sort !== "az") params.set("sort", sort);
    if (view !== "etageres") params.set("view", view);
    const qs = params.toString();
    router.replace(qs ? `/saisons?${qs}` : "/saisons", { scroll: false });
  }, [months, category, sort, view, currentMonth, pathname, router]);

  const selSet = useMemo(() => new Set(months), [months]);
  const matchSel = (p: Produce) => months.length > 0 && p.months.some((m) => selSet.has(m));

  // Products matching the month selection + search (all categories → drives counts).
  const base = useMemo(() => {
    const q = norm(query);
    return products.filter(
      (p) => matchSel(p) && (!q || norm(p.name).includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, months, query]);

  const counts: Record<string, number> = {
    tout: base.length,
    fruits: 0,
    légumes: 0,
    légumineuses: 0,
    herbes: 0,
  };
  for (const p of base) counts[p.category] += 1;

  const visible = useMemo(() => {
    const list = category === "tout" ? [...base] : base.filter((p) => p.category === category);
    list.sort(
      sort === "carbone"
        ? (a, b) => (a.ecv ?? 99) - (b.ecv ?? 99)
        : (a, b) => a.name.localeCompare(b.name, "fr"),
    );
    return list;
  }, [base, category, sort]);

  const refMonth = months.length === 1 ? months[0] : currentMonth;

  const seasonRecipes = useMemo(() => {
    const inSelection = new Set(products.filter(matchSel).map((p) => p.slug));
    return recipes
      .filter((r) => r.activeMonths.some((m) => selSet.has(m)))
      .map((r) => ({ recipe: r.recipe, count: r.slugs.filter((s) => inSelection.has(s)).length }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, products, months]);

  // Dynamic titles (mirror the handoff copy); a matched season gets its own phrasing.
  const n = months.length;
  const monthLower = n === 1 ? MONTHS[months[0] - 1].toLowerCase() : "";
  const season =
    n === 4 ? SEASONS_COPY.find((s) => s.months.every((m) => selSet.has(m))) : undefined;
  const titleEm =
    season ? season.em
    : n >= 12 ? "cette année"
    : n === 1 ? `en ${monthLower}`
    : n === 0 ? "…" : `sur ${n} mois`;
  const eyebrow =
    season ? season.label
    : n >= 12 ? "toute l'année"
    : n === 1 ? `${MONTHS[months[0] - 1]} ${year}`
    : n === 0 ? "aucun mois" : `${n} mois`;
  const listLabel =
    season ? `de saison ${season.em}`
    : n >= 12 ? "de saison cette année"
    : n === 1 ? `de saison en ${monthLower}`
    : n === 0 ? "" : "sur votre sélection";
  const selLabel =
    season ? season.label
    : n >= 12 ? "toute l'année"
    : n === 1 ? MONTHS[months[0] - 1]
    : n === 0 ? "aucun mois" : `${n} mois`;
  const catLabel = category === "tout" ? null : CATS.find((c) => c.key === category)?.label;
  const activeCount = (category !== "tout" ? 1 : 0) + (sort !== "az" ? 1 : 0);

  return (
    <>
      {/* Hero */}
      <section className="pb-6 pt-12">
        <p className="eyebrow">De saison · {eyebrow}</p>
        <h1 className="hero-title mb-[18px] mt-3 font-display text-[clamp(38px,5.2vw,64px)] font-extrabold leading-[1.0] tracking-[-0.025em]">
          Que cuisiner <em>{titleEm}</em>&nbsp;?
        </h1>
        <p className="mb-7 max-w-[560px] text-[18px] leading-relaxed text-ink-soft">
          Sélectionnez un ou plusieurs mois, filtrez par catégorie et trouvez les produits de
          saison — et les recettes qui vont avec.
        </p>

        {/* Search (filters the grid live by name) */}
        <div className="max-w-[640px]">
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-[22px] pr-2 text-ink-faint shadow-card-lg transition focus-within:border-accent focus-within:shadow-[var(--shadow-card-lg),0_0_0_4px_var(--color-accent-soft)]">
            <Icon name="search" size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filtrer les produits par nom"
              placeholder="Filtrer les produits par nom…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[16.5px] text-ink outline-none placeholder:text-ink-faint"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Removable filters panel (shared FilterDisclosure pill + panel) */}
      <section className="pb-8">
        <FilterDisclosure
          sticky
          count={activeCount}
          summary={
            <>
              {selLabel}
              {catLabel ? ` · ${catLabel}` : ""}
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <MonthSelect months={months} setMonths={setMonths} currentMonth={currentMonth} />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft pt-4">
              {/* Categories — chips on desktop, custom dropdown on mobile */}
              <div className="hidden flex-wrap gap-2 sm:flex">
                {CATS.map((c) => {
                  const on = category === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCategory(c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-[15px] py-2 text-[14px] font-semibold transition ${
                        on
                          ? "border-transparent bg-accent-soft text-accent-ink"
                          : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
                      }`}
                    >
                      {c.label}
                      <span className="font-mono text-[11.5px] opacity-70">{counts[c.key]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="w-full sm:hidden">
                <Dropdown
                  ariaLabel="Filtrer par catégorie"
                  tone="ink"
                  value={category}
                  onChange={setCategory}
                  options={CATS.map((c) => ({ value: c.key, label: c.label, count: counts[c.key] }))}
                />
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="font-mono text-[12.5px] font-bold uppercase tracking-wider text-ink-faint">
                  Trier
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Trier les produits"
                  className="select-chevron rounded-full border border-line bg-surface py-2 pl-3.5 text-[13.5px] font-semibold text-ink outline-none"
                >
                  <option value="az">A → Z</option>
                  <option value="carbone">Empreinte carbone ↑</option>
                </select>
              </div>
            </div>
          </div>
        </FilterDisclosure>
      </section>

      {/* Produce list */}
      <section className="pb-2">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-[26px] font-medium tracking-[-0.015em]">
            {visible.length} produit{visible.length > 1 ? "s" : ""} {listLabel}
          </h2>
          <div className="flex shrink-0 gap-1" role="group" aria-label="Affichage de la liste">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={view === v.key}
                aria-label={v.label}
                title={v.label}
                className={`grid h-9 w-9 place-items-center rounded-input transition ${
                  view === v.key
                    ? "bg-ink text-bg"
                    : "text-ink-faint hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <Icon name={v.icon} size={18} />
              </button>
            ))}
          </div>
        </div>
        <ProduceList items={visible} images={images} refMonth={refMonth} view={view} />
      </section>

      {/* Seasonal recipes */}
      {seasonRecipes.length > 0 && (
        <section className="pb-20 pt-14">
          <h2 className="mb-5 inline-flex items-center gap-2.5 font-display text-[26px] font-medium tracking-[-0.015em]">
            <Icon name="calendar" size={22} className="text-accent" /> Recettes de saison
          </h2>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {seasonRecipes.map(({ recipe, count }) => (
              <RecipeCard key={recipe.id} r={recipe} seasonCount={count} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
