"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "../components/icons";
import { FilterDisclosure } from "../components/filter-disclosure";

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

const DEBOUNCE_MS = 300;

/**
 * Search/filter controls. They only read/write the URL (`/recettes?…`); the
 * filtering + results rendering happen server-side (page.tsx). The keyword
 * search runs as you type (debounced, `router.replace`); Enter triggers it
 * immediately. From the home, typing navigates to the catalogue, so the input
 * re-focuses on mount (cursor at end) to keep typing seamless.
 */
export function SearchControls({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = sp.get("q") ?? "";
  const byIngredient = sp.get("ing") === "1";
  const cat = sp.get("cat");
  const maxTime = Number(sp.get("t") ?? "0");
  const diff = Number(sp.get("d") ?? "0");

  // Summary + count of active filters (category / time / difficulty), shown on
  // the "Filtres" pill. Search + ingredient toggle aren't counted here.
  const activeParts = [
    cat || null,
    TIME_OPTIONS.find((o) => o.v === maxTime && o.v !== 0)?.l ?? null,
    DIFF_OPTIONS.find((o) => o.v === diff && o.v !== 0)?.l ?? null,
  ].filter(Boolean) as string[];
  const activeCount = activeParts.length;
  const summary = activeParts.length ? activeParts.join(" · ") : "Tous";

  const [text, setText] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Builds the next URL from the current params with `changes` applied. */
  const navigate = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        if (replace) router.replace(url);
        else router.push(url);
      });
    },
    [sp, router],
  );

  // Search as you type: debounce, then replace the URL (no history spam).
  useEffect(() => {
    if (text.trim() === q) return;
    const id = setTimeout(() => navigate({ q: text.trim() || null }, true), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, q, navigate]);

  // Keep the field in sync when the URL changes externally (reset link, back),
  // but never overwrite what the user is actively typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(q);
  }, [q]);

  // Arriving with a query (e.g. from the home) → focus, cursor at end.
  useEffect(() => {
    if (q && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Search block */}
      <div className="flex flex-col gap-3.5" style={{ maxWidth: 720 }}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: text.trim() || null }, true);
          }}
          className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-[22px] pr-2 text-ink-faint shadow-card-lg transition focus-within:border-accent focus-within:shadow-[var(--shadow-card-lg),0_0_0_4px_var(--color-accent-soft)]"
        >
          <Icon name={byIngredient ? "leaf" : "search"} size={20} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Rechercher une recette"
            placeholder={
              byIngredient
                ? "tomate, pois chiches, citron…"
                : "Rechercher une recette, un ingrédient…"
            }
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[17px] text-ink outline-none placeholder:text-ink-faint"
          />
          {isPending && (
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent"
            />
          )}
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                navigate({ q: null }, true);
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => navigate({ ing: byIngredient ? null : "1" })}
          aria-pressed={byIngredient}
          className={`inline-flex items-center gap-2.5 self-start whitespace-nowrap rounded-full border px-[15px] py-2 text-[13.5px] font-semibold transition ${
            byIngredient
              ? "border-transparent bg-veg-soft text-veg"
              : "border-line text-ink-soft hover:border-ink-faint"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full transition ${byIngredient ? "bg-veg" : "bg-line"}`}
          />
          Chercher par ingrédients que j&apos;ai
        </button>
      </div>

      {/* Grouped filters: category + time + difficulty in a collapsible panel
          (same pill/panel as /saisons). Search + ingredient toggle stay above. */}
      <div className="mt-5">
        <FilterDisclosure summary={summary} count={activeCount}>
          <div className="flex flex-col gap-5">
            {categories.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Catégorie
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {categories.map((c) => {
                    const on = cat === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => navigate({ cat: on ? null : c })}
                        aria-pressed={on}
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
              </div>
            )}

            <FilterGroup
              label="Temps"
              options={TIME_OPTIONS}
              value={maxTime}
              onChange={(v) => navigate({ t: v ? String(v) : null })}
            />
            <FilterGroup
              label="Difficulté"
              options={DIFF_OPTIONS}
              value={diff}
              onChange={(v) => navigate({ d: v ? String(v) : null })}
            />

            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => navigate({ cat: null, t: null, d: null })}
                className="self-start text-[13.5px] font-semibold text-accent-ink underline underline-offset-2 hover:text-accent"
              >
                Tout effacer
              </button>
            )}
          </div>
        </FilterDisclosure>
      </div>
    </>
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
    <div className="flex flex-wrap items-center gap-2">
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
            aria-pressed={on}
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
