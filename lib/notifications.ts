// Notification center ("À traiter") — derived server-side signals, no stored
// table. Aggregates: catalog entries still to complete (ingredients without
// aisle/default unit, units without abbreviation/kind — same derivation as
// /parametres, lot 2), stale seasonal data, and (extensible) recipes without a
// photo. Wrapped in React cache() so the root layout and the /parametres layout
// share one computation per request.
//
// Server-only (imports prisma). The bell badge counts the `todo` signals; the
// `info` signals are shown but not counted.

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSetting, SETTING_KEYS } from "@/lib/settings";
import type { IconName } from "@/app/components/icons";

export type NotifKind = "todo" | "info";

export type NotifItem = {
  kind: NotifKind;
  icon: IconName;
  label: string;
  sub: string;
  href: string;
};

export type Notifications = {
  items: NotifItem[];
  /** Actionable count shown on the bell badge (todo signals only). */
  todoCount: number;
  /** Per-section "to complete" counts, for the /parametres rail dots. */
  sectionCounts: { ingredients: number; unites: number };
};

const EMPTY: Notifications = {
  items: [],
  todoCount: 0,
  sectionCounts: { ingredients: 0, unites: 0 },
};

// How many individual entries to list per catalog section in the panel (the
// full counts still drive the badge + the "Tout voir" footer).
const LIST_CAP = 4;
// Seasonal data is considered stale after this many days without a check.
const SEASON_STALE_DAYS = 30;

function ingredientSub(i: { aisle: string | null; defaultUnitId: string | null }): string {
  const missing: string[] = [];
  if (!i.aisle) missing.push("rayon");
  if (!i.defaultUnitId) missing.push("unité par défaut");
  return `${missing.join(" et ").replace(/^./, (c) => c.toUpperCase())} à renseigner`;
}

function unitSub(u: { abbreviation: string | null; kind: string | null }): string {
  const missing: string[] = [];
  if (!u.abbreviation) missing.push("abréviation");
  if (!u.kind) missing.push("type");
  return `${missing.join(" et ").replace(/^./, (c) => c.toUpperCase())} à renseigner`;
}

export const getNotifications = cache(async (): Promise<Notifications> => {
  try {
    const [ingredients, units, seasonChecked, noPhoto] = await Promise.all([
      prisma.ingredient.findMany({
        where: { OR: [{ aisle: null }, { defaultUnitId: null }] },
        select: { id: true, name: true, aisle: true, defaultUnitId: true },
        orderBy: { name: "asc" },
      }),
      prisma.unit.findMany({
        where: { OR: [{ abbreviation: null }, { kind: null }] },
        select: { id: true, name: true, abbreviation: true, kind: true },
        orderBy: { name: "asc" },
      }),
      getSetting(SETTING_KEYS.seasonLastChecked),
      prisma.recipe.count({ where: { imageUrl: null } }),
    ]);

    const items: NotifItem[] = [];

    for (const i of ingredients.slice(0, LIST_CAP)) {
      items.push({
        kind: "todo",
        icon: "carrot",
        label: i.name,
        sub: ingredientSub(i),
        href: `/parametres/ingredients#row-${i.id}`,
      });
    }
    for (const u of units.slice(0, LIST_CAP)) {
      items.push({
        kind: "todo",
        icon: "ruler",
        label: u.name,
        sub: unitSub(u),
        href: `/parametres/unites#row-${u.id}`,
      });
    }

    // Seasonal data freshness (info).
    const lastMs = seasonChecked ? Date.parse(seasonChecked) : NaN;
    const stale =
      Number.isNaN(lastMs) || Date.now() - lastMs > SEASON_STALE_DAYS * 86_400_000;
    if (stale) {
      items.push({
        kind: "info",
        icon: "leaf",
        label: "Données de saison",
        sub: "Mise à jour des sources disponible",
        href: "/parametres/saisons",
      });
    }

    // Recipes without a photo (info, aggregated).
    if (noPhoto > 0) {
      items.push({
        kind: "info",
        icon: "image",
        label: "Photos manquantes",
        sub: `${noPhoto} recette${noPhoto > 1 ? "s" : ""} sans photo`,
        href: "/recettes",
      });
    }

    return {
      items,
      todoCount: ingredients.length + units.length,
      sectionCounts: { ingredients: ingredients.length, unites: units.length },
    };
  } catch {
    return EMPTY;
  }
});
