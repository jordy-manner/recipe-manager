# CONTEXT — Recipe Manager (“Marmite.”)

> Onboarding doc for humans **and** AI assistants. Kept up to date **before every
> commit** (enforced by the `preview-release` skill). If you change the data
> model, routes, architecture, or conventions, update this file in the same commit.

## What it is
A home-cooking recipe manager: browse/search recipes, view a recipe (with a
servings stepper that rescales quantities and checkable steps), and create/edit
recipes. UI is in **French**; code is in **English**.

## Stack
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (CSS-first `@theme` in `app/globals.css`, no `tailwind.config`).
- **Prisma 7** with the **Neon** serverless Postgres driver adapter (`@prisma/adapter-neon`).
  Generated client lives in `app/generated/prisma` (not the default location).
- **Cloudinary** for recipe photos, behind a swappable abstraction (`lib/media.ts`).
- **Zod** for input validation.
- Fonts via `next/font/google`: Newsreader (display/serif), Hanken Grotesk (UI),
  Spline Sans Mono (mono).

> ⚠️ This is a modified Next.js — read `node_modules/next/dist/docs/` before using
> unfamiliar Next APIs (see `AGENTS.md`).

## Data model (`prisma/schema.prisma`)
All many-to-many relations use **explicit join tables** (project convention).

- **Recipe** — `id`, `slug` (unique, URL key), `title`, `description?`, `servings?`,
  `prepTime?`, `cookTime?`, `restTime?` (minutes; total time = prep + cook + rest),
  `difficulty?` (1–3), `rating?` (0–5), `author?`,
  `popular` (bool), nutrition `kcal?/protein?/carbs?/fat?` (per serving),
  `imageUrl?` + `imagePublicId?` (Cloudinary), `createdAt`, `updatedAt`.
- **Step** — ordered prep steps: `content` (Markdown) + `order`, FK to Recipe.
- **Ingredient** / **Unit** — reusable catalogs (`name` unique).
- **RecipeIngredient** — join carrying `quantity?` (Float), `unitId?`, `position`.
- **Utensil** + **RecipeUtensil** — join carrying `quantity?` (Int), `position`.
- **Tag** + **RecipeTag** — shared tags.
- **Category** + **RecipeCategory** — a recipe may have several categories (`position`).

Catalog seed values (`prisma/seed.ts`): units, ~75 utensils, and 6 categories
(Plat de résistance, Entrée, Dessert, Accompagnement, Apéritif, Préparation),
plus **10 example recipes** (9 from the design prototype + the user’s “Pâte à Pizza”).

