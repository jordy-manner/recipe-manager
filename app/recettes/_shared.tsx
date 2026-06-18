import Link from "next/link";
import { Icon } from "../components/icons";
import { RecipeCard, RecipeCardRow, type RecipeCardData, type RecipeView } from "../components/recipe-card";

// Shared recipe-list helpers used by both the home (/) and the catalogue
// (/recettes). Server-compatible: presentational pieces render the RecipeCard
// client component, which carries its own boundary.

/** Prisma include for the relations a recipe card needs. */
export const cardInclude = {
  recipeTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
  recipeCategories: { include: { category: true }, orderBy: { position: "asc" } },
} as const;

export type CardRow = {
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
  popular: boolean;
  recipeTags: { tag: { name: string } }[];
  recipeCategories: { category: { name: string } }[];
};

export function toCard(r: CardRow): RecipeCardData {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    restTime: r.restTime,
    servings: r.servings,
    difficulty: r.difficulty,
    rating: r.rating,
    imageUrl: r.imageUrl,
    tags: r.recipeTags.map((rt) => rt.tag.name),
    categories: r.recipeCategories.map((rc) => rc.category.name),
  };
}

export const RECIPE_VIEWS: { key: RecipeView; icon: "grid" | "rows" | "layers"; label: string }[] = [
  { key: "grille", icon: "grid", label: "Grille" },
  { key: "liste", icon: "rows", label: "Liste" },
  { key: "magazine", icon: "layers", label: "Magazine" },
];

/** Auto-fill card grid. */
export function RecipeGrid({
  recipes,
  matches,
}: {
  recipes: RecipeCardData[];
  matches?: Map<string, { count: number; total: number }>;
}) {
  return (
    <div
      className="grid gap-[26px]"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}
    >
      {recipes.map((r) => (
        <RecipeCard key={r.id} r={r} match={matches?.get(r.id)} />
      ))}
    </div>
  );
}

/** Horizontal row list. */
export function RecipeList({
  recipes,
  matches,
}: {
  recipes: RecipeCardData[];
  matches?: Map<string, { count: number; total: number }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {recipes.map((r) => (
        <RecipeCardRow key={r.id} r={r} match={matches?.get(r.id)} />
      ))}
    </div>
  );
}

/** Magazine: first card spans full width, rest in a 2-col grid. */
export function MagazineGrid({
  recipes,
  matches,
}: {
  recipes: RecipeCardData[];
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

export function RecipesLayout({
  view,
  recipes,
  matches,
}: {
  view: RecipeView;
  recipes: RecipeCardData[];
  matches?: Map<string, { count: number; total: number }>;
}) {
  if (view === "liste") return <RecipeList recipes={recipes} matches={matches} />;
  if (view === "grille") return <RecipeGrid recipes={recipes} matches={matches} />;
  return <MagazineGrid recipes={recipes} matches={matches} />;
}

export function SectionHead({
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

export function EmptyState() {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-16 text-center">
      <p className="font-display text-2xl font-medium">Aucune recette pour l&apos;instant</p>
      <p className="mt-2 text-ink-soft">Lancez-vous et créez la première !</p>
      <Link
        href="/recettes/nouvelle"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-accent-deep"
      >
        <Icon name="plus" size={17} /> Créer une recette
      </Link>
    </div>
  );
}
