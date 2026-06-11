"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../components/icons";
import { SeasonStatePill } from "./product-ui";
import { seasonState, type Produce, type ProduceCategory } from "@/lib/seasons-data";

const CATS: { key: "tout" | ProduceCategory; label: string }[] = [
  { key: "tout", label: "Tout" },
  { key: "fruits", label: "Fruits" },
  { key: "légumes", label: "Légumes" },
  { key: "herbes", label: "Herbes" },
];

const SORTS = [
  { v: "saison", l: "De saison d'abord" },
  { v: "az", l: "A → Z" },
  { v: "carbone", l: "Empreinte carbone ↑" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Seasonality search (typeahead → product page) + category/sort controls. */
export function SeasonControls({
  products,
  counts,
  currentCat,
  currentSort,
  month,
}: {
  products: Produce[];
  counts: Record<string, number>;
  currentCat: string | null;
  currentSort: string;
  month: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState("");

  const ql = norm(q);
  const results = ql
    ? products.filter((p) => norm(p.name).includes(ql)).slice(0, 7)
    : [];

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `/saisons?${qs}` : "/saisons");
  }

  return (
    <>
      {/* Seasonality search (typeahead → opens the product page) */}
      <div className="relative max-w-[640px]">
        <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-[22px] pr-2 text-ink-faint shadow-card-lg transition focus-within:border-accent focus-within:shadow-[var(--shadow-card-lg),0_0_0_4px_var(--color-accent-soft)]">
          <Icon name="search" size={20} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Chercher la saison d'un produit"
            placeholder="Chercher la saison d'un produit…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[16.5px] text-ink outline-none placeholder:text-ink-faint"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Effacer"
              className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full overflow-hidden rounded-input border border-line bg-surface py-1 shadow-card-lg">
            {results.map((p) => {
              const status = seasonState(p.months, month);
              const bg = `linear-gradient(150deg, oklch(0.74 0.13 ${p.hue}) 0%, oklch(0.6 0.15 ${p.hue - 12}) 100%)`;
              return (
                <Link
                  key={p.slug}
                  href={`/saisons/${p.slug}?m=${month}`}
                  onClick={() => setQ("")}
                  className="flex items-center gap-3 px-2.5 py-2 transition hover:bg-surface-muted"
                >
                  <span
                    className="h-[34px] w-[34px] shrink-0 rounded-[8px]"
                    style={{ background: bg }}
                  />
                  <span className="flex-1 text-[15px] font-semibold text-ink">{p.name}</span>
                  <SeasonStatePill status={status} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Category filters + sort */}
      <div className="mt-[26px] flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => {
            const on = (c.key === "tout" && !currentCat) || currentCat === c.key;
            const n = counts[c.key] ?? 0;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setParam("cat", c.key === "tout" ? null : c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-[15px] py-2 text-[14px] font-semibold transition ${
                  on
                    ? "border-ink bg-ink text-bg"
                    : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
                }`}
              >
                {c.label}
                <span className="font-mono text-[11.5px] opacity-70">({n})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12.5px] font-bold uppercase tracking-wider text-ink-faint">
            Trier
          </span>
          <select
            value={currentSort}
            onChange={(e) => setParam("sort", e.target.value === "saison" ? null : e.target.value)}
            aria-label="Trier les produits"
            className="select-chevron rounded-full border border-line bg-surface py-2 pl-3.5 text-[13.5px] font-semibold text-ink outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
