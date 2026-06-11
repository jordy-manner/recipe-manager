// Types and validation shared between the API Routes and the Server Actions.
//
// Modeling:
// - ingredients: many-to-many relation via RecipeIngredient (ingredient name +
//   quantity + unit). Ingredient and Unit are catalogs (unique name).
// - steps: Json column (array of strings, one per step).
// - tags: many-to-many via RecipeTag.

export type IngredientInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type UtensilInput = {
  name: string;
  quantity: number | null;
};

export type RecipeInput = {
  title: string;
  description: string | null;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  difficulty: number | null;
  rating: number | null;
  author: string | null;
  popular: boolean;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  ingredients: IngredientInput[];
  utensils: UtensilInput[];
  steps: string[];
  tags: string[];
  categories: string[];
};

export type ValidationResult =
  | { ok: true; data: RecipeInput }
  | { ok: false; errors: string[] };

/** Reads an unknown Json value as an array of strings (for rendering steps). */
export function asLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((s) => s.trim().length > 0);
  }
  return [];
}

/**
 * Normalizes the steps: an array of Markdown strings (one per step). Each step
 * is trimmed (at both ends) — internal line breaks (Markdown) are preserved. A
 * single string is tolerated for backward compatibility (one step per line).
 */
function parseSteps(value: unknown): string[] {
  const arr = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n/)
      : [];
  return arr.map((v) => String(v).trim()).filter((s) => s.length > 0);
}

/** Splits a comma-separated list of tags (or an array). */
function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) return asLines(value);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Optional positive integer; reports an error if provided but invalid. An
 * optional `max` bounds the value (used e.g. for difficulty 1–3).
 */
function toOptionalInt(
  value: unknown,
  field: string,
  errors: string[],
  max?: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0 || (max !== undefined && n > max)) {
    errors.push(`${field} est invalide`);
    return null;
  }
  return n;
}

/** Optional non-negative float within [0, max]; reports an error if invalid. */
function toOptionalFloat(
  value: unknown,
  field: string,
  errors: string[],
  max: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || n > max) {
    errors.push(`${field} est invalide`);
    return null;
  }
  return n;
}

/** Optional non-empty trimmed string, else null. */
function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Normalizes an array of raw ingredients ([{ name, quantity, unit }]).
 * Rows without a name are ignored; a quantity that is provided but not numeric
 * (or negative) adds an error. The French decimal comma is tolerated.
 */
function parseIngredients(value: unknown, errors: string[]): IngredientInput[] {
  if (!Array.isArray(value)) return [];
  const result: IngredientInput[] = [];

  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;

    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (name.length === 0) continue; // empty row → ignored

    let quantity: number | null = null;
    const rawQty = r.quantity;
    if (rawQty !== null && rawQty !== undefined && rawQty !== "") {
      const q =
        typeof rawQty === "number"
          ? rawQty
          : Number(String(rawQty).replace(",", ".").trim());
      if (!Number.isFinite(q) || q < 0) {
        errors.push(`Quantité invalide pour « ${name} »`);
      } else {
        quantity = q;
      }
    }

    const unit =
      typeof r.unit === "string" && r.unit.trim().length > 0
        ? r.unit.trim()
        : null;

    result.push({ name, quantity, unit });
  }

  return result;
}

/**
 * Normalizes an array of raw utensils ([{ name, quantity }]).
 * Rows without a name are ignored; a quantity that is provided but not an
 * integer (or negative) adds an error.
 */
function parseUtensils(value: unknown, errors: string[]): UtensilInput[] {
  if (!Array.isArray(value)) return [];
  const result: UtensilInput[] = [];

  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;

    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (name.length === 0) continue; // empty row → ignored

    let quantity: number | null = null;
    const rawQty = r.quantity;
    if (rawQty !== null && rawQty !== undefined && rawQty !== "") {
      const q = typeof rawQty === "number" ? rawQty : Number(String(rawQty).trim());
      if (!Number.isInteger(q) || q < 0) {
        errors.push(`Quantité invalide pour « ${name} »`);
      } else {
        quantity = q;
      }
    }

    result.push({ name, quantity });
  }

  return result;
}

/**
 * Validates and normalizes a raw input (API JSON body or converted FormData).
 */
