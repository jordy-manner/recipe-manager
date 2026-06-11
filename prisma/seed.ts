import { config } from "dotenv";
// Loads .env.local (secrets) then .env, like prisma.config.ts.
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Catalog of common units offered in autocomplete from the start.
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

// Catalog of recipe categories (a recipe can have several).
const CATEGORIES = [
  "Plat de résistance",
  "Entrée",
  "Dessert",
  "Accompagnement",
  "Apéritif",
  "Préparation",
];

// "<base> <size> cm" variant for utensils whose diameter matters
// (dishes, saucepans, frying pans, crepe pans, molds…).
const sizes = (base: string, diametres: number[]) =>
  diametres.map((d) => `${base} ${d} cm`);

// Catalog of basic kitchen utensils. Containers/cookware whose size matters are
// expanded by diameter — adjust as needed.
const UTENSILS = [
  // Small basic utensils
  "Cuillère en bois",
  "Fouet",
  "Spatule",
  "Maryse",
  "Louche",
  "Écumoire",
  "Couteau de chef",
  "Couteau d'office",
  "Économe",
  "Planche à découper",
  "Râpe",
  "Mandoline",
  "Passoire",
  "Chinois",
  "Saladier",
  "Cul-de-poule",
  "Balance de cuisine",
  "Verre doseur",
  "Rouleau à pâtisserie",
  "Pinceau de cuisine",
  "Presse-ail",
  "Presse-agrumes",
  "Minuteur",
  "Thermomètre de cuisine",
  "Robot pâtissier",
  "Batteur électrique",
  "Mixeur plongeant",
  "Blender",
  "Grille de refroidissement",
  "Emporte-pièce",
  // Molds (expanded by diameter)
  ...sizes("Moule à manqué", [18, 20, 22, 24, 26, 28]),
  ...sizes("Moule à tarte", [24, 26, 28]),
  ...sizes("Moule à cake", [24, 26, 30]),
  ...sizes("Cercle à pâtisserie", [16, 18, 20, 24]),
  "Moule à charlotte",
  "Moule à savarin",
  "Moule à muffins",
  // Containers / cookware (expanded by diameter)
  ...sizes("Casserole", [14, 16, 18, 20, 24]),
  ...sizes("Poêle", [20, 24, 26, 28, 30]),
  ...sizes("Crêpière", [24, 26, 28, 30]),
  ...sizes("Sauteuse", [24, 28]),
  ...sizes("Faitout", [20, 24]),
  ...sizes("Cocotte en fonte", [24, 28]),
  ...sizes("Plat à gratin", [20, 25, 30, 35]),
  "Wok",
  "Marmite",
];

async function main() {
  for (const name of UNITS) {
    await prisma.unit.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of UTENSILS) {
    await prisma.utensil.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(
    `Seed terminé : ${UNITS.length} unités, ${UTENSILS.length} ustensiles et ${CATEGORIES.length} catégories garantis.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
