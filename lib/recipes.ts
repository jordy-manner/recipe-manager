// Types et validation partagés entre les API Routes et les Server Actions.
//
// Modélisation :
// - ingredients : relation many-to-many via RecipeIngredient (nom d'ingrédient +
//   quantité + unité). Ingredient et Unit sont des catalogues (name unique).
// - steps : colonne Json (tableau de chaînes, une par étape).
// - tags : many-to-many via RecipeTag.

export type IngredientInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type RecipeInput = {
  title: string;
  description: string | null;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: IngredientInput[];
  steps: string[];
  tags: string[];
};

export type ValidationResult =
  | { ok: true; data: RecipeInput }
  | { ok: false; errors: string[] };

/** Lit une valeur Json inconnue comme un tableau de chaînes (pour l'affichage des étapes). */
export function asLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((s) => s.trim().length > 0);
  }
  return [];
}

/** Découpe un texte multi-lignes en tableau (vide ignoré). */
function splitLines(value: unknown): string[] {
  if (Array.isArray(value)) return asLines(value);
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Découpe une liste de tags séparés par des virgules (ou un tableau). */
function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) return asLines(value);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Entier positif optionnel ; signale une erreur si fourni mais invalide. */
function toOptionalInt(
  value: unknown,
  field: string,
  errors: string[],
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) {
    errors.push(`${field} doit être un entier positif`);
    return null;
  }
  return n;
}

/**
 * Normalise un tableau d'ingrédients bruts ([{ name, quantity, unit }]).
 * Les lignes sans nom sont ignorées ; une quantité fournie mais non numérique
 * (ou négative) ajoute une erreur. La virgule décimale française est tolérée.
 */
function parseIngredients(value: unknown, errors: string[]): IngredientInput[] {
  if (!Array.isArray(value)) return [];
  const result: IngredientInput[] = [];

  for (const row of value) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;

    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (name.length === 0) continue; // ligne vide → ignorée

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
 * Valide et normalise une entrée brute (corps JSON d'API ou FormData converti).
 */
export function validateRecipeInput(raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title.length === 0) {
    errors.push("Le titre est obligatoire");
  }

  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : null;

  const servings = toOptionalInt(raw.servings, "Le nombre de parts", errors);
  const prepTime = toOptionalInt(raw.prepTime, "Le temps de préparation", errors);
  const cookTime = toOptionalInt(raw.cookTime, "Le temps de cuisson", errors);

  const ingredients = parseIngredients(raw.ingredients, errors);
  const steps = splitLines(raw.steps);
  const tags = splitTags(raw.tags);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { title, description, servings, prepTime, cookTime, ingredients, steps, tags },
  };
}

/**
 * Extrait les champs depuis un FormData. Les lignes d'ingrédients sont envoyées
 * comme tableaux parallèles (ingredientName / ingredientQuantity / ingredientUnit),
 * recombinés ligne par ligne.
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

  return validateRecipeInput({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    prepTime: formData.get("prepTime"),
    cookTime: formData.get("cookTime"),
    ingredients,
    steps: formData.get("steps"),
    tags: formData.get("tags"),
  });
}

// --- Helpers pour les écritures Prisma (objets simples, sans import Prisma) ---

/** Champs scalaires de Recipe (steps reste une colonne Json). */
export function recipeScalars(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description,
    servings: input.servings,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    steps: input.steps,
  };
}

/**
 * Lignes de jonction RecipeIngredient à créer : pour chaque ingrédient on crée
 * le lien (avec quantité + position) et on connecte/crée l'Ingredient et l'Unit
 * par leur `name` unique.
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
 * Lignes de jonction RecipeTag à créer : pour chaque tag, on crée le lien et
 * on connecte (ou crée) le Tag par son `name` unique.
 */
export function recipeTagsCreate(input: RecipeInput) {
  return input.tags.map((name) => ({
    tag: { connectOrCreate: { where: { name }, create: { name } } },
  }));
}

type RawRecipeTag = { tag: { id: string; name: string } };
type RawRecipeIngredient = {
  ingredientId: string;
  ingredient: { name: string };
  quantity: number | null;
  unit: { name: string } | null;
  position: number;
};

/**
 * Aplatit les relations `recipeTags` et `recipeIngredients` en formes
 * ergonomiques (`tags`, `ingredients`) pour l'API et les pages.
 */
export function flattenRecipe<
  T extends {
    recipeTags: RawRecipeTag[];
    recipeIngredients: RawRecipeIngredient[];
  },
>(recipe: T) {
  const { recipeTags, recipeIngredients, ...rest } = recipe;
  return {
    ...rest,
    tags: recipeTags.map((rt) => rt.tag),
    ingredients: recipeIngredients.map((ri) => ({
      id: ri.ingredientId,
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit?.name ?? null,
      position: ri.position,
    })),
  };
}
