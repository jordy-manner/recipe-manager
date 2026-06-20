// Shapes and Prisma-write helpers shared between the API Routes and the Server
// Actions. Input validation lives in lib/validation.ts (Zod).
//
// Modeling:
// - ingredients: many-to-many via RecipeIngredient (ingredient name + quantity
//   + unit). Ingredient and Unit are catalogs (unique name).
// - steps: own Step table (content + order).
// - tags / categories: many-to-many via RecipeTag / RecipeCategory.

import {
  validateRecipeInput,
  type IngredientInput,
  type RecipeInput,
  type UtensilInput,
  type ValidationResult,
} from "./validation";

export type { IngredientInput, RecipeInput, UtensilInput, ValidationResult };
export { validateRecipeInput };

/** URL-friendly slug from a title (accent-stripped, lowercased, dash-joined). */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "")
      .slice(0, 80) || "recette"
  );
}

/**
 * Extracts the fields from a FormData and validates them. Ingredient/utensil
 * rows are sent as parallel arrays, recombined row by row before validation.
 */
export function recipeInputFromFormData(formData: FormData): ValidationResult {
  const ingredientNames = formData.getAll("ingredientName");
  const ingredientQuantities = formData.getAll("ingredientQuantity");
  const ingredientUnits = formData.getAll("ingredientUnit");
  const ingredientPrimary = formData.getAll("ingredientIsPrimary");

  const utensilNames = formData.getAll("utensilName");
  const utensilQuantities = formData.getAll("utensilQuantity");
  const utensils = utensilNames.map((name, i) => ({
    name,
    quantity: utensilQuantities[i] ?? "",
  }));

  const ingredientSectionIdxs = formData.getAll("ingredientSectionIdx");
  const ingredientsWithSec = ingredientNames.map((name, i) => ({
    name,
    quantity: ingredientQuantities[i] ?? "",
    unit: ingredientUnits[i] ?? "",
    isPrimary: ingredientPrimary[i] ?? "false",
    sectionIdx: ingredientSectionIdxs[i] ?? "",
  }));

  return validateRecipeInput({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    servingUnit: formData.get("servingUnit"),
    prepTime: formData.get("prepTime"),
    cookTime: formData.get("cookTime"),
    restTime: formData.get("restTime"),
    difficulty: formData.get("difficulty"),
    rating: formData.get("rating"),
    author: formData.get("author"),
    popular: formData.get("popular"),
    kcal: formData.get("kcal"),
    protein: formData.get("protein"),
    carbs: formData.get("carbs"),
    fat: formData.get("fat"),
    ingredients: ingredientsWithSec,
    utensils,
    steps: formData.getAll("step"), // one textarea per step (StepEditor)
    tags: formData.getAll("tag"), // one hidden input per tag (TagsCombobox)
    categories: formData.getAll("category"), // one hidden input per category
    sources: formData.getAll("source"), // one hidden input per source
    seasonMode: formData.get("seasonMode"),
    seasonMonths: formData.getAll("seasonMonth"), // one hidden input per month
    ingSectionTitles: formData.getAll("ingSectionTitle"),
    stepSectionTitles: formData.getAll("stepSectionTitle"),
    stepSectionIdxs: formData.getAll("stepSectionIdx"),
  });
}

// --- Helpers for Prisma writes (plain objects, without importing Prisma) ---

/** Scalar fields of Recipe (steps now live in their own table). */
export function recipeScalars(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description,
    servings: input.servings,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    restTime: input.restTime,
    difficulty: input.difficulty,
    rating: input.rating,
    author: input.author,
    popular: input.popular,
    kcal: input.kcal,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    seasonMode: input.seasonMode,
    seasonMonths: input.seasonMonths,
  };
}

/** Step rows to create (content + order), without sectionId (set in transaction). */
export function recipeStepsCreate(input: RecipeInput) {
  return input.steps.map((content, order) => ({ content, order }));
}

/**
 * Resolves a section index to a DB section ID. Returns null when the index is
 * out of range or when the sectionIds array is empty (no sections).
 */
export function resolveSectionId(
  idx: number | null | undefined,
  sectionIds: string[],
): string | null {
  if (idx == null || idx < 0 || idx >= sectionIds.length) return null;
  return sectionIds[idx] ?? null;
}

/** True when a source value is a web link (→ kind "url", else "text"). */
const isUrl = (value: string) => /^https?:\/\//i.test(value.trim());

