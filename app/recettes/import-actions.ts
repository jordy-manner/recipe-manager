"use server";

// Web import: fetch a recipe page SERVER-SIDE and extract its structured data
// (schema.org/Recipe). JSON-LD is preferred; a light DOM/microdata fallback
// covers pages without JSON-LD. The result pre-fills the creation form (fields
// stay fully editable) and the origin URL is added as the first source.

import type { RecipeFormValues } from "./recipe-form";
import { parseIngredientLine } from "@/lib/recipe-parse";
import {
  extractRecipeFromImages,
  extractRecipeFromText,
  type GeminiImage,
  type GeminiRecipe,
} from "@/lib/gemini";
import { geminiConfigured } from "@/lib/settings";

export type ExtractResult =
  | { ok: true; values: RecipeFormValues }
  | { ok: false; error: string };

const FETCH_TIMEOUT_MS = 12_000;

/** Direct page fetch with a browser-like UA; returns null on network/timeout error. */
async function directFetch(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MealodayBot/1.0; +recipe-import)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch {
    return null;
  }
}

async function fetchPageHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const res = await directFetch(url);
  if (res?.ok) return { ok: true, html: await res.text() };
  if (res && res.status === 403) return { ok: false, error: "Ce site bloque l'extraction (403). L'import web n'est pas disponible pour ce site." };
  if (res) return { ok: false, error: `La page a répondu ${res.status}. Vérifiez l'adresse.` };
  return { ok: false, error: "Impossible de récupérer la page." };
}
// Max characters of cleaned page text sent to Gemini (keeps token cost bounded).
const GEMINI_INPUT_MAX = 24_000;

/** Strips a full HTML document to its visible text (drops scripts/styles/tags). */
function cleanHtmlToText(html: string): string {
  return strip(
    html
      .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/i, " "),
  );
}

/** A blank form value set (server-side mirror of the form's EMPTY). */
function emptyValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    servings: "",
    prepTime: "",
    cookTime: "",
    restTime: "",
    difficulty: null,
    rating: "",
    author: "",
    popular: false,
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
    imageUrl: null,
    ingredients: [],
    utensils: [],
    steps: [],
    tags: [],
    categories: [],
    sources: [],
    seasonMode: "AUTO",
    seasonMonths: [],
  };
}

// Common named HTML entities seen in recipe pages (typography + French accents).
// Numeric entities (&#8217; / &#x2019;) are decoded generically below.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", sbquo: "‚", bdquo: "„",
  hellip: "…", ndash: "–", mdash: "—", minus: "−", deg: "°", middot: "·",
  laquo: "«", raquo: "»", times: "×", divide: "÷", frac12: "½", frac14: "¼", frac34: "¾",
  trade: "™", copy: "©", reg: "®", euro: "€", eacute: "é", egrave: "è", ecirc: "ê",
  euml: "ë", agrave: "à", acirc: "â", auml: "ä", ccedil: "ç", ugrave: "ù", ucirc: "û",
  uuml: "ü", icirc: "î", iuml: "ï", ocirc: "ô", ouml: "ö", oelig: "œ", aelig: "æ",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Acirc: "Â", Ccedil: "Ç", Ocirc: "Ô",
};

const fromCp = (cp: number): string => {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
};

