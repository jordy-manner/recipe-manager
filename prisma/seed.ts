import { config } from "dotenv";
// Loads .env.local (secrets) then .env, like prisma.config.ts.
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { AISLES, UNIT_KINDS } from "../lib/catalog";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Catalog of common units offered in autocomplete from the start (design list).
const UNITS = [
  "g",
  "kg",
  "ml",
  "cl",
  "L",
  "c. à c.",
  "c. à s.",
  "pièce(s)",
  "tranche(s)",
  "gousse(s)",
  "pincée",
  "poignée",
  "sachet",
  "verre",
];

// Default unit family ("type") for each standard unit, used to seed the
// UnitType referential link (matches the UNIT_KINDS list in lib/catalog).
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

// Maps the prototype's categories to our catalog.
const CATEGORY_OF: Record<string, string> = {
  Plat: "Plat de résistance",
  Entrée: "Entrée",
  Dessert: "Dessert",
  "Petit-déj": "Préparation",
  Apéro: "Apéritif",
};

// Normalizes a few unit spellings to the catalog.
const UNIT_ALIAS: Record<string, string> = {
  gousses: "gousse(s)",
  gousse: "gousse(s)",
  tranches: "tranche(s)",
  tranche: "tranche(s)",
  pièces: "pièce(s)",
  pièce: "pièce(s)",
};