export function validateRecipeInput(raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length === 0) {
    errors.push("Le titre est obligatoire");
  }

  const description = toOptionalString(raw.description);

  const servings = toOptionalInt(raw.servings, "Le nombre de parts", errors);
  const prepTime = toOptionalInt(raw.prepTime, "Le temps de préparation", errors);
  const cookTime = toOptionalInt(raw.cookTime, "Le temps de cuisson", errors);
  const difficulty = toOptionalInt(raw.difficulty, "La difficulté", errors, 3);
  const rating = toOptionalFloat(raw.rating, "La note", errors, 5);
  const author = toOptionalString(raw.author);
  const popular = raw.popular === true || raw.popular === "true" || raw.popular === "on";
  const kcal = toOptionalInt(raw.kcal, "Les calories", errors);
  const protein = toOptionalInt(raw.protein, "Les protéines", errors);
  const carbs = toOptionalInt(raw.carbs, "Les glucides", errors);
  const fat = toOptionalInt(raw.fat, "Les lipides", errors);

  const ingredients = parseIngredients(raw.ingredients, errors);
  const utensils = parseUtensils(raw.utensils, errors);
  const steps = parseSteps(raw.steps);
  const tags = splitTags(raw.tags);
  const categories = splitTags(raw.categories);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      servings,
      prepTime,
      cookTime,
      difficulty,
      rating,
      author,
      popular,
      kcal,
      protein,
      carbs,
      fat,
      ingredients,
      utensils,
      steps,
      tags,
      categories,
    },
  };
}

/**
 * Extracts the fields from a FormData. Ingredient rows are sent as parallel
 * arrays (ingredientName / ingredientQuantity / ingredientUnit), recombined row
 * by row.
 */
export function recipeInputFromFormData(formData: FormData): ValidationResult {
  const names = formData.getAll("ingredientName");
  const quantities = formData.getAll("ingredientQuantity");
  const units = formData.getAll("ingredientUnit");

  const ingredients = names.map((name, i) => ({
    name,
    quantity: quantities[i] ?? "",
    unit: units[i] ?? "",
  }));

  const utensilNames = formData.getAll("utensilName");
  const utensilQuantities = formData.getAll("utensilQuantity");
  const utensils = utensilNames.map((name, i) => ({
    name,
    quantity: utensilQuantities[i] ?? "",
  }));

  return validateRecipeInput({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    prepTime: formData.get("prepTime"),
    cookTime: formData.get("cookTime"),
    difficulty: formData.get("difficulty"),
    rating: formData.get("rating"),
    author: formData.get("author"),
    popular: formData.get("popular"),
    kcal: formData.get("kcal"),
    protein: formData.get("protein"),
    carbs: formData.get("carbs"),
    fat: formData.get("fat"),
    ingredients,
    utensils,
    steps: formData.getAll("step"), // one textarea per step (StepEditor)
    tags: formData.getAll("tag"), // one hidden input per tag (TagsCombobox)
    categories: formData.getAll("category"), // one hidden input per category
  });
}

// --- Helpers for Prisma writes (plain objects, without importing Prisma) ---

/** Scalar fields of Recipe (steps stays a Json column). */
export function recipeScalars(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description,
    servings: input.servings,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    difficulty: input.difficulty,
    rating: input.rating,
    author: input.author,
    popular: input.popular,
    kcal: input.kcal,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    steps: input.steps,
  };
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
};
type RawRecipeUtensil = {
  utensilId: string;
  utensil: { name: string };
  quantity: number | null;
  position: number;
};

/**
 * Flattens the `recipeTags`, `recipeIngredients` and `recipeUtensils` relations
 * into ergonomic shapes (`tags`, `ingredients`, `utensils`) for the API and the
 * pages.
 */
export function flattenRecipe<
  T extends {
    recipeTags: RawRecipeTag[];
    recipeCategories: RawRecipeCategory[];
    recipeIngredients: RawRecipeIngredient[];
    recipeUtensils: RawRecipeUtensil[];
  },
>(recipe: T) {
  const { recipeTags, recipeCategories, recipeIngredients, recipeUtensils, ...rest } =
    recipe;
  return {
    ...rest,
    tags: recipeTags.map((rt) => rt.tag),
    categories: recipeCategories.map((rc) => rc.category),
    ingredients: recipeIngredients.map((ri) => ({
      id: ri.ingredientId,
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit?.name ?? null,
      position: ri.position,
    })),
    utensils: recipeUtensils.map((ru) => ({
      id: ru.utensilId,
      name: ru.utensil.name,
      quantity: ru.quantity,
      position: ru.position,
    })),
  };
}