## Routes (App Router, all under `app/`)
User-facing routes are **in French**; the REST API stays `/api/recipes`.
- `/` — **home**: hero + search + a single featured section ("Populaires cette
  semaine", or the 4 latest as a fallback) with a "Tout voir →" link to `/recettes`.
- `/recettes` — **catalogue**: compact header + the full recipe list, with
  server-side search/filter when a query is active.
- `/recettes/[slug]` — recipe detail (lookup by `slug`).
- `/recettes/[slug]/modifier` — edit.
- `/recettes/nouvelle` — create.
- `/saisons` — **seasonal calendar**: produce in season by month (band + `?m=`),
  category/sort filters, seasonality search, and matched seasonal recipes.
- `/saisons/[slug]` — product detail: a full page that, when opened from `/saisons`,
  is shown as a **drawer** via parallel + intercepting routes (`@modal` slot +
  `@modal/(.)[slug]`). Direct visit / refresh / share renders the full page.
- `GET/POST /api/recipes`, `GET/PUT/DELETE /api/recipes/[id]` — REST mirror.

Shared list helpers (`cardInclude`, `toCard`, `MagazineGrid`, `SectionHead`,
`EmptyState`, `CardRow`) live in `app/recettes/_shared.tsx`, used by both pages.

## Architecture
- **Reads** = Server Components querying Prisma directly (`export const dynamic = "force-dynamic"`).
- **Search** is done **server-side** via `searchParams` + Prisma (keyword, by-ingredient
  scoring, category/time/difficulty filters); accent-insensitive thanks to the Postgres
  `unaccent` extension. The interactive controls are a small Client Component that updates
  the URL; results render on the server. The keyword search runs **as you type** (debounced,
  `router.replace`, no submit button); filters and category chips are always visible.
- **Writes** = typed **Server Actions** (`app/recettes/actions.ts`) validated with Zod
  (`lib/validation.ts`), then `revalidatePath`. Slugs are generated from the title and
  made unique (`slugify` + collision suffix).
- **Client Components** (`"use client"`) only where interactivity is needed: search
  controls, servings stepper, checkable steps, the dynamic form, the live preview.
  Drag-and-drop reordering of ingredients/utensils/steps uses **dnd-kit**. The
  ingredient unit is an editable combobox (`unit-combobox.tsx`, catalog + free value);
  forms submit via **positional inputs** (multiple same-named fields read by index in
  `actions.ts`), so combobox values are mirrored into hidden inputs.
- **Media**: `lib/media.ts` exposes a `MediaStore` (`upload`/`remove`). Cloudinary is the
  current backend (signed REST, no SDK); designed to add a local backend later. Degrades
  to gradient placeholders when `CLOUDINARY_*` is unset.

### Key files
- `lib/prisma.ts` — Prisma singleton (Neon adapter).
- `lib/recipes.ts` — shared types, `slugify`, Prisma-write helpers (`recipe*Create`),
  `flattenRecipe` (relations → ergonomic shapes).
- `lib/validation.ts` — Zod schema; `RecipeInput` is `z.infer` (single source of truth).
- `lib/media.ts` — media abstraction.
- `app/recettes/` — `page.tsx` (list/search), `home-screen` (search UI), `recipe-detail`,
  `recipe-form` (+ `step-editor`, `tags-combobox`), `actions.ts`, `[slug]/`, `nouvelle/`.
- `app/components/` — `icons`, `recipe-ui` (Photo/Tag/Difficulty/helpers), `recipe-card`
  (Magazine card), `top-bar`, `site-footer`.
- `app/layout.tsx` — fonts + TopBar + Footer. `app/globals.css` — design tokens.
- `app/manifest.ts`, `app/icon.svg`, `app/apple-icon.png` — favicon / PWA icons.

## Design system
Frozen variant **“Gourmand Arrondi · Terracotta · Magazine”** (handoff in `.design/`,
unversioned). Tokens in `app/globals.css` mirror `tailwind/theme.v4.css`:
`bg-bg`, `bg-surface`, `bg-surface-muted`, `text-ink`/`-soft`/`-faint`, `border-line`/`-soft`,
`bg-accent`/`-deep`/`-soft`, `text-accent-ink`, `bg-veg`/`-soft`, `rounded-input` (14px) /
`rounded-card` (22px), `shadow-card`/`-lg`, `max-w-content` (1180px), `font-display`/`-sans`/`-mono`.
Rule: **use theme tokens only**, no hardcoded values. Home recipe layout = **Magazine**
(1 full-width feature card + a 2-column grid).

## Conventions
- **Language**: code comments, `CHANGELOG.md`, commit messages, `CONTEXT.md` and `.env`
  comments are in **English**. The **UI and data stay French** (displayed text, `lang="fr"`,
  the `proxy.ts` maintenance page, ingredient/unit/utensil/category names).
- **Explicit join tables** for every M-N relation (no implicit Prisma relations).
- Derive TypeScript types from Prisma / Zod; avoid `any`.

## Environments & workflow
- Two Neon branches: **development** (local, `.env.local`) and **production** (Vercel env).
  Never develop against prod.
- **Versioning/deploy** via skills:
  - `preview-release` — commit on the version branch `vX.Y`, patch tag, push → **Vercel Preview**
    (dev DB). Also bumps `APP_RELEASE`, updates `CHANGELOG.md` and this `CONTEXT.md`.
  - `prod-release` — merge version branch → `main`, push → **Vercel Production** (prod DB).
- `vercel-build` runs `prisma migrate deploy && next build` (migrations apply on deploy).
- `npm run dev` (Turbopack). `npm run seed` seeds catalogs + example recipes.
- After a `prisma migrate`/`generate`, if dev errors with a stale client: stop dev →
  `rm -rf .next` → `npm run dev`.

## Environment variables
- `DATABASE_URL` — Neon Postgres (secret, `.env.local` / Vercel).
- `APP_RELEASE` — current git tag, shown in the footer (committed in `.env`).
- `APP_MAINTENANCE` / `APP_MAINTENANCE_BYPASS` — maintenance mode (`proxy.ts`).
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (+ optional
  `CLOUDINARY_FOLDER`) — photo uploads. Unset → gradient placeholders, upload disabled.
- `PEXELS_API_KEY` — seasonal calendar produce images (`lib/pexels.ts`, server-only,
  cached). Unset → gradient placeholders. `IMPACTCO2_API_KEY` — optional ADEME key
  (`lib/seasons.ts`); the dataset falls back to the committed snapshot in
  `lib/seasons-data.ts` when the live API is unavailable.