/** Splits a "400 g" / "2 gousses" / "1,2 kg" string into { quantity, unit }. */
function parseQ(q: string): { quantity: number | null; unit: string | null } {
  const m = q.match(/^\s*([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (!m) return { quantity: null, unit: q.trim() || null };
  const quantity = Number(m[1].replace(",", "."));
  const rawUnit = m[2].trim();
  const unit = UNIT_ALIAS[rawUnit] ?? rawUnit;
  return { quantity: Number.isFinite(quantity) ? quantity : null, unit: unit || null };
}

type SeedRecipe = {
  slug: string;
  title: string;
  cat: string;
  tags: string[];
  difficulty: number | null;
  prep: number | null;
  cook: number | null;
  rest?: number | null;
  serves: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  blurb: string | null;
  author: string | null;
  rating: number | null;
  popular: boolean;
  ingredients: { q: string; n: string }[];
  utensils?: { name: string; quantity: number }[];
  steps: string[];
};

// The 9 example recipes from the design prototype (recettes/data.js).
const RECIPES: SeedRecipe[] = [
  {
    slug: "ragout-tomate",
    title: "Ragoût de pois chiches à la tomate",
    cat: "Plat",
    tags: ["Végé", "Sans gluten"],
    difficulty: 1,
    prep: 15,
    cook: 35,
    serves: 4,
    kcal: 420,
    protein: 18,
    carbs: 52,
    fat: 14,
    blurb: "Un mijoté réconfortant et économique, parfumé au cumin et au paprika fumé.",
    author: "Camille R.",
    rating: 4.8,
    popular: true,
    ingredients: [
      { q: "400 g", n: "pois chiches cuits" },
      { q: "800 g", n: "tomates concassées" },
      { q: "1", n: "oignon jaune" },
      { q: "2 gousses", n: "ail" },
      { q: "1 c. à c.", n: "cumin moulu" },
      { q: "1 c. à c.", n: "paprika fumé" },
      { q: "2 c. à s.", n: "huile d'olive" },
      { q: "1 poignée", n: "coriandre fraîche" },
    ],
    steps: [
      "Émincer l'oignon et l'ail, faire revenir dans l'huile d'olive jusqu'à coloration.",
      "Ajouter les épices, laisser torréfier 30 secondes en remuant.",
      "Verser les tomates concassées et les pois chiches égouttés.",
      "Laisser mijoter 30 minutes à feu doux, saler et poivrer.",
      "Servir parsemé de coriandre fraîche, avec du riz ou du pain.",
    ],
  },
  {
    slug: "risotto-champignons",
    title: "Risotto crémeux aux champignons",
    cat: "Plat",
    tags: ["Végé"],
    difficulty: 2,
    prep: 10,
    cook: 30,
    serves: 4,
    kcal: 540,
    protein: 14,
    carbs: 68,
    fat: 20,
    blurb: "Le grand classique italien, riz nacré et champignons poêlés au beurre.",
    author: "Léo M.",
    rating: 4.6,
    popular: true,
    ingredients: [
      { q: "320 g", n: "riz arborio" },
      { q: "400 g", n: "champignons de Paris" },
      { q: "1 L", n: "bouillon de légumes" },
      { q: "10 cl", n: "vin blanc sec" },
      { q: "1", n: "échalote" },
      { q: "50 g", n: "parmesan râpé" },
      { q: "40 g", n: "beurre" },
    ],
    steps: [
      "Faire chauffer le bouillon et le maintenir frémissant.",
      "Suer l'échalote, ajouter le riz et nacrer 2 minutes.",
      "Déglacer au vin blanc, puis ajouter le bouillon louche par louche.",
      "Poêler les champignons à part, les incorporer en fin de cuisson.",
      "Hors du feu, ajouter beurre et parmesan, mélanger énergiquement.",
    ],
  },
  {
    slug: "tarte-citron",
    title: "Tarte au citron meringuée",
    cat: "Dessert",
    tags: ["Végé"],
    difficulty: 3,
    prep: 40,
    cook: 30,
    serves: 8,
    kcal: 380,
    protein: 6,
    carbs: 48,
    fat: 18,
    blurb: "Pâte sablée, crème au citron acidulée et meringue dorée au chalumeau.",
    author: "Inès D.",
    rating: 4.9,
    popular: true,
    ingredients: [
      { q: "250 g", n: "farine" },
      { q: "125 g", n: "beurre" },
      { q: "4", n: "citrons jaunes" },
      { q: "5", n: "œufs" },
      { q: "200 g", n: "sucre" },
      { q: "1 pincée", n: "sel" },
    ],
    steps: [
      "Préparer la pâte sablée, foncer un moule et cuire à blanc 20 min.",
      "Réaliser la crème au citron sur feu doux jusqu'à épaississement.",
      "Garnir le fond de tarte et laisser prendre au frais.",
      "Monter les blancs en meringue avec le sucre.",
      "Pocher la meringue sur la tarte et dorer au chalumeau.",
    ],
  },
  {
    slug: "buddha-bowl",
    title: "Buddha bowl quinoa & avocat",
    cat: "Plat",
    tags: ["Végé", "Sans gluten", "Healthy"],
    difficulty: 1,
    prep: 20,
    cook: 15,
    serves: 2,
    kcal: 480,
    protein: 16,
    carbs: 54,
    fat: 22,
    blurb: "Bol complet et coloré : quinoa, légumes rôtis, avocat et sauce tahini.",
    author: "Camille R.",
    rating: 4.5,
    popular: false,
    ingredients: [
      { q: "150 g", n: "quinoa" },
      { q: "1", n: "avocat" },
      { q: "1", n: "patate douce" },
      { q: "100 g", n: "pois chiches rôtis" },
      { q: "2 c. à s.", n: "tahini" },
      { q: "1", n: "citron vert" },
    ],
    steps: [
      "Cuire le quinoa et rôtir la patate douce en dés au four.",
      "Préparer la sauce tahini avec le citron vert et un peu d'eau.",
      "Dresser le bol : quinoa, légumes, avocat, pois chiches.",
      "Napper de sauce et servir.",
    ],
  },
  {
    slug: "pancakes",
    title: "Pancakes moelleux du dimanche",
    cat: "Petit-déj",
    tags: ["Végé", "Rapide"],
    difficulty: 1,
    prep: 10,
    cook: 15,
    serves: 4,
    kcal: 310,
    protein: 9,
    carbs: 44,
    fat: 10,
    blurb: "Épais et aériens, parfaits avec du sirop d'érable et des fruits rouges.",
    author: "Léo M.",
    rating: 4.7,
    popular: true,
    ingredients: [
      { q: "200 g", n: "farine" },
      { q: "2", n: "œufs" },
      { q: "25 cl", n: "lait" },
      { q: "1 sachet", n: "levure chimique" },
      { q: "2 c. à s.", n: "sucre" },
      { q: "1 pincée", n: "sel" },
    ],
    steps: [
      "Mélanger les ingrédients secs, puis incorporer œufs et lait.",
      "Laisser reposer la pâte 10 minutes.",
      "Cuire de petites louches dans une poêle chaude légèrement beurrée.",
      "Retourner dès que des bulles apparaissent en surface.",
    ],
  },
  {
    slug: "houmous",
    title: "Houmous maison onctueux",
    cat: "Apéro",
    tags: ["Végé", "Sans gluten", "Rapide"],
    difficulty: 1,
    prep: 10,
    cook: 0,
    serves: 6,
    kcal: 180,
    protein: 6,
    carbs: 16,
    fat: 11,
    blurb: "Crémeux à souhait, relevé au cumin et à l'huile d'olive de qualité.",
    author: "Inès D.",
    rating: 4.4,
    popular: false,
    ingredients: [
      { q: "400 g", n: "pois chiches cuits" },
      { q: "3 c. à s.", n: "tahini" },
      { q: "1", n: "citron" },
      { q: "1 gousse", n: "ail" },
      { q: "4 c. à s.", n: "huile d'olive" },
      { q: "1 c. à c.", n: "cumin" },
    ],
    steps: [
      "Mixer tous les ingrédients jusqu'à obtenir une texture lisse.",
      "Détendre avec un peu d'eau glacée si nécessaire.",
      "Dresser, arroser d'huile d'olive et saupoudrer de paprika.",
    ],
  },
  {
    slug: "boeuf-bourguignon",
    title: "Bœuf bourguignon traditionnel",
    cat: "Plat",
    tags: ["Mijoté"],
    difficulty: 3,
    prep: 30,
    cook: 180,
    serves: 6,
    kcal: 620,
    protein: 42,
    carbs: 18,
    fat: 32,
    blurb: "Viande fondante mijotée des heures au vin rouge, lardons et champignons.",
    author: "Marcel B.",
    rating: 4.9,
    popular: true,
    ingredients: [
      { q: "1,2 kg", n: "bœuf à braiser" },
      { q: "75 cl", n: "vin rouge" },
      { q: "200 g", n: "lardons" },
      { q: "300 g", n: "champignons" },
      { q: "3", n: "carottes" },
      { q: "2", n: "oignons" },
      { q: "1", n: "bouquet garni" },
    ],
    steps: [
      "Faire mariner la viande dans le vin avec les aromates (idéalement la veille).",
      "Saisir la viande, faire revenir lardons et garniture.",
      "Mouiller avec la marinade, mijoter 3 h à couvert.",
      "Ajouter les champignons poêlés en fin de cuisson.",
      "Rectifier l'assaisonnement et servir bien chaud.",
    ],
  },
  {
    slug: "salade-cesar",
    title: "Salade César au poulet croustillant",
    cat: "Entrée",
    tags: ["Rapide"],
    difficulty: 2,
    prep: 20,
    cook: 15,
    serves: 4,
    kcal: 450,
    protein: 34,
    carbs: 22,
    fat: 26,
    blurb: "Salade craquante, poulet doré, croûtons maison et sauce César crémeuse.",
    author: "Léo M.",
    rating: 4.3,
    popular: false,
    ingredients: [
      { q: "2", n: "cœurs de romaine" },
      { q: "2", n: "filets de poulet" },
      { q: "50 g", n: "parmesan" },
      { q: "4 tranches", n: "pain" },
      { q: "1", n: "jaune d'œuf" },
      { q: "2", n: "filets d'anchois" },
    ],
    steps: [
      "Cuire le poulet assaisonné à la poêle, le trancher.",
      "Préparer les croûtons au four avec un filet d'huile.",
      "Émulsionner la sauce César.",
      "Assembler salade, poulet, croûtons et copeaux de parmesan.",
    ],
  },
  {
    slug: "soupe-potimarron",
    title: "Velouté de potimarron au gingembre",
    cat: "Entrée",
    tags: ["Végé", "Sans gluten", "Healthy"],
    difficulty: 1,
    prep: 15,
    cook: 25,
    serves: 4,
    kcal: 210,
    protein: 5,
    carbs: 28,
    fat: 9,
    blurb: "Velouté de saison réconfortant, relevé d'une pointe de gingembre frais.",
    author: "Inès D.",
    rating: 4.6,
    popular: false,
    ingredients: [
      { q: "1", n: "potimarron" },
      { q: "1", n: "pomme de terre" },
      { q: "1", n: "oignon" },
      { q: "2 cm", n: "gingembre frais" },
      { q: "20 cl", n: "crème de coco" },
      { q: "1 L", n: "bouillon" },
    ],
    steps: [
      "Faire revenir l'oignon et le gingembre.",
      "Ajouter le potimarron et la pomme de terre en cubes.",
      "Mouiller avec le bouillon et cuire 25 minutes.",
      "Mixer finement avec la crème de coco, assaisonner.",
    ],
  },
  {
    slug: "pate-a-pizza",
    title: "Pâte à Pizza",
    cat: "Préparation",
    tags: ["Pâte"],
    difficulty: 1,
    prep: null,
    cook: null,
    rest: 1560, // ~2h proofing + 24h+ cold rest
    serves: 6,
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
    blurb: null,
    author: null,
    rating: null,
    popular: false,
    ingredients: [
      { q: "590 g", n: "Eau" },
      { q: "30 g", n: "Sel fin" },
      { q: "0,5 cube", n: "Levure de boulanger" },
      { q: "1 cuillère à café", n: "Sucre ou miel" },
      { q: "1 kg", n: "Farine T0" },
    ],
    utensils: [
      { name: "Balance de cuisine", quantity: 1 },
      { name: "Saladier", quantity: 1 },
    ],
    steps: [
      "Réserver dans un bol à part 20g d'eau et verser le sucre et la levure émiettée",
      "Verser le reste d'eau dans un grand plat et y dissoudre le sel en mélangeant en conséquence",
      "Ajouter environ 100g (1/10ème) de farine tamisée puis mélanger vigoureusement à la fourchette pour éviter les grumeaux",
      "Verser le mélange d'eau, sucre et levure et mélanger",
      "Ajouter le reste de farine en 3 ou 4 fois, en mélangeant à chaque itération",
      "Déposer ensuite la pâte sur le plan de travail et pétrir pendant 10 à 15 min. La température idéale de la pâte doit être entre 24 et 26°c. \r\nElle doit avoir formé un beau réseau de gluten, c'est à dire qu'elle doit être suffisamment élastique pour formé un voile transparent quand on l'étire",
      "Former une boule et laisser reposer 2h sous un torchon humide",
      "Faire des pâtons de 250g et réserver entre 24 et 72h au frigo",
    ],
  },
];

async function main() {
  // Editable referentials feeding the catalog dropdowns (managed from
  // /parametres/{rayons,types-unite}). Seeded first so units can connect their
  // type below.
  for (const name of AISLES) {
    await prisma.aisle.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of UNIT_KINDS) {
    await prisma.unitType.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of UNITS) {
    const typeName = UNIT_TYPE_OF[name];
    const type = typeName ? { type: { connect: { name: typeName } } } : {};
    await prisma.unit.upsert({ where: { name }, update: type, create: { name, ...type } });
  }
  for (const name of UTENSILS) {
    await prisma.utensil.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Example recipes: delete-then-create by slug so the seed stays idempotent.
  for (const r of RECIPES) {
    await prisma.recipe.deleteMany({ where: { slug: r.slug } });
    const categoryName = CATEGORY_OF[r.cat] ?? r.cat;
    await prisma.recipe.create({
      data: {
        slug: r.slug,
        title: r.title,
        description: r.blurb,
        difficulty: r.difficulty,
        prepTime: r.prep,
        cookTime: r.cook,
        restTime: r.rest ?? null,
        servings: r.serves,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        author: r.author,
        rating: r.rating,
        popular: r.popular,
        recipeSteps: {
          create: r.steps.map((content, order) => ({ content, order })),
        },
        recipeCategories: {
          create: [
            {
              position: 0,
              category: {
                connectOrCreate: {
                  where: { name: categoryName },
                  create: { name: categoryName },
                },
              },
            },
          ],
        },
        recipeTags: {
          create: r.tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
        recipeIngredients: {
          create: r.ingredients.map((ing, position) => {
            const { quantity, unit } = parseQ(ing.q);
            return {
              position,
              quantity,
              ingredient: {
                connectOrCreate: { where: { name: ing.n }, create: { name: ing.n } },
              },
              ...(unit
                ? {
                    unit: {
                      connectOrCreate: { where: { name: unit }, create: { name: unit } },
                    },
                  }
                : {}),
            };
          }),
        },
        ...(r.utensils && r.utensils.length
          ? {
              recipeUtensils: {
                create: r.utensils.map((u, position) => ({
                  position,
                  quantity: u.quantity,
                  utensil: {
                    connectOrCreate: { where: { name: u.name }, create: { name: u.name } },
                  },
                })),
              },
            }
          : {}),
      },
    });
  }

  console.log(
    `Seed terminé : ${UNITS.length} unités, ${UTENSILS.length} ustensiles, ${CATEGORIES.length} catégories et ${RECIPES.length} recettes garantis.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
