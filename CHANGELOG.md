# Changelog

All notable changes to the project, by release. Versions follow the `vMAJOR.MINOR.PATCH` format; each release maps to a git tag and a Vercel Preview/Production deployment.

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
