// Seasonality maintenance CLI. Run: `npm run seasonality -- <command>`
//   import                 seed/refresh seasonal data on Ingredient from the
//                          committed JSON (seasonality.json + carbon-ademe.json)
//   refresh-carbon         re-fetch ecv from ADEME Agribalyse for seasonal items
//   set <slug> [flags]     edit one produce (--label --category --months --ecv)
//                          months as a CSV ("6,7,8"); category: fruits|legumes|
//                          herbes|legumineuses
//   export [--out FILE]    dump seasonal produce to JSON (backup), default stdout
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { writeFileSync } from "node:fs";
import seasonalityJson from "../lib/data/seasonality.json";
import carbonJson from "../lib/data/carbon-ademe.json";
import { getAgribalyseFoods, matchEcv } from "../lib/agribalyse";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

type Category = "fruits" | "legumes" | "herbes" | "legumineuses";
const CATEGORIES = new Set<Category>(["fruits", "legumes", "herbes", "legumineuses"]);
const months = (m: number[]) =>
  [...new Set(m.filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);

const CARBON = (carbonJson as { ecv: Record<string, number> }).ecv;
const ITEMS = (seasonalityJson as { items: { slug: string; label: string; category: Category; months: number[] }[] })
  .items;

/** Seed/refresh Ingredient season fields from the committed JSON (upsert by name). */
async function importJson() {
  let n = 0;
  for (const it of ITEMS) {
    const ecv = CARBON[it.slug] ?? null;
    const data = {
      slug: it.slug,
      category: it.category,
      months: months(it.months),
      ecv,
      ecvSource: ecv != null ? "agribalyse" : null,
      seasonUpdatedAt: new Date(),
    };
    await prisma.ingredient.upsert({
      where: { name: it.label },
      update: data,
      create: { name: it.label, ...data },
    });
    n++;
  }
  console.log(`✓ import: ${n} produits seedés/à jour (ecv: ${Object.keys(CARBON).length} couverts)`);
}

/** Re-fetch ecv from Agribalyse for every seasonal ingredient. */
async function refreshCarbon() {
  const foods = await getAgribalyseFoods();
  if (!foods.length) {
    console.error("✗ Agribalyse indisponible (réseau ?)");
    process.exit(1);
  }
  const rows = await prisma.ingredient.findMany({ where: { category: { not: null } } });
  let updated = 0;
  for (const r of rows) {
    const ecv = matchEcv(r.name, foods);
    if (ecv != null && ecv !== r.ecv) {
      await prisma.ingredient.update({
        where: { id: r.id },
        data: { ecv, ecvSource: "agribalyse", seasonUpdatedAt: new Date() },
      });
      updated++;
    }
  }
  console.log(`✓ refresh-carbon: ${updated}/${rows.length} ecv mis à jour depuis Agribalyse`);
}

/** Edit one produce by slug (creating the Ingredient if needed). */
async function setOne(slug: string, flags: Record<string, string>) {
  if (!slug) throw new Error("usage: set <slug> [--label --category --months --ecv]");
  const data: Record<string, unknown> = { seasonUpdatedAt: new Date() };
  if (flags.category) {
    if (!CATEGORIES.has(flags.category as Category)) throw new Error(`category invalide: ${flags.category}`);
    data.category = flags.category;
  }
  if (flags.months) data.months = months(flags.months.split(",").map((s) => Number(s.trim())));
  if (flags.ecv) {
    data.ecv = flags.ecv === "null" ? null : Number(flags.ecv);
    data.ecvSource = flags.ecv === "null" ? null : "manual";
  }
  const label = flags.label;
  const existing = await prisma.ingredient.findUnique({ where: { slug } });
  if (existing) {
    await prisma.ingredient.update({ where: { slug }, data: label ? { ...data, name: label } : data });
  } else {
    if (!label) throw new Error("produit inconnu: fournir --label pour le créer");
    await prisma.ingredient.create({ data: { name: label, slug, ...data } });
  }
  console.log(`✓ set: ${slug} mis à jour`);
}

/** Dump seasonal produce to a committable JSON (backup). */
async function exportJson(out?: string) {
  const rows = await prisma.ingredient.findMany({
    where: { category: { not: null } },
    orderBy: { slug: "asc" },
    select: { slug: true, name: true, category: true, months: true, ecv: true },
  });
  const items = rows.map((r) => ({ slug: r.slug, label: r.name, category: r.category, months: r.months }));
  const ecv: Record<string, number> = {};
  for (const r of rows) if (r.slug && r.ecv != null) ecv[r.slug] = r.ecv;
  const payload = JSON.stringify(
    { _meta: { source: "DB export (Ingredient season fields)", count: rows.length }, items, ecv },
    null,
    2,
  );
  if (out) {
    writeFileSync(out, payload + "\n");
    console.log(`✓ export: ${rows.length} produits → ${out}`);
  } else {
    console.log(payload);
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[i + 1] ?? "";
  }
  return flags;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "import":
      await importJson();
      break;
    case "refresh-carbon":
      await refreshCarbon();
      break;
    case "set":
      await setOne(rest[0], parseFlags(rest.slice(1)));
      break;
    case "export":
      await exportJson(parseFlags(rest).out);
      break;
    default:
      console.log("commandes: import | refresh-carbon | set <slug> [flags] | export [--out FILE]");
      process.exit(cmd ? 1 : 0);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
