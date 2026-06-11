# Changelog

All notable changes to the project, by release. Versions follow the `vMAJOR.MINOR.PATCH` format; each release maps to a git tag and a Vercel Preview/Production deployment.

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
