// Operational seasonal-data update — shared by the manual button
// (settings-actions) and the scheduled cron (/api/cron/season-update).
//
// What it does ("source update"):
//  1. re-applies the committed dataset to the DB (Ingredient season fields:
//     slug / category / months / ecv from the committed JSON),
//  2. DERIVES the grocery aisle ("rayon") from each produce's category — only
//     where the aisle is still null, so manual edits are never clobbered,
//  3. refreshes the carbon footprint (ecv) from the live ADEME Agribalyse API
//     (best-effort: a network failure doesn't fail the whole update),
//  4. stamps `season_last_checked`.
//
// Server-only (Prisma + ADEME). The local CLI (scripts/seasonality.ts) keeps its
// own copy for dev/prod maintenance from a terminal.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAgribalyseFoods, matchEcv } from "@/lib/agribalyse";
import { setSetting, SETTING_KEYS } from "@/lib/settings";
import type { DbCategory } from "@/lib/produce";
import seasonalityJson from "@/lib/data/seasonality.json";
import carbonJson from "@/lib/data/carbon-ademe.json";

// Grocery aisle ("rayon") derived from the produce category, by Aisle name
// (resolved/created in the Aisle referential). Pulses (legumineuses) live in
// the grocery aisle (dry/canned).
const AISLE_FOR: Record<DbCategory, string> = {
  fruits: "Fruit",
  legumes: "Légume",
  herbes: "Herbe",
  legumineuses: "Épicerie",
};

type SeasonItem = { slug: string; label: string; category: DbCategory; months: number[] };

const cleanMonths = (m: number[]) =>
  [...new Set(m.filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);

export type SeasonUpdateResult = {
  imported: number;
  aisleFilled: number;
  carbonUpdated: number;
  carbonAvailable: boolean;
  lastChecked: string;
};

export async function runSeasonUpdate(
  opts: { refreshCarbon?: boolean } = {},
): Promise<SeasonUpdateResult> {
  const CARBON = (carbonJson as { ecv: Record<string, number> }).ecv;
  const ITEMS = (seasonalityJson as { items: SeasonItem[] }).items;
  const now = new Date();

  // 1. Upsert each produce by name (months / category / committed ecv).
  await Promise.all(
    ITEMS.map((it) => {
      const ecv = CARBON[it.slug] ?? null;
      const data = {
        slug: it.slug,
        category: it.category,
        months: cleanMonths(it.months),
        ecv,
        ecvSource: ecv != null ? "agribalyse" : null,
        seasonUpdatedAt: now,
      };
      return prisma.ingredient.upsert({
        where: { name: it.label },
        update: data,
        create: { name: it.label, ...data },
      });
    }),
  );
  const imported = ITEMS.length;

  // 2. Derive the aisle from the category, only where it is still unset. The
  //    aisle is a referential (Aisle): resolve/create the row by name, then
  //    point the matching produce at its id.
  const aisleResults = await Promise.all(
    (Object.entries(AISLE_FOR) as [DbCategory, string][]).map(async ([category, name]) => {
      const aisle = await prisma.aisle.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      });
      return prisma.ingredient.updateMany({
        where: { category, aisleId: null },
        data: { aisleId: aisle.id },
      });
    }),
  );
  const aisleFilled = aisleResults.reduce((sum, r) => sum + r.count, 0);

  // 3. Refresh the carbon footprint from ADEME Agribalyse (best-effort).
  let carbonUpdated = 0;
  let carbonAvailable = true;
  if (opts.refreshCarbon) {
    try {
      const foods = await getAgribalyseFoods();
      if (!foods.length) {
        carbonAvailable = false;
      } else {
        const rows = await prisma.ingredient.findMany({
          where: { category: { not: null } },
          select: { id: true, name: true, ecv: true },
        });
        const updates = rows
          .map((r) => ({ id: r.id, ecv: matchEcv(r.name, foods), prev: r.ecv }))
          .filter((u) => u.ecv != null && u.ecv !== u.prev);
        await Promise.all(
          updates.map((u) =>
            prisma.ingredient.update({
              where: { id: u.id },
              data: { ecv: u.ecv, ecvSource: "agribalyse", seasonUpdatedAt: now },
            }),
          ),
        );
        carbonUpdated = updates.length;
      }
    } catch {
      carbonAvailable = false;
    }
  }

  // 4. Stamp the last-check date + revalidate the consumers.
  const lastChecked = now.toISOString();
  await setSetting(SETTING_KEYS.seasonLastChecked, lastChecked);
  revalidatePath("/saisons");
  revalidatePath("/parametres/saisons");

  return { imported, aisleFilled, carbonUpdated, carbonAvailable, lastChecked };
}
