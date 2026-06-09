import { config } from "dotenv";
// Charge .env.local (secrets) puis .env, comme prisma.config.ts.
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Catalogue d'unités courantes proposées en autocomplete dès le départ.
const UNITS = [
  "g",
  "kg",
  "ml",
  "cl",
  "l",
  "pincée",
  "cuillère à café",
  "cuillère à soupe",
  "unité",
  "tranche",
  "gousse",
  "sachet",
];

async function main() {
  for (const name of UNITS) {
    await prisma.unit.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seed terminé : ${UNITS.length} unités garanties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
