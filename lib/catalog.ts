// Shared catalog constants and helpers for the /parametres editors. This module
// is CLIENT-SAFE (no server-only imports): the same lists/derivations are used
// by the Server Actions (validation) and by the CatalogTable client component
// (selects, "À compléter" status, accent-insensitive search).

// Grocery aisles ("rayon") and unit families ("type") are now editable
// referentials (models Aisle / UnitType, managed from /parametres). These lists
// remain the *seed* defaults only (prisma/seed.ts) — runtime options come from
// the DB and validation is enforced by the foreign keys, not by these arrays.

/** Default grocery aisles ("rayon"), used to seed the Aisle referential. */
export const AISLES = [
  "Légume",
  "Fruit",
  "Viande",
  "Poisson",
  "Produit laitier",
  "Épicerie",
  "Épice",
  "Herbe",
  "Boisson",
] as const;

/** Default unit families, used to seed the UnitType referential. */
export const UNIT_KINDS = [
  "Masse",
  "Volume",
  "Quantité",
  "Cuillère/pincée",
] as const;

/** Which catalog a CatalogTable edits. */
export type CatalogKind = "ingredient" | "utensil" | "unit";

// Row shapes sent from the server pages to the CatalogTable. `uses` is the
// number of recipes referencing the entry; `image` is the custom override URL.
export type IngredientRow = {
  id: string;
  name: string;
  aisleId: string | null;
  defaultUnitId: string | null;
  image: string | null;
  uses: number;
};

export type UtensilRow = {
  id: string;
  name: string;
  image: string | null;
  uses: number;
};

export type UnitRow = {
  id: string;
  name: string;
  abbreviation: string | null;
  typeId: string | null;
  uses: number;
};

/** A referential entry (aisle / unit type / tag / category) with its usage. */
export type RefRow = {
  id: string;
  name: string;
  uses: number;
};

/** Accent- and case-insensitive normalization for search/compare. */
export function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** An ingredient is incomplete when it lacks an aisle or a default unit. */
export function ingredientIncomplete(r: {
  aisleId: string | null;
  defaultUnitId: string | null;
}): boolean {
  return !r.aisleId || !r.defaultUnitId;
}

/** A unit is incomplete when it lacks an abbreviation or a type. */
export function unitIncomplete(r: {
  abbreviation: string | null;
  typeId: string | null;
}): boolean {
  return !r.abbreviation || !r.typeId;
}