// One-off maintenance: assign the default unit family ("type", UnitType
// referential) to the standard units that still have none. Idempotent and
// non-destructive — it only fills `typeId` where it is null, never overwrites a
// manual choice and never touches recipes.
//
// Usage (DRY-RUN by default, prints what *would* change):
//   npm run assign-unit-types
// Apply for real:
//   npm run assign-unit-types -- --apply
//
// Target DB = DATABASE_URL. To run against PRODUCTION, pass the prod pooled URL
// explicitly (it wins over .env.local, which dotenv loads without overriding):
//   DATABASE_URL='postgresql://…prod-pooler…/neondb?sslmode=require' \
//     npm run assign-unit-types -- --apply

import { config } from "dotenv";
// Loads .env.local (secrets) then .env, like prisma.config.ts. An env var
// already set in the shell (e.g. a prod DATABASE_URL) is NOT overridden.
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// Default unit family for each standard unit (matches prisma/seed.ts and the
// UNIT_KINDS canonical list in lib/catalog).
const UNIT_TYPE_OF: Record<string, string> = {
  g: "Masse",
  kg: "Masse",
  ml: "Volume",
  cl: "Volume",
  L: "Volume",
  verre: "Volume",
  "c. à c.": "Cuillère/pincée",
  "c. à s.": "Cuillère/pincée",
  pincée: "Cuillère/pincée",
  "pièce(s)": "Quantité",
  "tranche(s)": "Quantité",
  "gousse(s)": "Quantité",
  poignée: "Quantité",
  sachet: "Quantité",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const types = await prisma.unitType.findMany({ select: { id: true, name: true } });
  const idOf = new Map(types.map((t) => [t.name, t.id]));

  // Units that would be touched: name is in the map AND type is still null.
  const candidates = await prisma.unit.findMany({
    where: { typeId: null, name: { in: Object.keys(UNIT_TYPE_OF) } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const missingTypes = [...new Set(Object.values(UNIT_TYPE_OF))].filter((n) => !idOf.has(n));
  if (missingTypes.length) {
    console.warn(`⚠ UnitType absents en base (ignorés) : ${missingTypes.join(", ")}`);
  }

  console.log(`Mode : ${apply ? "APPLY (écriture)" : "DRY-RUN (lecture seule)"}`);
  console.log(`Unités sans type correspondant au mapping : ${candidates.length}`);
  for (const u of candidates) console.log(`  • ${u.name} → ${UNIT_TYPE_OF[u.name]}`);

  let updated = 0;
  if (apply) {
    for (const [unitName, typeName] of Object.entries(UNIT_TYPE_OF)) {
      const typeId = idOf.get(typeName);
      if (!typeId) continue;
      const r = await prisma.unit.updateMany({
        where: { name: unitName, typeId: null },
        data: { typeId },
      });
      updated += r.count;
    }
    console.log(`✓ ${updated} unité(s) mise(s) à jour.`);
  } else if (candidates.length) {
    console.log("→ Relancer avec « -- --apply » pour appliquer.");
  }

  const recap = await prisma.unitType.findMany({
    select: { name: true, _count: { select: { units: true } } },
    orderBy: { name: "asc" },
  });
  console.log("Types (usage) :", recap.map((t) => `${t.name}=${t._count.units}`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
