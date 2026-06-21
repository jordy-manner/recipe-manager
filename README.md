# Sur le Plat

Toutes vos recettes dans une même coquille.

## Stack

- **Next.js 16** (App Router, Server Components & Server Actions, TypeScript)
- **TailwindCSS v4**
- **Prisma 7** + **PostgreSQL (Neon)** via driver adapter `@prisma/adapter-neon`
- **Headless UI** (champ tags en autocomplete)
- Hébergement **Vercel**

## Modèle de données

`Recipe` ↔ `Ingredient` (via `RecipeIngredient` : quantité + unité) · `Recipe` ↔ `Tag` (via `RecipeTag`) · `Unit` (catalogue). Étapes en `Json`.

## Démarrage local

```bash
npm install                 # installe + génère le client Prisma (postinstall)
cp .env .env.local          # puis renseigner DATABASE_URL (branche Neon dev) dans .env.local
npm run seed                # (optionnel) catalogue d'unités courantes
npm run dev                 # http://localhost:3000
```

- `.env` = template commité (noms de variables, sans secret). Les secrets vont dans `.env.local` (gitignoré).
- Variables : `DATABASE_URL` (Neon), `APP_RELEASE` (version affichée en footer), `APP_MAINTENANCE` / `APP_MAINTENANCE_BYPASS` (mode maintenance, cf. `proxy.ts`).

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | serveur de dev |
| `npm run build` | build de prod (local) |
| `npm run vercel-build` | `prisma migrate deploy && next build` (utilisé par Vercel) |
| `npm run seed` | seed des unités |
| `npm run lint` | ESLint |

## Environnements & déploiement

- **Branche de version** `v0.X` → **Preview** Vercel (base Neon **dev**) · **`main`** → **Production** (base Neon **prod**).
- Workflow : `preview-release` (commit + tag + push branche → Preview), `prod-release` (merge `main` + push → Production).
- Détails et mise en prod : voir **[DEPLOY.md](./DEPLOY.md)**.
