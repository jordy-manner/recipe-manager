"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Icon } from "../components/icons";
import { RecipeCard, type RecipeCardData } from "../components/recipe-card";
import {
  Difficulty,
  FavoriteButton,
  RecipePhoto,
  Tag,
  formatTime,
} from "../components/recipe-ui";
import { deleteRecipeAction } from "./actions";

const DIFF_LABELS: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

export type RecipeDetailData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number | null;
  servingUnit: string | null;
  prepTime: number | null;
  cookTime: number | null;
  restTime: number | null;
  difficulty: number | null;
  rating: number | null;
  author: string | null;
  imageUrl: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  tags: string[];
  categories: string[];
  ingSections: { id: string; title: string }[];
  stepSections: { id: string; title: string }[];
  ingredients: { name: string; quantity: number | null; unit: string | null; sectionId: string | null }[];
  utensils: { name: string; quantity: number | null }[];
  steps: { content: string; sectionId: string | null }[];
  sources: { value: string; kind: "url" | "text" }[];
};

/** Formats a scaled quantity: trims to 2 decimals, drops trailing zeros. */
function fmtQty(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function MetaCell({
  icon,
  value,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 text-accent">
      {icon}
      <div className="flex flex-col leading-tight">
        <b className="text-[15.5px] font-bold text-ink">{value}</b>
        <span className="text-[12.5px] font-medium text-ink-faint">{sub}</span>
      </div>
    </div>
  );
}

export function RecipeDetail({
  recipe,
  related,
}: {
  recipe: RecipeDetailData;
  related: RecipeCardData[];
}) {
  const base = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const [serves, setServes] = useState(base);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const factor = serves / base;
  const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) + (recipe.restTime ?? 0);
  const timeSub = [
    recipe.prepTime ? `Préparation ${recipe.prepTime} min` : null,
    recipe.cookTime ? `Cuisson ${recipe.cookTime} min` : null,
    recipe.restTime ? `Repos ${formatTime(recipe.restTime)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasNutrition =
    recipe.kcal != null ||
    recipe.protein != null ||
    recipe.carbs != null ||
    recipe.fat != null;

  return (
    <main className="mx-auto w-full max-w-content animate-fade-up px-[18px] pt-7 sm:px-8">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/recettes"
          className="inline-flex items-center gap-2 py-1.5 text-[15px] font-semibold text-ink-soft transition hover:text-accent"
        >
          <Icon name="back" size={18} /> Retour
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/recettes/${recipe.slug}/modifier`}
            className="rounded-full border border-line bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink"
          >
            Modifier
          </Link>
          <form action={deleteRecipeAction}>
            <input type="hidden" name="id" value={recipe.id} />
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink-faint transition hover:border-accent hover:text-accent"
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>

      {/* Hero */}
      <div className="grid items-center gap-7 py-6 pb-12 md:grid-cols-[1fr_0.85fr] md:gap-14">
        <div className="min-w-0">
          {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {recipe.categories.map((c) => (
                <Tag key={c} accent>
                  {c}
                </Tag>
              ))}
              {recipe.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
          <h1 className="mb-4 font-display text-[clamp(36px,4.5vw,56px)] font-medium leading-[1.02] tracking-[-0.025em]">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mb-7 max-w-[520px] text-[19px] leading-relaxed text-ink-soft">
              {recipe.description}
            </p>
          )}
          <div className="grid max-w-[480px] grid-cols-2 gap-x-7 gap-y-[18px]">
            {total > 0 && (
              <MetaCell
                icon={<Icon name="clock" size={18} />}
                value={formatTime(total)}
                sub={timeSub}
              />
            )}
            {recipe.servings != null && (
              <MetaCell
                icon={<Icon name="users" size={18} />}
                value={`${recipe.servings} ${recipe.servingUnit ?? "personnes"}`}
                sub="Recette de base"
              />
            )}
            {recipe.difficulty != null && (
              <MetaCell
                icon={<Difficulty level={recipe.difficulty} />}
                value={DIFF_LABELS[recipe.difficulty] ?? "—"}
                sub="Niveau"
              />
            )}
            {recipe.rating != null && (
              <MetaCell
                icon={<Icon name="star" size={18} fill="currentColor" />}
                value={`${recipe.rating.toFixed(1)} / 5`}
                sub={recipe.author ? `par ${recipe.author}` : "Note"}
              />
            )}
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-card shadow-card-lg">
            <RecipePhoto
              imageUrl={recipe.imageUrl}
              title={recipe.title}
              label="photo du plat"
            />
          </div>
          <FavoriteButton className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-2 whitespace-nowrap px-5 py-2.5 text-[14px] font-bold shadow-card-lg [&>svg]:mr-1" />
        </div>
      </div>

      {/* Body */}
      <div className="grid items-start gap-7 pb-16 md:grid-cols-[340px_1fr] md:gap-14">
        {/* Ingredients aside */}
        <aside className="rounded-card border border-line-soft bg-surface p-6 shadow-card md:sticky md:top-[92px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[24px] font-medium">Ingrédients</h2>
            <div className="flex items-center overflow-hidden rounded-full border border-line">
              <button
                type="button"
                onClick={() => setServes((s) => Math.max(1, s - 1))}
                aria-label="Moins de portions"
                className="grid h-8 w-8 place-items-center text-lg font-bold transition hover:bg-surface-muted"
              >
                <Icon name="minus" size={16} />
              </button>
              <span className="px-3 text-[13px] text-ink-soft">
                <b className="text-ink">{serves}</b> {recipe.servingUnit ?? "pers."}
              </span>
              <button
                type="button"
                onClick={() => setServes((s) => s + 1)}
                aria-label="Plus de portions"
                className="grid h-8 w-8 place-items-center text-lg font-bold transition hover:bg-surface-muted"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>

          {recipe.ingredients.length > 0 ? (
            <div className="flex flex-col">
              {/* Ungrouped ingredients first. */}
              {recipe.ingredients
                .filter((ing) => ing.sectionId === null)
                .map((ing, i) => (
                  <IngLine key={i} ing={ing} factor={factor} />
                ))}
              {/* Sectioned ingredients. */}
              {recipe.ingSections.map((sec) => {
                const secIngs = recipe.ingredients.filter((ing) => ing.sectionId === sec.id);
                if (!secIngs.length) return null;
                return (
                  <div key={sec.id}>
                    <SectionLabel title={sec.title} />
                    {secIngs.map((ing, i) => (
                      <IngLine key={i} ing={ing} factor={factor} />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Aucun ingrédient.</p>
          )}

          {recipe.utensils.length > 0 && (
            <div className="mt-5 border-t border-dashed border-line pt-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-ink-faint">
                <Icon name="tool" size={14} /> Ustensiles
              </h3>
              <ul className="flex flex-wrap gap-2">
                {recipe.utensils.map((u, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-surface-muted px-3 py-1.5 text-[13px] text-ink-soft"
                  >
                    {u.quantity != null && u.quantity > 1 && (
                      <span className="font-semibold text-ink">{u.quantity}× </span>
                    )}
                    {u.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasNutrition && (
            <div className="mt-[22px] border-t border-dashed border-line pt-5">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[13px] font-bold uppercase tracking-wider text-ink-faint">
                  Nutrition
                </span>
                {recipe.kcal != null && (
                  <span className="font-display text-[24px] font-semibold text-accent">
                    {recipe.kcal}{" "}
                    <small className="font-sans text-[13px] text-ink-faint">
                      kcal / portion
                    </small>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <NutriCell label="Protéines" value={recipe.protein} />
                <NutriCell label="Glucides" value={recipe.carbs} />
                <NutriCell label="Lipides" value={recipe.fat} />
              </div>
            </div>
          )}
        </aside>

        {/* Steps */}
        <section className="min-w-0">
          <h2 className="mb-4 font-display text-[24px] font-medium">Préparation</h2>
          {recipe.steps.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {/* Ungrouped steps first. */}
              {(() => {
                const nullSteps = recipe.steps.filter((s) => s.sectionId === null);
                return nullSteps.map((s, i) => (
                  <StepItem
                    key={i}
                    step={s}
                    num={i + 1}
                    globalIdx={recipe.steps.indexOf(s)}
                    done={done}
                    setDone={setDone}
                  />
                ));
              })()}
              {/* Sectioned steps with restarted numbering. */}
              {recipe.stepSections.map((sec) => {
                const secSteps = recipe.steps.filter((s) => s.sectionId === sec.id);
                if (!secSteps.length) return null;
                return (
                  <div key={sec.id} className="flex flex-col gap-3.5">
                    <SectionLabel title={sec.title} />
                    {secSteps.map((s, i) => (
                      <StepItem
                        key={i}
                        step={s}
                        num={i + 1}
                        globalIdx={recipe.steps.indexOf(s)}
                        done={done}
                        setDone={setDone}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-ink-soft">Aucune étape renseignée.</p>
          )}

          {recipe.sources.length > 0 && (
            <div className="mt-8 border-t border-line-soft pt-5">
              <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wide text-ink-faint">
                <Icon name="globe" size={14} /> Sources
              </h3>
              <ul className="flex flex-col gap-1.5 text-[14px] text-ink-soft">
                {recipe.sources.map((s, i) => (
                  <li key={i} className="break-words">
                    {s.kind === "url" ? (
                      <a
                        href={s.value}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-accent-ink underline underline-offset-2 hover:text-accent"
                      >
                        {s.value}
                      </a>
                    ) : (
                      s.value
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="pb-20">
          <h2 className="mb-[22px] font-display text-[28px] font-medium tracking-[-0.015em]">
            Dans la même catégorie
          </h2>
          <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

/** Separator between ingredient/step sections (accent rule + label). */
function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mb-1 mt-3 flex items-center gap-3 border-t-2 border-accent-soft pt-2.5">
      <span className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-accent-ink">
        {title || "—"}
      </span>
    </div>
  );
}

/** Single ingredient line with scaled quantity. */
function IngLine({
  ing,
  factor,
}: {
  ing: { name: string; quantity: number | null; unit: string | null };
  factor: number;
}) {
  const qty = ing.quantity != null ? fmtQty(ing.quantity * factor) : null;
  return (
    <div className="flex items-baseline gap-3.5 border-b border-line-soft py-2.5 last:border-0">
      <span className="min-w-[72px] shrink-0 font-mono text-[13.5px] font-medium text-accent-ink">
        {[qty, ing.unit].filter(Boolean).join(" ")}
      </span>
      <span className="text-[15px] text-ink">{ing.name}</span>
    </div>
  );
}

/** Single step card (checkable). `globalIdx` is the step's position in the full
 *  array, used as a stable key for the `done` state map. */
function StepItem({
  step,
  num,
  globalIdx,
  done,
  setDone,
}: {
  step: { content: string };
  num: number;
  globalIdx: number;
  done: Record<number, boolean>;
  setDone: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) {
  const isDone = done[globalIdx];
  return (
    <div
      onClick={() => setDone((d) => ({ ...d, [globalIdx]: !d[globalIdx] }))}
      className={`flex cursor-pointer items-start gap-4 rounded-card border p-5 transition ${
        isDone
          ? "border-line-soft bg-surface-muted"
          : "border-line-soft bg-surface hover:border-line"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold transition ${
          isDone ? "bg-veg text-white" : "bg-accent-soft text-accent-ink"
        }`}
      >
        {isDone ? <Icon name="check" size={16} /> : num}
      </span>
      <div
        className={`pt-1 text-[16px] leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
          isDone ? "text-ink-faint line-through" : "text-ink"
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function NutriCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-input bg-surface-muted px-2.5 py-3 text-center">
      <span className="block text-[19px] font-semibold text-ink">
        {value != null ? value : "—"}
        {value != null && <small className="ml-0.5 text-[11px] text-ink-faint">g</small>}
      </span>
      <span className="text-[12px] font-medium text-ink-faint">{label}</span>
    </div>
  );
}