/** RecipeSource rows to create: each source's value + derived kind + order. */
export function recipeSourcesCreate(input: RecipeInput) {
  return input.sources.map((value, position) => ({
    value,
    kind: (isUrl(value) ? "url" : "text") as "url" | "text",
    position,
  }));
}

/**
 * RecipeIngredient join rows to create: for each ingredient we create the link
 * (with quantity + position) and connect/create the Ingredient and the Unit by
 * their unique `name`.
 */
export function recipeIngredientsCreate(input: RecipeInput) {
  return input.ingredients.map((ing, position) => ({
    position,
    quantity: ing.quantity,
    isPrimary: ing.isPrimary,
    ingredient: {
      connectOrCreate: { where: { name: ing.name }, create: { name: ing.name } },
    },
    ...(ing.unit
      ? {
          unit: {
            connectOrCreate: { where: { name: ing.unit }, create: { name: ing.unit } },
          },
        }
      : {}),
  }));
}

/**
 * RecipeUtensil join rows to create: for each utensil we create the link (with
 * quantity + position) and connect/create the Utensil by its unique `name`.
 */
export function recipeUtensilsCreate(input: RecipeInput) {
  return input.utensils.map((ust, position) => ({
    position,
    quantity: ust.quantity,
    utensil: {
      connectOrCreate: { where: { name: ust.name }, create: { name: ust.name } },
    },
  }));
}

/**
 * RecipeTag join rows to create: for each tag, we create the link and connect
 * (or create) the Tag by its unique `name`.
 */
export function recipeTagsCreate(input: RecipeInput) {
  return input.tags.map((name) => ({
    tag: { connectOrCreate: { where: { name }, create: { name } } },
  }));
}

/**
 * RecipeCategory join rows to create: for each category, we create the link
 * (with position) and connect/create the Category by its unique `name`.
 */
export function recipeCategoriesCreate(input: RecipeInput) {
  return input.categories.map((name, position) => ({
    position,
    category: { connectOrCreate: { where: { name }, create: { name } } },
  }));
}

type RawRecipeTag = { tag: { id: string; name: string } };
type RawRecipeCategory = { category: { id: string; name: string }; position: number };
type RawRecipeIngredient = {
  ingredientId: string;
  ingredient: { name: string };
  quantity: number | null;
  unit: { name: string } | null;
  position: number;
  isPrimary: boolean;
  sectionId: string | null;
};
type RawRecipeUtensil = {
  utensilId: string;
  utensil: { name: string };
  quantity: number | null;
  position: number;
};
type RawStep = { content: string; order: number; sectionId: string | null };
type RawRecipeSource = { value: string; kind: "url" | "text"; position: number };
export type RawIngredientSection = { id: string; title: string; position: number };
export type RawStepSection = { id: string; title: string; position: number };

/**
 * Flattens the relations into ergonomic shapes (`tags`, `categories`,
 * `ingredients`, `utensils`, `steps`, `sources`) for the API and the pages.
 * `recipeSources` is optional so callers that don't query it still type-check.
 */
export function flattenRecipe<
  T extends {
    recipeTags: RawRecipeTag[];
    recipeCategories: RawRecipeCategory[];
    recipeIngredients: RawRecipeIngredient[];
    recipeUtensils: RawRecipeUtensil[];
    recipeSteps: RawStep[];
    recipeSources?: RawRecipeSource[];
    ingredientSections?: RawIngredientSection[];
    stepSections?: RawStepSection[];
  },
>(recipe: T) {
  const {
    recipeTags,
    recipeCategories,
    recipeIngredients,
    recipeUtensils,
    recipeSteps,
    recipeSources,
    ingredientSections,
    stepSections,
    ...rest
  } = recipe;
  return {
    ...rest,
    tags: recipeTags.map((rt) => rt.tag),
    categories: recipeCategories.map((rc) => rc.category),
    sources: (recipeSources ?? []).map((s) => ({ value: s.value, kind: s.kind })),
    ingredientSections: (ingredientSections ?? []).map((s) => ({ id: s.id, title: s.title })),
    stepSections: (stepSections ?? []).map((s) => ({ id: s.id, title: s.title })),
    ingredients: recipeIngredients.map((ri) => ({
      id: ri.ingredientId,
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit?.name ?? null,
      position: ri.position,
      isPrimary: ri.isPrimary,
      sectionId: ri.sectionId,
    })),
    utensils: recipeUtensils.map((ru) => ({
      id: ru.utensilId,
      name: ru.utensil.name,
      quantity: ru.quantity,
      position: ru.position,
    })),
    steps: recipeSteps.map((s) => ({ content: s.content, sectionId: s.sectionId })),
  };
}
