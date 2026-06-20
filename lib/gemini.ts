// Recipe photo scanning via the Gemini API (Google Generative Language, REST —
// no SDK, like lib/media's Cloudinary calls). One or more images are sent inline
// (base64) to a multimodal model that returns a STRUCTURED recipe JSON
// (responseSchema), so there is no fragile OCR/heuristic step. Server-only:
// reads the key from settings (DB → env). The image is sent to Google.

import { getGeminiKey, GEMINI_MODEL } from "@/lib/settings";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 45_000;

export type GeminiImage = { mimeType: string; base64: string };

// Shape we ask Gemini to return (mirrors the editable recipe form fields).
export type GeminiRecipe = {
  title?: string;
  description?: string;
  servings?: number | null;
  servingUnit?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  restTime?: number | null;
  ingredients?: { name: string; quantity?: number | null; unit?: string | null }[];
  steps?: string[];
};

export type GeminiResult =
  | { ok: true; recipe: GeminiRecipe }
  | { ok: false; error: string };

// Structured-output schema (uppercase types + propertyOrdering = portable across
// Gemini 2.x/3.x). Times are integers in minutes; quantities are numbers.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Titre de la recette" },
    description: { type: "STRING", description: "Courte description, sinon vide" },
    servings: { type: "INTEGER", description: "Nombre de portions (chiffre uniquement)" },
    servingUnit: { type: "STRING", description: "Unité de la portion (personnes, verrines, crêpes, parts…), sinon omis" },
    prepTime: { type: "INTEGER", description: "Temps de préparation en minutes" },
    cookTime: { type: "INTEGER", description: "Temps de cuisson en minutes" },
    restTime: { type: "INTEGER", description: "Temps de repos en minutes" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Nom de l'ingrédient, sans la quantité" },
          quantity: { type: "NUMBER", description: "Quantité numérique, sinon omis" },
          unit: { type: "STRING", description: "Unité (g, ml, c. à s., pièce…), sinon vide" },
        },
        propertyOrdering: ["name", "quantity", "unit"],
      },
    },
    steps: { type: "ARRAY", items: { type: "STRING", description: "Une étape de préparation" } },
  },
  propertyOrdering: ["title", "description", "servings", "servingUnit", "prepTime", "cookTime", "restTime", "ingredients", "steps"],
} as const;

const PROMPT_IMAGE =
  "Tu es un assistant culinaire. Lis la ou les photo(s) de recette (imprimée ou " +
  "manuscrite, en français) et renvoie la recette structurée selon le schéma. " +
  "Les temps sont en minutes (entiers). Sépare bien la quantité, l'unité et le " +
  "nom de chaque ingrédient. N'invente rien : laisse vide ce qui est absent. " +
  "S'il y a plusieurs pages, recompose une seule recette dans l'ordre.";

const PROMPT_TEXT =
  "Tu es un assistant culinaire. À partir du contenu d'une page web de recette " +
  "ci-dessous (texte ou données structurées), renvoie la recette selon le schéma. " +
  "Les temps sont en minutes (entiers). Sépare bien la quantité, l'unité et le nom " +
  "de chaque ingrédient. Ignore le bruit (navigation, pubs, commentaires). " +
  "N'invente rien : laisse vide ce qui est absent.\n\nCONTENU :\n";

/** Core call: POST the given content parts with the structured-recipe schema. */
async function generateRecipe(parts: unknown[]): Promise<GeminiResult> {
  const key = await getGeminiKey();
  if (!key) return { ok: false, error: "Aucune clé API Gemini configurée." };

  const body = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  };

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "L'analyse a mis trop de temps." : "Impossible de contacter Gemini.";
    return { ok: false, error: msg };
  }

  if (!res.ok) {
    // Surface the key/quota class of error without leaking the response body.
    if (res.status === 400 || res.status === 403) return { ok: false, error: "Clé API Gemini invalide ou refusée." };
    if (res.status === 429) return { ok: false, error: "Quota Gemini atteint — réessayez plus tard." };
    return { ok: false, error: `Gemini a répondu ${res.status}.` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "Réponse Gemini illisible." };
  }

  const text = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, error: "Aucune recette détectée." };

  try {
    return { ok: true, recipe: JSON.parse(text) as GeminiRecipe };
  } catch {
    return { ok: false, error: "Recette illisible dans la réponse." };
  }
}

/** Vision: extract a recipe from one or more photos (image never leaves... goes to Google). */
export async function extractRecipeFromImages(images: GeminiImage[]): Promise<GeminiResult> {
  if (!images.length) return { ok: false, error: "Aucune image à analyser." };
  return generateRecipe([
    { text: PROMPT_IMAGE },
    ...images.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } })),
  ]);
}

/** Text: structure a recipe from a web page's content (cleaned text or JSON-LD). */
export async function extractRecipeFromText(content: string): Promise<GeminiResult> {
  if (!content.trim()) return { ok: false, error: "Contenu vide." };
  return generateRecipe([{ text: PROMPT_TEXT + content }]);
}
