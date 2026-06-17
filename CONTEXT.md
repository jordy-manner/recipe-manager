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
  `imageUrl?` + `imagePublicId?` (Cloudinary), `createdAt`, `updatedAt`,
  `seasonMode` (enum **SeasonMode** `AUTO | MANUAL | ALWAYS`, default `AUTO`) +
  `seasonMonths` (`Int[]`, the active months 1–12, used only in MANUAL mode).
- **Step** — ordered prep steps: `content` (Markdown) + `order` + `sectionId?` (FK to
  StepSection, nullable), FK to Recipe.
- **RecipeSource** — where the recipe comes from: `value` + `kind` (enum
  `SourceKind` `url | text`, derived from the value) + `position`, FK to Recipe
  (owned, like Step). Edited from the form's "Sources" section.
- **Ingredient** / **Unit** — reusable catalogs (`name` unique). Catalog fields
  edited from `/parametres`: Ingredient `aisle?` (grocery "rayon", FK to the
  **Aisle** referential), `defaultUnit?` (FK to Unit, the pre-filled unit),
  `image?` + `imagePublicId?` (custom photo, priority over the auto Pexels
  thumbnail). Unit `abbreviation?` + `type?` (family, FK to the **UnitType**
  referential). An entry is "À compléter" (derived, not stored) when a required
  field is null (ingredient: aisleId/defaultUnitId; unit: abbreviation/typeId).
  An ingredient is
  also a **seasonal produce** when it carries season fields: `slug?` (unique, URL
  key for `/saisons`), `category?` (enum `ProduceCategory` = fruits/legumes/
  herbes/legumineuses; `null` = ordinary ingredient like salt/flour),
  `months Int[]`, `ecv?` + `ecvSource?` (ADEME Agribalyse carbon),
  `seasonUpdatedAt?`. Editable from the app (Server Actions) and a CLI — this is
  the source of truth for `/saisons`.
- **IngredientSection** / **StepSection** — named groups within a recipe (e.g. "Tangzhong",
  "Pâte à pain"), owned by Recipe (title, position). Two independent sets: ingredient
  sections and step sections. Deleting a section NULLs its rows (lines are preserved).
- **RecipeIngredient** — join carrying `quantity?` (Float), `unitId?`, `position`,
  `isPrimary` (bool, default false), `sectionId?` (FK to IngredientSection, nullable):
  "main" ingredients drive AUTO seasonality.
- **Utensil** + **RecipeUtensil** — join carrying `quantity?` (Int), `position`.
  Utensil also has a catalog `image?` + `imagePublicId?` (edited from `/parametres`).
- **Setting** — server-side key/value store (`key` PK, `value`, `updatedAt`).
  Holds the Pexels + Gemini + ScraperAPI keys + seasonal-check frequency/last-check date. Secrets
  read server-side only, never sent to the client (`lib/settings.ts`).
- **Tag** + **RecipeTag** — shared tags.
- **Category** + **RecipeCategory** — a recipe may have several categories (`position`).
- **Aisle** / **UnitType** — editable referentials (`name` unique) feeding the
  catalog dropdowns: Aisle classifies ingredients (`Ingredient.aisleId`),
  UnitType groups units (`Unit.typeId`). Usage = number of related entities;
  renaming follows the id (the relation is untouched). Managed from
  `/parametres/{rayons,types-unite}` (Tag/Category likewise from
  `/parametres/{tags,categories}`).

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
- `/recettes/nouvelle` — create. Opens on a **method chooser** (`CreateFlow`,
  client): **Importer depuis le web** / **Scanner une photo** (OCR) / **Saisie
  manuelle**; the method is mirrored to `?method=`, each sub-step + the manual
  form have a "Retour aux choix" button. **Web import** is live (paste a URL →
  `extractRecipeFromUrl` server action fetches the page server-side (direct fetch;
  on a block — 403/429/503 — it retries through **ScraperAPI** when a key is set,
  never systematically); when a Gemini key is configured it sends the content to
  Gemini for clean structuring (the
  JSON-LD recipe node if present, else the cleaned page text), and otherwise falls
  back to a built-in **schema.org/Recipe** parser (JSON-LD incl. `@graph`, then a
  title fallback). Prefills title/description/ingredients/steps/times/servings/image,
  the URL added as the first source; fields stay editable). **Photo scan** uses
  **Gemini** (vision): import/shoot one or more photos → a server action sends them
  to the Gemini API which returns a **structured** recipe (title/ingredients/steps/
  times), prefilling the form (source = "Photo importée"). The image is sent to
  Google. The scan card is **enabled only when a Gemini key is configured**
  (otherwise disabled, "Clé requise"). Manual entry is the third method. The form
  carries a **Sources** section (multi URLs / free text → `RecipeSource`). Shared
  ingredient-line parsing (quantity/unit/name) lives in `lib/recipe-parse.ts`.
