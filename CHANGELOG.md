# Changelog

All notable changes to the project, by release. Versions follow the `vMAJOR.MINOR.PATCH` format; each release maps to a git tag and a Vercel Preview/Production deployment.

## [v0.2.16] — 2026-06-12

- **Editable seasonality (backend)**: seasonal produce now lives in the **DB** as
  fields on `Ingredient` (`slug`, `category` enum `ProduceCategory`, `months`, `ecv`,
  `ecvSource`, `seasonUpdatedAt`) — a produce is an ingredient with a category.
  Migration `seasonal_ingredient`. `getProduce()` reads the DB (falling back to the
  committed `seasonality.json`/`carbon-ademe.json` until seeded). Server Actions
  (`lib/produce-actions.ts`: `listProduce` / `upsertProduce` / `removeProduce` /
  `suggestEcv`) are the contract for the upcoming `/parametres` produce editor; carbon
  is pre-filled from ADEME **Agribalyse** (`lib/agribalyse.ts`). New CLI
  `npm run seasonality -- <import|refresh-carbon|set|export>`. Recipe↔produce matching
  unchanged (fuzzy by name). The committed JSON is now the seed source + fallback.

## [v0.2.15] — 2026-06-12

- **Desktop nav revamp**: the secondary destinations (Menu de la semaine, Liste de
  courses, Favoris, Paramètres) are now reachable on desktop via a **"Plus"
  dropdown** (`DesktopMoreMenu`), mirroring the mobile bottom sheet. Both share a
  single source (`app/components/nav-data.ts`). Nav links gain icons (Recettes
  `book`, Saisons new `sun` icon — distinct from the `calendar` of "Menu de la
  semaine", used on mobile too). Removed the desktop "Accueil" link (logo) and the
  desktop "Rechercher" button. The dropdown handles click-outside / Escape / arrow
  keys / close-on-navigation, with `role="menu"` a11y. Mobile is unchanged beyond the
  shared data and the Saisons icon swap.

## [v0.2.14] — 2026-06-12

- **Carbon footprint back on `/saisons`**, now from a committed **ADEME Agribalyse**
  snapshot (`lib/data/carbon-ademe.json`, ~99 produce vs the previous ~24), merged
  into `lib/produce.ts` by slug (matched to the raw/fresh Agribalyse food, processed
  forms excluded). Re-enables the carbon badge on cards, the "Empreinte carbone"
  block (Source ADEME · Agribalyse) and the carbon sort. Produce without an
  Agribalyse match keeps `ecv: null` (carbon UI hidden). No runtime API — the data
  is committed (Agribalyse values have fuller boundaries, so some footprints rise,
  e.g. greenhouse tomato/pepper).

## [v0.2.13] — 2026-06-12

- Fix CI/deploy: the Prisma CLI now runs migrations against Neon's **direct
  (unpooled)** connection (`DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`,
  falling back to `DATABASE_URL`) in `prisma.config.ts`. `prisma migrate deploy`
  takes a Postgres advisory lock that times out through the `-pooler` endpoint
  (`P1002`), which had failed a Vercel build. The runtime app is unchanged (still
  uses the pooled `DATABASE_URL` via the Neon adapter).

## [v0.2.12] — 2026-06-12

- New **page-transition loader**: a root `app/loading.tsx` (Suspense fallback)
  renders a `Loader` (`app/components/loader.tsx`) in the content area during route
  transitions that actually suspend — a large logo bubble with a pulsing halo, the
  "Marmite." wordmark and a "ça mijote…" caption (bouncing dots). The fixed nav
  chrome stays put; fast (prefetched) navigations remain instant. New `breathe` /
  `halo` / `dot` keyframes.

## [v0.2.11] — 2026-06-12

- The header (`TopBar`) is now **`fixed`** (was `sticky`) like the mobile bottom
  tab bar; `<body>` gains `pt-[68px]` to reserve the header height on all
  viewports. Both nav bars are now truly pinned on every page.
- Fix: on mobile the **difficulty filter** overflowed its row — the filter group
  is now `flex-wrap`, so the buttons (Toutes / Facile / Moyen / Difficile) wrap
  instead of overflowing.

## [v0.2.10] — 2026-06-12

- Docs: document the **pinned-chrome invariant** in `CONTEXT.md` — the header
  (`TopBar`, sticky top) and, on mobile, the bottom tab bar (`MobileTabBar`, fixed
  bottom) live in the root layout and stay pinned on **every** page. No behaviour
  change (verified already uniform across home, catalogue, recipe detail/form,
  `/saisons`, and stubs); the note keeps it that way.

## [v0.2.9] — 2026-06-11

- **Recipe seasonality**: a recipe now declares how its in-season months are
  resolved — `seasonMode` (`AUTO` / `MANUAL` / `ALWAYS`) + `seasonMonths` (`Int[]`),
  and each `RecipeIngredient` can be flagged `isPrimary`. New `lib/seasonality.ts`
  `getRecipeActiveMonths`: `ALWAYS` → all year; `MANUAL` → its months (year-wrap
  supported, e.g. Nov→Feb); `AUTO` → the union of the in-season months of the
  recipe's **primary** ingredients. The form gains a ★ toggle per ingredient and a
  "Saisonnalité" section; `/saisons` now matches recipes via `getRecipeActiveMonths`.
  Prisma migration `season_fields` + Zod/Server-Action wiring.
- **Single seasonal dataset**: produce now comes from a committed, Zod-validated
  `lib/data/seasonality.json` (`lib/produce.ts`, 108 items, sources: Greenpeace /
  Interfel / chambres d'agriculture) — **no external runtime API**. Dropped the
  ADEME Impact CO2 fetch + snapshot, the redundant `herbs-seasonality.json` /
  `lib/herbs.ts`, and `IMPACTCO2_API_KEY`. Added a **Légumineuses** category. The
  dataset has no carbon footprint, so the carbon UI degrades (badges hidden,
  "non disponible" on the detail page).

## [v0.2.8] — 2026-06-11

- **Mobile navigation overhaul**: replaced the burger + right drawer with a fixed bottom **tab bar** (Accueil · Recettes · **Créer** raised center · Saisons · **Plus**) and a **bottom sheet** behind "Plus" (Organiser: Menu de la semaine / Liste de courses — Mon espace: Favoris / Paramètres). The mobile top bar collapses to logo + a search icon; the nav and "Créer"/"Rechercher" pills are now desktop-only. Active tab via `usePathname` (e.g. `/recettes/nouvelle` maps to Créer, not Recettes), `aria-current` on the active tab, `role="dialog"` sheet with Escape + body scroll-lock, safe-area padding, and a `sheet-up` animation.
- Added **stub pages** for the secondary destinations (`/menu-semaine`, `/liste-courses`, `/favoris`, `/parametres`) via a shared `ComingSoon` component so the nav never dead-ends; `/parametres` will host the catalog editors. New icons: home, book, cart, sliders, dots.

## [v0.2.7] — 2026-06-11

- **Responsive mobile navigation**: below `sm`, the top-bar nav (Accueil / Recettes / Saisons) was hidden with no alternative — added a **burger button** opening a right-side **drawer** (slide-in, backdrop, Escape, body scroll-lock, auto-close on navigation) with the nav links and a search shortcut. The "Créer" CTA collapses to an icon-only pill on mobile to make room; desktop is unchanged.

## [v0.2.6] — 2026-06-11

- Aromatic herbs are now a **committed dataset** (`lib/data/herbs-seasonality.json`, validated with Zod in `lib/herbs.ts`) instead of an inline "demo" list. No maintained French open-data API exists for herbs, so the months are sourced agronomically (open-field / "plein champ"). Added **dill** and **tarragon** (8 herbs total) and tightened the months to real French open-field windows (e.g. basil now July–August). Dropped the `demo` flag and its "démo" badges — herbs are presented as sourced data with no carbon footprint (no ADEME equivalent).

## [v0.2.5] — 2026-06-11

- New **seasonal calendar** (`/saisons`): fruits, vegetables and herbs in season by month (12-month band + `?m=`, current month by default), with their carbon footprint (ADEME Impact CO2), a seasonality search (typeahead), category filters with counts and sorting (in-season first / A→Z / carbon ↑), plus the matching recipes from the DB.
- Product detail (`/saisons/[slug]`): a full, shareable page that opens as a **drawer** when navigated from the calendar (Next parallel + intercepting routes, `@modal` slot). 12-month availability bar, carbon block with ADEME note, related recipes.
- Produce data from the **ADEME API** (server fetch, cached 24h) with a committed snapshot fallback (`lib/seasons-data.ts`); 6 demo herbs (marked "démo"). Produce photos via **Pexels** (server-side, cached; `PEXELS_API_KEY`), gradient placeholder fallback.
- Recipe ↔ produce matching by accent-insensitive ingredient name; a `seasonCount` badge ("N de saison") on recipe cards. Added cherry/carrot/sprout/calendar icons, amber theme tokens, and the "Saisons" nav link.

## [v0.2.4] — 2026-06-11

- Search runs **as you type** (debounced 300 ms, `router.replace`): removed the "Chercher" button; Enter still triggers immediately; a small spinner shows during the server fetch; the field re-focuses after the home → catalogue jump.
- Filters (time / difficulty) and category chips are now **always visible** (home + catalogue), no longer gated behind an active search.
- New **resting time** field (`restTime`, minutes): editable in the form, shown in the recipe meta and on the cards, and **counted in the total time and the time filter**. `formatTime` now renders days for long rests (e.g. "3 j"). Seeded the "Pâte à Pizza" with a ~26 h rest.

## [v0.2.3] — 2026-06-11

- Split the lean home (`/`) from the catalogue (`/recettes`). The home is a landing page: hero + search + a single featured section ("Populaires cette semaine", or the 4 latest as a fallback) with a "Tout voir →" link to the catalogue. `/recettes` is now the full catalogue (compact header + complete list / server-side search).
- Two-link navigation (Accueil → `/`, Recettes → `/recettes`); the logo links to the home.
- Factored the shared list helpers (`cardInclude`, `toCard`, `MagazineGrid`, `SectionHead`, `EmptyState`, `CardRow`) into `app/recettes/_shared.tsx` — no duplication between the two pages.
- Fix: missing space between "cuisine" and "aujourd'hui" in the hero title (JSX whitespace).

## [v0.2.2] — 2026-06-11

- Ingredient unit is now an editable combobox (`UnitCombobox`): catalog dropdown + free value, replacing the datalist input.
- Utensil quantity is now an editable number input (optional, ≥ 1; defaults to 1 when displayed). Zod coerces it to an `Int ≥ 1`.
- Recipe cards show `{n} pers.` and the difficulty label (Facile/Moyen/Difficile) next to the dots.

## [v0.2.1] — 2026-06-11

- Steps moved to their own `Step` table (content + order); every recipe now has a unique `slug`.
- Input validation rewritten with **Zod** (`lib/validation.ts`, single source of truth) across Server Actions and the REST API.
- **Server-side search** (`lib/search.ts`): keyword search + by-ingredient scoring + category/time/difficulty filters in SQL, accent-insensitive via the Postgres `unaccent` extension. Search controls drive the URL; results render on the server.
- French, slug-based routes: `/recettes`, `/recettes/[slug]`, `/recettes/[slug]/modifier`, `/recettes/nouvelle` (REST API stays `/api/recipes`).
- Theme tokens aligned to the official handoff (`tailwind/theme.v4.css`): `surface-muted`, `veg`/`veg-soft`, `rounded-input`, `shadow-card`/`-lg`, `max-w-content`.
- Seeded the 9 prototype recipes + the recovered "Pâte à Pizza".
- Added `CONTEXT.md` (onboarding doc for humans/AI); `preview-release` now updates it before each commit.

## [v0.2.0] — 2026-06-11

- Full visual redesign — frozen "Gourmand Arrondi · Terracotta · Magazine" design system: warm cream theme, terracotta accent, Newsreader/Hanken Grotesk/Spline Sans Mono fonts, sticky "Marmite." top bar and footer (Tailwind v4 tokens).
- Three redesigned screens: home (keyword + by-ingredient search, category chips, time/difficulty filters, Magazine grid), recipe detail (serving stepper that rescales quantities, checkable Markdown steps, nutrition, related recipes), create/edit form (block layout, photo dropzone, live preview, drag-and-drop kept).
- New recipe fields: categories (explicit many-to-many `RecipeCategory`), difficulty, rating, author, popular, nutrition (kcal/protein/carbs/fat) and photo. Seeded category catalog (Plat de résistance, Entrée, Dessert, Accompagnement, Apéritif, Préparation).
- Media storage on Cloudinary via a swappable `lib/media.ts` abstraction (signed REST, no SDK), designed to support local storage later. Configured through `CLOUDINARY_*` env vars; degrades to gradient placeholders when unset.
- Brand icons: SVG favicon, Apple touch icon, Android/PWA web manifest (incl. maskable) and `theme-color`.

## [v0.1.14] — 2026-06-11

- Switched all code comments and this `CHANGELOG.md` to English (UI text and seed data remain in French).
- `preview-release` skill now requires updating the `CHANGELOG.md` (in English) on every release.

## [v0.1.13] — 2026-06-10

- Added this `CHANGELOG.md` summarizing changes by release.
- Fix: stable `id` on each drag-and-drop zone to remove a React hydration mismatch.

## [v0.1.12] — 2026-06-10

- Kitchen utensils management: many-to-many relation `Recipe`↔`Utensil` (`RecipeUtensil` join model carrying quantity and position).
- Prefilled utensil catalog (basic utensils + size variants by diameter: cake pans, saucepans, frying pans, crêpe pans…).
- Reorderable input in the form, display on the detail page, support in Server Actions and the REST API.

## [v0.1.11] — 2026-06-10

- Reordering of ingredients and steps via drag-and-drop (burger handle ☰), with mouse, touch, and keyboard support.

## [v0.1.10] — 2026-06-10

- Markdown steps: dedicated per-step editor (toolbar on focus) and rich rendering.

## [v0.1.9] — 2026-06-10

- More tolerant maintenance mode, cleanup, and removal of the `.claude` folder from the repository.

## [v0.1.8] — 2026-06-10

- Maintenance mode (`proxy.ts`) with owner bypass.

## [v0.1.7] — 2026-06-10

- Decoupled commit / deployment via the `preview-release` (Preview) and `prod-release` (Production) skills.

## [v0.1.6] — 2026-06-10

- Vercel deployment preparation and tooling adjustments.

## [v0.1.5] — 2026-06-10

- Display of the app version in the footer (`APP_RELEASE`).

## [v0.1.4] — 2026-06-09

- Tags field with autocomplete (Headless UI Combobox).

## [v0.1.3] — 2026-06-09

- Structured ingredients: `Ingredient` / `Unit` catalogs with quantity.

## [v0.1.2] — 2026-06-09

- Versioned commit skill; exclusion of `settings.local.json`.

## [v0.1.1] — 2026-06-09

- Ingredients and tags as dedicated tables.

## [v0.1.0] — 2026-06-09

- Recipe CRUD.

## [v0.0.0] — 2026-06-09

- Application bootstrap and database setup.
