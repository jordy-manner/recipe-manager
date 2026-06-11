import Link from "next/link";
import { Icon } from "../components/icons";
import { RecipePhoto } from "../components/recipe-ui";
import type { RecipeCardData } from "../components/recipe-card";
import { CategoryBadge, SeasonBar, SeasonStatePill } from "./product-ui";
import {
  CARBON_LABELS,
  carbonTier,
  MONTHS,
  type Produce,
  type SeasonStatus,
} from "@/lib/seasons-data";

// Shared product-detail content, rendered both as a full page (/saisons/[slug])
// and inside the intercepted drawer. Server-renderable (no hooks).

function fmt(min: number): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
      {children}
    </p>
  );
}

export function ProductDetail({
  product,
  status,
  imageUrl,
  month,
  recipes,
}: {
  product: Produce;
  status: SeasonStatus;
  imageUrl: string | null;
  month: number;
  recipes: RecipeCardData[];
}) {
  const monthsLabel =
    product.months.length >= 12
      ? "Toute l'année"
      : product.months.map((m) => MONTHS[m - 1]).join(" · ");
  const tier = product.ecv != null ? carbonTier(product.ecv) : null;
  const tierColor =
    tier === "low"
      ? "text-veg"
      : tier === "med"
        ? "text-amber"
        : tier === "high"
          ? "text-accent"
          : "text-ink";
  const tierBadge =
    tier === "low"
      ? "bg-veg-soft text-veg"
      : tier === "med"
        ? "bg-amber-soft text-amber-ink"
        : "bg-accent-soft text-accent-ink";

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[16/11]">
        <RecipePhoto
          imageUrl={imageUrl}
          title={product.name}
          label={product.category}
          hue={product.hue}
        />
        <CategoryBadge category={product.category} className="absolute left-3 top-3 z-[2]" />
      </div>

      <div className="flex flex-col gap-[22px] px-6 pb-10 pt-5">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[30px] font-medium leading-[1.05] tracking-[-0.02em]">
            {product.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SeasonStatePill status={status} big />
          </div>
        </div>

        {/* Year availability */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Disponibilité sur l&apos;année</Eyebrow>
          <SeasonBar months={product.months} current={month} />
          <p className="text-[14px] leading-relaxed text-ink-soft">{monthsLabel}</p>
        </div>

        {/* Carbon footprint */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Empreinte carbone</Eyebrow>
          {product.ecv != null && tier ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`font-display text-[28px] font-semibold ${tierColor}`}>
                  {product.ecv.toFixed(2)}{" "}
                  <span className="font-mono text-[13px] text-ink-faint">kg CO₂e / kg</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${tierBadge}`}>
                  Impact {CARBON_LABELS[tier]}
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-faint">
                Source ADEME · Impact CO₂. Privilégier les produits locaux et de pleine saison
                réduit l&apos;empreinte.
              </p>
            </>
          ) : (
            <p className="text-[13px] text-ink-faint">
              Donnée d&apos;empreinte non disponible
              {product.category === "herbes"
                ? " — les herbes aromatiques ne figurent pas dans la source ADEME"
                : ""}
              .
            </p>
          )}
        </div>

        {/* Related recipes */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Recettes avec {product.name.toLowerCase()}</Eyebrow>
          {recipes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recipes.map((r) => {
                const total = (r.prepTime ?? 0) + (r.cookTime ?? 0) + (r.restTime ?? 0);
                return (
                  <Link
                    key={r.id}
                    href={`/recettes/${r.slug}`}
                    className="group flex items-center gap-3 rounded-input border border-line-soft bg-surface p-2.5 transition hover:border-accent hover:bg-accent-soft"
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px]">
                      <RecipePhoto
                        imageUrl={r.imageUrl}
                        title={r.title}
                        label={r.categories[0] ?? "recette"}
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold text-ink">{r.title}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[12.5px] text-ink-faint">
                        <Icon name="clock" size={13} /> {fmt(total)}
                        {r.categories[0] ? ` · ${r.categories[0]}` : ""}
                      </span>
                    </span>
                    <Icon
                      name="arrow"
                      size={16}
                      className="shrink-0 text-ink-faint transition group-hover:text-accent"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-faint">
              Aucune recette associée pour l&apos;instant.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