- `/saisons` — **seasonal calendar** (client-driven `SeasonsBrowser`, state synced
  to the URL): **multi-month selection** (`?m=6,7,8`, default = current month, an
  explicit empty set is `?m=none`) — a product shows when its months intersect the
  selection. Month **pills** + **shortcuts** (Ce mois-ci / Toute l'année / the four
  seasons / Tout effacer) live in a **removable Filters panel** (closed by default,
  with a summary + active badge; sticky on mobile). A **name search** filters the
  grid live; category **counts** derive from the current selection. A **view
  selector** switches the list between **Grille** / **Liste dense** / **Étagères**
  (default; one horizontal slider per category, arrows + swipe). Titles are dynamic
  (`en {mois}` / a season's own phrasing `au printemps`…`en hiver` / `sur N mois` /
  `cette année`). On mobile, shortcuts and categories become **custom dropdowns**
  (`Dropdown`, icons/counts/colored selection — a native `<select>` can't).
  `?cat=`, `?sort=` (A→Z / carbone) and `?view=` are also shareable. Matched
  seasonal recipes (recipes whose active months intersect the selection, ranked by
  the number of selected products they use) are computed client-side from data
  pre-resolved server-side (`seasonalRecipesData`). A recipe's active months come
  from `getRecipeActiveMonths` (`lib/seasonality.ts`): `ALWAYS` → all year;
  `MANUAL` → its `seasonMonths`; `AUTO` → the union of the in-season months of its
  **primary** ingredients (matched against the produce dataset, no runtime API).
- `/saisons/[slug]` — product detail: a full page that, when opened from `/saisons`,
  is shown as a **drawer** via parallel + intercepting routes (`@modal` slot +
  `@modal/(.)[slug]`). Direct visit / refresh / share renders the full page.
- `/menu-semaine`, `/liste-courses`, `/favoris` — secondary destinations,
  currently **stub pages** ("Bientôt disponible", `ComingSoon` component).
  Reached from the mobile "Plus" sheet / desktop "Plus" dropdown.
- `/parametres` — **settings**, a side-rail shell (`app/parametres/layout.tsx` +
  `_rail.tsx`, grouped Préférences / Catalogues / Référentiels / Données, sticky,
  active item `bg-accent-soft text-accent-ink`). `/parametres` redirects to
  `/parametres/ingredients`. Sub-routes:
  - `/parametres/general` — Pexels + **Gemini** + **ScraperAPI** keys (server
    secrets, `lib/settings`, generic `ApiKeyForm`). Gemini enables the photo-scan
    method; ScraperAPI is the web-import 403 bypass (fallback only).
  - `/parametres/apparence` — theme (clair/sombre) + accent (Terracotta/Paprika/
    Ambre/Olive), a **client preference** (localStorage), applied app-wide by
    overriding `--color-*` on `<html>` (see Design system / dark mode).
  - `/parametres/{ingredients,ustensiles,unites}` — editable **catalog tables**
    (`_catalog-table.tsx`, client): accent-insensitive search, "Toutes/À
    compléter" chips, add-on-the-fly, inline edit, usage counter ("N rec."),
    delete (blocked when used) + **merge duplicates** (reassigns the recipe
    relations in a transaction). Ingredients/utensils carry a custom `image`
    (priority over the auto Pexels thumbnail via `GET /api/pexels`). The Rayon /
    Unité par défaut / Type cells are **creatable comboboxes** (`CellCombo`, same
    "+ Créer" UX as the recipe form): typing a new value upserts it into the
    referential (or creates a Unit for "Unité par défaut") and selects it.
  - `/parametres/{rayons,types-unite,tags,categories}` — **referential editors**
    (`_ref-list.tsx`, client `RefList`): per-list search, add (focused row),
    inline rename (cascades for free — the relation follows the id), usage
    counter, delete **blocked server-side when still in use** (lock + toast).
    Server Actions in `ref-actions.ts` (create deduped accent-insensitively).
  - `/parametres/saisons` — seasonal-data status card (stats + last-check date +
    **"Mettre à jour"** button → `runSeasonUpdate`), sources list, auto-check
    frequency (Manuelle / Hebdomadaire / Mensuelle).
- `GET /api/pexels?q=` — server-side Pexels thumbnail lookup for catalog images.
- `GET /api/cron/season-update` — scheduled seasonal-data update. A single daily
  **Vercel Cron** (`vercel.json`) hits it; the route gates on the chosen frequency +
  last-check date (Manuelle → never, Hebdo → ≥ 7 d, Mensuelle → ≥ 28 d). Protected by
  `CRON_SECRET` (`Authorization: Bearer …`); a no-op 401 until that env var is set.
- `GET/POST /api/recipes`, `GET/PUT/DELETE /api/recipes/[id]` — REST mirror.

Shared list helpers (`cardInclude`, `toCard`, `MagazineGrid`, `SectionHead`,
`EmptyState`, `CardRow`) live in `app/recettes/_shared.tsx`, used by both pages.

**Navigation** is responsive. On **desktop** (≥ sm) the fixed `TopBar` holds icon
nav links (Recettes `book` / Saisons `leaf`), a **"Plus" dropdown** (`DesktopMoreMenu`,
client popover: toggle, click-outside, Escape, ↑/↓, `role="menu"`) and the "Créer
une recette" CTA, and — at the **far right** — a **notification bell**
(`NotifBell`). Accueil is reached via the logo. Under it, a global **breadcrumb**
(`Breadcrumb`, server, `≥ sm` only) shows the trail (Accueil › … › current page),
with DB-resolved labels (recipe title, produce name). On **mobile** (< sm) the top bar
collapses to the **logo only** (search is reached via the Recettes tab; the bell stays
desktop-only), the breadcrumb is hidden, and a fixed bottom **tab bar** (`MobileTabBar`,
client) takes over: Accueil · Recettes · **Créer** (raised center) · Saisons · **Plus**
(with a count badge when there are items to handle). "Plus" opens a bottom sheet whose
**Paramètres** entry carries the same count badge. The secondary destinations
(Menu de la semaine, Liste de courses, Favoris, Paramètres) are a **single source**
shared by both — `app/components/nav-data.ts` (`SHEET_GROUPS` / `SHEET_ROUTES`).
`Saisons` uses the `leaf` icon on both bars (`calendar` stays for "Menu de la semaine").

**Notification center ("À traiter").** The bell opens a panel listing **derived**
action signals (no stored table): catalog entries still to complete (ingredients
without aisle/default unit, units without abbreviation/kind — same derivation as
`/parametres`, lot 2), stale seasonal data, and recipes without a photo. Each item is a
`{ kind: 'todo'|'info', icon, label, sub, href }` linking straight to the right place
(`/parametres/{ingredients,unites,saisons}`, with a `#row-<id>` anchor that highlights
the entry via `:target`). The bell **badge counts the `todo` signals only**; `info`
signals (amber) are shown but not counted. `getNotifications()` (`lib/notifications.ts`,
wrapped in React `cache()`) computes the list + per-section counts once per request; the
root layout passes them to the bell + the mobile "Plus" badge, and the `/parametres`
layout reuses the same counts for the **rail dots** (Ingrédients / Unités).

**Widgets dock ("Widgets").** A floating kitchen-widgets launcher (`WidgetsDock`,
client, mounted in the **root layout** → present on every page, like the bell).
A round FAB (bottom-right; bottom-left clear of the mobile tab bar) expands a
**registry** of widgets (`{ id, name, desc, icon, soon? }` — today `timer` active;
`convert`/`portions`/`notes` shown disabled "à venir"); each opens in a reusable
**popin** (bottom-sheet on mobile). First widget = a **multi-timer**: a Simple
mode (min/sec steppers + presets) and an **egg-cooking** mode (boiling-water
plunge; live time from a calibrated table doneness×size + cold-fridge +60 s +
`(n−4)×15 s`). Timers run in parallel (250 ms tick), minimize to floating **pills**
with a progress ring + a count **badge** on the FAB, and on completion **beep**
(WebAudio) + **vibrate** + flash the popin ("À retirer !"). Living in the layout,
timers survive SPA navigation (no localStorage). A11y: `aria-expanded` FAB,
`role="menu"`, popin `role="dialog"` + focus-trap + Escape + click-outside.

**Pinned-chrome invariant (all pages).** Both bars live in the **root layout**
(`app/layout.tsx`), so on **every** page the header is pinned to the top (`TopBar`,
`fixed inset-x-0 top-0 z-40`) and, on mobile, the tab bar is pinned to the bottom
(`MobileTabBar`, `fixed inset-x-0 bottom-0 z-40`) — from first paint and throughout
scroll, on the home, catalogue, recipe detail/edit/create, `/saisons`, and the stub
pages alike. Keep these two components in the root layout (never per-page) so the
behaviour stays uniform; because the chrome is `fixed`, the `<body>` reserves space
with `pt-[68px]` (TopBar) `sm:pt-[108px]` (+40px breadcrumb on ≥ sm) and `pb-[…]
sm:pb-0` (mobile tab bar). The breadcrumb reads the current path from an `x-pathname`
request header set by the proxy (`proxy.ts`) — so the server `Breadcrumb` can live in
the root layout and still resolve per-route DB labels (this opts the tree into dynamic
rendering, which these pages already are).

## Architecture
- **Reads** = Server Components querying Prisma directly (`export const dynamic = "force-dynamic"`).
- **Search** is done **server-side** via `searchParams` + Prisma (keyword, by-ingredient
  scoring, category/time/difficulty filters); accent-insensitive thanks to the Postgres
  `unaccent` extension. The interactive controls are a small Client Component that updates
  the URL; results render on the server. The keyword search runs **as you type** (debounced,
  `router.replace`, no submit button). The search box + the "by ingredient" toggle stay
  visible; **category / time / difficulty** live in a collapsible **"Filtres" disclosure**
  (`app/components/filter-disclosure.tsx` — adaptive pill with active-filter summary + count
  badge + "Tout effacer", isolated panel below), the **same component used by `/saisons`**.
- **Writes** = typed **Server Actions** (`app/recettes/actions.ts`) validated with Zod
  (`lib/validation.ts`), then `revalidatePath`. Slugs are generated from the title and
  made unique (`slugify` + collision suffix).
- **Client Components** (`"use client"`) only where interactivity is needed: search
  controls, servings stepper, checkable steps, the dynamic form, the live preview.
  Drag-and-drop reordering of ingredients/utensils/steps uses **dnd-kit**. The
  ingredient / unit / utensil fields use a shared accessible combobox
  (`form-combobox.tsx`, `role="combobox"` + keyboard nav) with **on-the-fly catalog
  creation**: when the typed value matches no option, a "+ Créer « … »" row creates the
  entry via a Server Action (`catalog-actions.ts`), deduping accent-insensitively /
  plural-tolerantly (`fuzzyKey` in `lib/seasons-data`) and reusing a close match instead
  of duplicating. New ingredients/utensils keep their fields null → they surface as
  "À compléter" in `/parametres` (status derived). Creating a **unit** opens a mini-modal
  (abbreviation + type). Selecting an existing ingredient **auto-fills its default unit**
  (`Ingredient.defaultUnit`) unless the user already set the unit on that row. Forms
  submit via **positional inputs** (multiple same-named fields read by index in
  `actions.ts`); custom controls mirror their value into hidden inputs, and the recipe
  submit reconciles the catalog links via `connectOrCreate` (no duplicates).
- **Media**: `lib/media.ts` exposes a `MediaStore` (`upload`/`remove`). Cloudinary is the
  current backend (signed REST, no SDK); designed to add a local backend later. Degrades
  to gradient placeholders when `CLOUDINARY_*` is unset.

### Key files
- `lib/prisma.ts` — Prisma singleton (Neon adapter).
- `lib/recipes.ts` — shared types, `slugify`, Prisma-write helpers (`recipe*Create`),
  `flattenRecipe` (relations → ergonomic shapes).
- `lib/validation.ts` — Zod schema; `RecipeInput` is `z.infer` (single source of truth).
- `lib/seasonality.ts` — `getRecipeActiveMonths(recipe, produce)`: pure resolution of
  a recipe's in-season months (AUTO/MANUAL/ALWAYS). Ingredient↔produce name matching
  (`ingredientMatches`) lives in `lib/seasons-data.ts` (pure, client-safe).
- `lib/produce.ts` — DB-row → `Produce` mapper + category enum↔French-label maps +
  `PRODUCE_FALLBACK` (the committed `lib/data/seasonality.json` + `carbon-ademe.json`,
  used only before the DB is seeded, and as the CLI seed source).
- `lib/seasons.ts` — `getProduce()` reads the **DB** (`Ingredient` rows with a
  `category`), falling back to `PRODUCE_FALLBACK` when none; + recipe↔produce matching.
- `lib/produce-actions.ts` — Server Actions to manage seasonal produce from the app:
  `listProduce`, `upsertProduce`, `removeProduce`, `suggestEcv` (Agribalyse pre-fill).
  This is the contract consumed by the `/parametres` produce editor.
- `lib/agribalyse.ts` — ADEME Agribalyse carbon lookup (`fetchAgribalyseEcv`), used by
  the upsert action + the CLI; admin-time only (never on `/saisons` reads).
- `scripts/seasonality.ts` — CLI (`npm run seasonality -- <cmd>`): `import` (seed from
  the JSON), `refresh-carbon` (Agribalyse), `set <slug>` (edit one), `export` (backup).
- `scripts/assign-unit-types.ts` — maintenance CLI (`npm run assign-unit-types`):
  fills the default `UnitType` for standard units lacking one (dry-run by default,
  `-- --apply` to write; non-destructive, recipe-safe). Target prod by passing its
  pooled `DATABASE_URL` inline.
- `lib/media.ts` — media abstraction.
- `lib/catalog.ts` — **client-safe** catalog helpers (`norm` accent-insensitive,
  row types incl. `RefRow`, incomplete derivations). `AISLES` / `UNIT_KINDS` are
  now **seed defaults only** (the Aisle/UnitType referentials) — runtime options
  come from the DB and validation is enforced by the FKs.
- `lib/settings.ts` — server-side `Setting` read/write; `getPexelsKey` (DB then
  env), `pexelsConfigured`, season frequency.
- `lib/season-sources.ts` — referenced seasonal sources + `getSeasonStats` (DB).
- `lib/season-update.ts` — `runSeasonUpdate()`: the operational seasonal update
  (re-apply dataset → derive aisles from category → refresh ADEME carbon → stamp date),
  shared by the manual button (`updateSeasonData`) and the cron route.
- `app/parametres/` — `layout.tsx` + `_rail.tsx`/`_nav.ts` (rail), per-section
  pages, `_catalog-table.tsx` (reusable editor + `CellCombo` creatable cells),
  `_ref-list.tsx` (reusable referential editor `RefList`), `actions.ts` (catalog
  CRUD + merge + image), `ref-actions.ts` (Aisle/UnitType/Tag/Category CRUD +
  `createUnitNamed` for the default-unit combobox), `settings-actions.ts`
  (Pexels key, season job), `_general-form.tsx`, `_apparence-controls.tsx`,
  `_season-data.tsx`.
- `app/components/theme.ts` + `theme-script.tsx` — theme/accent tokens + the
  before-paint bootstrap (applies the saved preference, no FOUC).
- `app/recettes/` — `page.tsx` (list/search), `home-screen` (search UI), `recipe-detail`,
  `recipe-form` (+ `step-editor`, `tags-combobox`, `form-combobox` = shared combobox +
  unit-create modal), `actions.ts`, `catalog-actions.ts` (on-the-fly catalog creation),
  `[slug]/`, `nouvelle/` (`create-flow` = method chooser + web-crawl sub-step),
  `import-actions.ts` (`extractRecipeFromUrl`: server-side fetch + schema.org/Recipe parsing).
- `lib/recipe-parse.ts` — client-safe ingredient-line parser (quantity/unit/name),
  used by the web-crawl import path.
- `lib/gemini.ts` — server-only Gemini (Generative Language) REST client:
  `extractRecipeFromImages` (photos) + `extractRecipeFromText` (web page content),
  both → structured recipe JSON. Key + model from `lib/settings` (`getGeminiKey`,
  `GEMINI_MODEL`).
- `app/components/` — `icons`, `recipe-ui` (Photo/Tag/Difficulty/helpers), `recipe-card`
  (Magazine card), `top-bar`, `mobile-tab-bar` (bottom nav + "Plus" sheet),
  `nav-more-menu` (desktop "Plus" dropdown), `nav-data` (shared secondary-nav data),
  `breadcrumb` (global server breadcrumb, ≥ sm), `notif-bell` (notification bell + panel),
  `widgets-dock` (floating kitchen-widgets dock + timer engine, client, in the root layout),
  `filter-disclosure` (shared "Filtres" pill + collapsible panel, used by /recettes + /saisons),
  `coming-soon` (stub page), `loader` (page-transition logo loader), `site-footer`.
- `lib/notifications.ts` — `getNotifications()` (cache()'d): derived "À traiter" signals +
  per-section counts, consumed by the bell, the mobile "Plus" badge, and the settings rail.
- `app/loading.tsx` — root navigation fallback (Suspense): renders `<Loader>` in the
  content area during route transitions that actually suspend (the nav chrome stays).
- `app/layout.tsx` — fonts + TopBar + Footer. `app/globals.css` — design tokens (`@theme`).
- `DESIGN.md` — design-system source of truth (mirrors `@theme`); `scripts/check-design.mjs`
  (`npm run check:design`, run in `vercel-build`) fails if the two diverge.
- `app/manifest.ts`, `app/icon.svg`, `app/apple-icon.png` — favicon / PWA icons.

## Design system
Frozen variant **“Gourmand Arrondi · Terracotta · Magazine”**. **`DESIGN.md` (repo
root) is the single source of truth** (identity, colours, typography, spacing,
components, tone) — read it before any UI work. The Tailwind v4 `@theme` in
`app/globals.css` is the running implementation that `DESIGN.md` mirrors; tokens:
`bg-bg`, `bg-surface`, `bg-surface-muted`, `text-ink`/`-soft`/`-faint`, `border-line`/`-soft`,
`bg-accent`/`-deep`/`-soft`, `text-accent-ink`, `bg-veg`/`-soft`, `bg-amber`/`-soft`/`text-amber-ink`,
`text-carbon-low`/`-med`/`-high` (carbon tiers), `rounded-input` (14px) /
`rounded-card` (22px), `shadow-card`/`-lg`, `max-w-content` (1200px), `font-display`/`-sans`/`-mono`.
Rule: **use theme tokens only**, no hardcoded values. **Token sync** — any token
change goes into `DESIGN.md` **and** the `@theme` (+ `theme.ts` for dark/accents) at
once; `npm run check:design` (wired into `vercel-build`) fails on any divergence
(see `DESIGN.md` §10). Home recipe layout = **Magazine** (1 full-width feature card
+ a 2-column grid).
**Theme/accent (Apparence):** light/dark + 4 accents are a client preference
(`localStorage`), applied by overriding the `--color-*` custom properties on
`<html>` at runtime (Tailwind v4 utilities read those vars, so the whole app
re-cascades). A before-paint script (`theme-script.tsx` in the root layout)
applies it with no FOUC. **Dark-mode pitfall:** never transition `background`/
`color` tied to a custom property (the transition freezes the old value); the
token swap adds `.no-transition` on `<html>` for one frame (`app/globals.css`).

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
> **`.env` vs `.env.local` (intentional).** `.env` is **committed** and holds the
> non-secret defaults / documented placeholders (e.g. `APP_RELEASE`, comments); local
> overrides and secrets go in **`.env.local`** (git-ignored, takes precedence — standard
> Next.js loading order). A committed `.env` is by design, not a leak.

- `DATABASE_URL` — Neon Postgres, **pooled** endpoint (secret, `.env.local` / Vercel);
  used by the runtime app via the Neon adapter (`lib/prisma.ts`).
- `DATABASE_URL_UNPOOLED` — Neon **direct/unpooled** endpoint. ⚠️ It MUST be the direct
  connection of the **same Neon branch** as `DATABASE_URL` (i.e. literally that host
  with `-pooler` removed) — NOT another branch. Used by the **Prisma CLI for migrations**
  (`prisma.config.ts`): advisory locks time out through the pooler (`P1002`). Falls
  back to `DATABASE_URL` if unset. Add it to `.env.local` (dev branch) and Vercel
  (prod branch). If it points to a different branch, migrations land on the wrong DB.
- `APP_RELEASE` — current git tag, shown in the footer (committed in `.env`).
- `CRON_SECRET` — secret for the seasonal-update cron (`/api/cron/season-update`). Vercel
  Cron sends it as `Authorization: Bearer …`; set it in Vercel (Production). Unset → the
  cron route returns 401 (safe no-op), the manual button still works.
- `APP_MAINTENANCE` / `APP_MAINTENANCE_BYPASS` — maintenance mode (`proxy.ts`).
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (+ optional
  `CLOUDINARY_FOLDER`) — photo uploads. Unset → gradient placeholders, upload disabled.
- `PEXELS_API_KEY` — seasonal calendar produce images + catalog thumbnails
  (`lib/pexels.ts`, server-only, cached). Unset → gradient placeholders. Can be
  **overridden at runtime** by the Pexels key saved from `/parametres/general`
  (stored in the `Setting` table; `getPexelsKey` prefers the DB value).
- `GEMINI_API_KEY` — Google Gemini API key for the recipe photo scan (`lib/gemini.ts`,
  server-only). Like Pexels, a value saved from `/parametres/general` (Setting table)
  overrides it (`getGeminiKey`). Unset → the scan creation method is disabled.
  `GEMINI_MODEL` (optional) overrides the model id (default `gemini-2.5-flash`).
- `SCRAPERAPI_KEY` — ScraperAPI key for the web-import 403 bypass (`lib/settings`
  `getScraperApiKey`, or saved from `/parametres/general`). Used only as a fallback
  when a recipe page blocks the direct crawl. Unset → blocked pages just report the
  block. The seasonal produce itself (fruits,
  vegetables, pulses, herbs) is stored in the **DB** (Ingredient season fields, editable
  from the app/CLI); `lib/data/seasonality.json` + `carbon-ademe.json` are the committed
  **seed source + fallback** (no external runtime API on reads). Carbon (`ecv`) comes
  from ADEME **Agribalyse** (`lib/agribalyse.ts`): seeded/refreshed into the DB by the
  CLI and pre-filled on edit; produce without an Agribalyse match keeps `ecv: null` and
  its carbon UI stays hidden. **Prod rollout**: after the migration deploys, run
  `npm run seasonality -- import` once against the prod DB to seed it (until then,
  `/saisons` serves the committed fallback).