/** Decodes numeric (&#…; / &#x…;) and common named HTML entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => fromCp(parseInt(d, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) =>
      name in NAMED_ENTITIES ? NAMED_ENTITIES[name as keyof typeof NAMED_ENTITIES] : m,
    );
}

/** Strips HTML tags + decodes entities + collapses whitespace (incl. nbsp). */
function strip(s: unknown): string {
  return decodeEntities(String(s ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** ISO 8601 duration ("PT1H30M") → minutes as a string ("90"), or "". */
function isoToMinutes(d: unknown): string {
  if (typeof d !== "string") return "";
  const m = d.match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return "";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const total = h * 60 + min;
  return total > 0 ? String(total) : "";
}

/** schema.org recipeInstructions (string | HowToStep[] | HowToSection[]) → string[]. */
function parseInstructions(ri: unknown): string[] {
  if (!ri) return [];
  if (typeof ri === "string") return ri.split(/\r?\n|<br\s*\/?>/i).map(strip).filter(Boolean);
  if (Array.isArray(ri)) {
    const out: string[] = [];
    for (const item of ri) {
      if (typeof item === "string") out.push(strip(item));
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if (o["@type"] === "HowToSection" && Array.isArray(o.itemListElement)) {
          for (const st of o.itemListElement) {
            const s = st as Record<string, unknown>;
            out.push(strip(s.text ?? s.name));
          }
        } else {
          out.push(strip(o.text ?? o.name));
        }
      }
    }
    return out.filter(Boolean);
  }
  return [];
}

/** Resolves a schema.org image (string | {url} | array) to the first URL. */
function parseImage(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return parseImage(img[0]);
  if (typeof img === "object") {
    const url = (img as Record<string, unknown>).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

/** recipeYield (number | string | array) → first integer as a string. */
function parseYield(y: unknown): string {
  const first = Array.isArray(y) ? y[0] : y;
  const m = String(first ?? "").match(/\d+/);
  return m ? m[0] : "";
}

/**
 * Extracts a JSON object from a JS assignment like `Marker = {...};` in raw HTML.
 * Properly handles string literals so braces inside strings don't confuse the depth counter.
 */
function extractJsonAfterMarker(src: string, marker: string): unknown | null {
  const idx = src.indexOf(marker);
  if (idx < 0) return null;
  const start = src.indexOf("{", idx + marker.length);
  if (start < 0) return null;
  let depth = 0, inStr = false, i = start;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (ch === "\\") i++; // skip escaped char
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
    }
    i++;
  }
  try { return JSON.parse(src.slice(start, i + 1)); } catch { return null; }
}

/**
 * Marmiton-specific: extracts recipe from `Mrtn.recipesData = { recipes: [...] }`.
 * Returns a schema.org-compatible node so it flows through the existing mapRecipeNode().
 */
function parseMrtnRecipe(html: string): Record<string, unknown> | null {
  const data = extractJsonAfterMarker(html, "Mrtn.recipesData =") as Record<string, unknown> | null;
  const recipes = data?.recipes as Record<string, unknown>[] | undefined;
  const r = recipes?.[0];
  if (!r) return null;

  // Normalize ingredients to schema.org recipeIngredient string array
  const rawIngs = r.ingredients as unknown[] | undefined;
  const recipeIngredient: string[] = Array.isArray(rawIngs)
    ? rawIngs.flatMap((ing) => {
        if (typeof ing === "string") return [ing];
        if (ing && typeof ing === "object") {
          const o = ing as Record<string, unknown>;
          const qty = String(o.quantity ?? o.qt ?? "").trim();
          const unit = String(o.unit ?? o.unit_label ?? "").trim();
          const name = String(o.name ?? o.ingredient_label ?? o.ingredient ?? "").trim();
          if (!name) return [];
          return [[qty, unit, name].filter(Boolean).join(" ")];
        }
        return [];
      })
    : [];

  // Normalize steps to string array
  const rawSteps = r.steps as unknown[] | undefined;
  const recipeInstructions: string[] = Array.isArray(rawSteps)
    ? rawSteps.flatMap((s) => {
        if (typeof s === "string") return s ? [s] : [];
        if (s && typeof s === "object") {
          const o = s as Record<string, unknown>;
          const text = String(o.text ?? o.description ?? o.step ?? "").trim();
          return text ? [text] : [];
        }
        return [];
      })
    : [];

  return {
    "@type": "Recipe",
    name: r.name,
    description: r.description ?? "",
    recipeYield: r.nb_pers ?? r.servings ?? "",
    prepTime: r.preparation_time ? `PT${r.preparation_time}M` : undefined,
    cookTime: r.cooking_time ? `PT${r.cooking_time}M` : undefined,
    totalTime: r.total_time ? `PT${r.total_time}M` : undefined,
    image: r.picture_url ?? r.image_url ?? undefined,
    recipeIngredient,
    recipeInstructions: recipeInstructions.join("\n"),
  };
}

/**
 * Microdata fallback: extracts schema.org/Recipe from HTML itemprop attributes.
 * Handles sites like Marmiton that embed structured data in HTML rather than JSON-LD.
 */
function parseMicrodataRecipe(html: string): Record<string, unknown> | null {
  if (!/itemtype=["'][^"']*schema\.org\/Recipe/i.test(html)) return null;

  const getFirst = (prop: string): string => {
    // Try content="..." attribute first (used by <meta itemprop="X" content="...">)
    const byContent =
      html.match(new RegExp(`itemprop=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")) ??
      html.match(new RegExp(`content=["']([^"']*)["'][^>]*itemprop=["']${prop}["']`, "i"));
    if (byContent) return byContent[1];
    // Fall back to element text
    const byText = html.match(new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]*)`, "i"));
    return strip(byText?.[1] ?? "");
  };

  const getAll = (prop: string): string[] => {
    const out: string[] = [];
    const re = new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]*)`, "gi");
    for (const m of html.matchAll(re)) {
      const v = strip(m[1]);
      if (v) out.push(v);
    }
    return out;
  };

  const name = getFirst("name");
  const ingredients = getAll("recipeIngredient");
  if (!name && !ingredients.length) return null;

  return {
    "@type": "Recipe",
    name,
    description: getFirst("description"),
    recipeYield: getFirst("recipeYield"),
    prepTime: getFirst("prepTime"),
    cookTime: getFirst("cookTime"),
    image: getFirst("image"),
    recipeIngredient: ingredients,
    recipeInstructions: getAll("recipeInstructions").join("\n"),
    author: getFirst("author"),
  };
}

/** Walks JSON-LD (handles @graph + arrays) to find the first Recipe node. */
function findRecipeNode(json: unknown): Record<string, unknown> | null {
  const nodes: unknown[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      nodes.push(v);
      const graph = (v as Record<string, unknown>)["@graph"];
      if (Array.isArray(graph)) graph.forEach(visit);
    }
  };
  visit(json);
  for (const n of nodes) {
    const t = (n as Record<string, unknown>)["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.some((x) => String(x).toLowerCase() === "recipe")) {
      return n as Record<string, unknown>;
    }
  }
  return null;
}

function mapRecipeNode(node: Record<string, unknown>, url: string): RecipeFormValues {
  const values = emptyValues();
  values.title = strip(node.name);
  values.description = strip(node.description);
  values.servings = parseYield(node.recipeYield);
  values.prepTime = isoToMinutes(node.prepTime);
  values.cookTime = isoToMinutes(node.cookTime);
  // If only totalTime is given, fall back to it as prep time.
  if (!values.prepTime && !values.cookTime) values.prepTime = isoToMinutes(node.totalTime);
  values.imageUrl = parseImage(node.image);
  values.author =
    typeof node.author === "object" && node.author
      ? strip((node.author as Record<string, unknown>).name)
      : strip(node.author);

  const ing = node.recipeIngredient ?? node.ingredients;
  if (Array.isArray(ing)) {
    values.ingredients = ing
      .map((line) => parseIngredientLine(strip(line)))
      .filter((r) => r.name)
      .map((r) => ({ ...r, isPrimary: false }));
  }
  values.steps = parseInstructions(node.recipeInstructions);
  values.sources = [url];
  return values;
}

export async function extractRecipeFromUrl(rawUrl: string, useAi = true): Promise<ExtractResult> {
  const url = rawUrl.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    return { ok: false, error: "Adresse invalide — collez une URL commençant par http(s)://." };
  }

  const page = await fetchPageHtml(url);
  if (!page.ok) return { ok: false, error: page.error };
  const html = page.html;

  // 1a. JSON-LD structured data (preferred).
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let node: Record<string, unknown> | null = null;
  for (const b of blocks) {
    try {
      const found = findRecipeNode(JSON.parse(b[1].trim()));
      if (found) {
        node = found;
        break;
      }
    } catch {
      // ignore malformed JSON-LD block
    }
  }
  // 1b. Microdata fallback (itemprop — e.g. older sites).
  if (!node) node = parseMicrodataRecipe(html);
  // 1c. Marmiton-specific JS blob (Mrtn.recipesData).
  if (!node) node = parseMrtnRecipe(html);

  // 1. Gemini-assisted parsing when enabled by the user AND a key is configured
  //    (cleaner field split). Feed the JSON-LD recipe node if present, else the
  //    cleaned page text.
  if (useAi && (await geminiConfigured())) {
    const input = node ? JSON.stringify(node) : cleanHtmlToText(html).slice(0, GEMINI_INPUT_MAX);
    if (input.trim().length > 40) {
      const g = await extractRecipeFromText(input);
      if (g.ok) {
        const values = geminiRecipeToValues(g.recipe, url);
        // Preserve image from pre-parsed node (Gemini doesn't return image URLs)
        if (!values.imageUrl && node) values.imageUrl = parseImage(node.image);
        if (values.title || values.ingredients.length || values.steps.length) {
          return { ok: true, values };
        }
      }
    }
  }

  // 2. Fallback: structured JSON-LD parser (heuristic ingredient split).
  if (node) {
    const values = mapRecipeNode(node, url);
    if (values.title || values.ingredients.length || values.steps.length) {
      return { ok: true, values };
    }
  }

  // 3. Minimal fallback: at least pre-fill the title (og:title / <title> / <h1>)
  //    so the user can finish by hand, with the source kept.
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = strip(og?.[1] ?? h1?.[1] ?? titleTag?.[1]);
  if (title) {
    const values = emptyValues();
    values.title = title;
    values.sources = [url];
    return { ok: true, values };
  }

  return { ok: false, error: "Aucune recette structurée détectée sur cette page." };
}

const numStr = (n: number | null | undefined): string =>
  typeof n === "number" && Number.isFinite(n) ? String(n) : "";

/** Maps a Gemini structured recipe onto the editable form values. */
function geminiRecipeToValues(r: GeminiRecipe, source: string): RecipeFormValues {
  const values = emptyValues();
  values.title = (r.title ?? "").trim();
  values.description = (r.description ?? "").trim();
  values.servings = numStr(r.servings);
  values.prepTime = numStr(r.prepTime);
  values.cookTime = numStr(r.cookTime);
  values.restTime = numStr(r.restTime);
  values.ingredients = (r.ingredients ?? [])
    .map((i) => ({
      name: (i.name ?? "").trim(),
      quantity: numStr(i.quantity),
      unit: (i.unit ?? "").trim(),
      isPrimary: false,
    }))
    .filter((i) => i.name);
  values.steps = (r.steps ?? []).map((s) => s.trim()).filter(Boolean);
  values.sources = [source];
  return values;
}

/**
 * Photo scan: read the uploaded image(s), send them to Gemini (server-side) and
 * map the structured recipe back onto the editable form. Source = "Photo importée".
 */
export async function extractRecipeFromImagesAction(formData: FormData): Promise<ExtractResult> {
  const files = formData.getAll("image").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Ajoutez au moins une photo." };

  let images: GeminiImage[];
  try {
    images = await Promise.all(
      files.map(async (f) => ({
        mimeType: f.type || "image/jpeg",
        base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      })),
    );
  } catch {
    return { ok: false, error: "Lecture des images impossible." };
  }

  const res = await extractRecipeFromImages(images);
  if (!res.ok) return res;

  const values = geminiRecipeToValues(res.recipe, "Photo importée");
  if (!values.title && !values.ingredients.length && !values.steps.length) {
    return { ok: false, error: "Aucune recette détectée sur la photo." };
  }
  return { ok: true, values };
}
