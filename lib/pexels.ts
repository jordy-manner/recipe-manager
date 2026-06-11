// Pexels image lookup — server-only. The API key stays in the environment
// (PEXELS_API_KEY) and is never exposed to the client. Responses are cached in
// Next's Data Cache (revalidate weekly), so even dynamic pages hit Pexels once
// per query. Returns null when unset/unavailable → callers fall back to the
// gradient placeholder (RecipePhoto).

import { PEXELS_EN } from "@/lib/seasons-data";

/** Builds the (English) Pexels query for a produce item. */
export function produceQuery(slug: string, name: string): string {
  return `${PEXELS_EN[slug] ?? name} fresh food`;
}

/** Returns a photo URL for the query, or null. */
export async function pexelsImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query,
    )}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 604800 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      photos?: { src?: { large?: string; medium?: string } }[];
    };
    const src = json.photos?.[0]?.src;
    return src?.large ?? src?.medium ?? null;
  } catch {
    return null;
  }
}

/** Resolves a produce image: custom `image` first, then Pexels, else null. */
export async function produceImage(p: {
  slug: string;
  name: string;
  image?: string;
}): Promise<string | null> {
  if (p.image) return p.image;
  return pexelsImage(produceQuery(p.slug, p.name));
}
