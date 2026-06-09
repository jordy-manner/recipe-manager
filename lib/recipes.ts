// Types et validation partagés entre les API Routes et les Server Actions.
//
// Choix de modélisation : `ingredients` et `steps` sont stockés en `Json`
// (colonnes Prisma) sous forme de tableaux de chaînes — une ligne = un élément.
// `tags` est un `String[]` Postgres natif.

export type RecipeInput = {
  title: string;
  description: string | null;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: string[];
  steps: string[];
  tags: string[];
};

export type ValidationResult =
  | { ok: true; data: RecipeInput }
  | { ok: false; errors: string[] };

/** Lit une valeur Json inconnue comme un tableau de chaînes (pour l'affichage). */
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

/**
 * Convertit une valeur en entier positif optionnel.
 * Renvoie `undefined` si la valeur est invalide (≠ vide), pour signaler l'erreur.
 */
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
 * Valide et normalise une entrée brute (corps JSON d'API ou FormData converti).
 * Accepte aussi bien des tableaux (API JSON) que des chaînes multi-lignes (form).
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

  const ingredients = splitLines(raw.ingredients);
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

/** Extrait les champs d'une recette depuis un FormData. */
export function recipeInputFromFormData(formData: FormData): ValidationResult {
  return validateRecipeInput({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    prepTime: formData.get("prepTime"),
    cookTime: formData.get("cookTime"),
    ingredients: formData.get("ingredients"),
    steps: formData.get("steps"),
    tags: formData.get("tags"),
  });
}