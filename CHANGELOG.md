# Changelog

All notable changes to the project, by release. Versions follow the `vMAJOR.MINOR.PATCH` format; each release maps to a git tag and a Vercel Preview/Production deployment.

## [v0.3.10] — 2026-06-17

- **nightshift skill**: new `/nightshift` command — autonomously processes selected GitHub issues overnight, each in its own tmux window running a Claude agent. Monitoring via GitHub issue comments (priority), ntfy.sh push notifications, and optional ttyd web terminal.
- **nightshift — nightshift-bot**: all GitHub operations (issue comments, PR creation, label management) use a dedicated `nightshift-bot` GitHub App token (`nightshift-token` CLI), keeping bot activity separate from the main account.
- **nightshift — fix mode**: issues labeled `hasPR` with `Status:Needs Work` on their PR are re-processed in "fix mode" — Claude reads PR review comments and applies only the requested corrections, then swaps `Status:Needs Work` → `Status:Reviewed`.
- **nightshift — Work in Progress label**: WIP label applied to issue/PR at start, removed on completion.
- **nightshift — structured PR body**: generated PR includes issue context, problem summary, changes list, and acceptance criteria checkboxes.
- **nightshift — port collision fix**: port auto-detected from `.port` files across sibling worktrees; existing worktrees reuse their port.
- **nightshift — wrapper script**: Claude invoked via a wrapper shell script to prevent numbered lines from being executed as commands after Claude exits.
- **nightshift — QR code**: final report includes a QR code for the ntfy monitoring URL.
- **run-dev skill**: new `/run-dev` command — starts the dev server on the worktree's auto-detected port.
- **task-new skill**: renamed from `new-task`; port auto-detection integrated.
- **Skills**: English enforced for all GitHub interactions (comments, PR bodies, commit messages).

## [v0.3.9] — 2026-06-16

- **Skills versioned**: `.claude/skills/` (handoff, new-task, preview-release, prod-release) are now tracked in git so all worktrees and Claude windows share the same workflow commands.
- **new-task skill**: new `/new-task` command — creates a GitHub issue, conventional branch (`feat/fix/chore/{number}-{slug}`), and a git worktree sibling to `main/` in one shot.
- **.gitignore**: `.claude/` entries replaced with fine-grained ignores (settings, cache, plugins) to allow skills to be versioned.

## [v0.3.8] — 2026-06-16

- **AGENTS.md — development workflow**: added branch naming convention (`feat/fix/chore/{number}-{slug}`), worktree usage rules (one per task, distinct port), atomic commit rules with issue references, Prisma migration sequencing guard, and end-of-task checklist (CONTEXT.md update → `check:design` → PR → worktree cleanup).
- **DEPLOY.md**: translated from French to English, content unchanged.

## [v0.3.6] — 2026-06-16

- **Web import — Marmiton parser**: Marmiton serves neither JSON-LD nor microdata
  but embeds recipe data in a `Mrtn.recipesData` JS blob. A new `parseMrtnRecipe`
  extractor reads that blob (title, image, servings, ingredients name+unit) with a
  proper string-literal-aware bracket counter for safe JSON extraction.
- **Web import — microdata fallback**: `parseMicrodataRecipe` parses `itemprop`
  attributes as a second-tier fallback between JSON-LD and the Mrtn blob.
- **Web import — image preserved with AI**: when Gemini structures the result, the
  image URL from the pre-parsed node is now copied over (Gemini doesn't return URLs).
- **ScraperAPI removed**: dropped the paid ScraperAPI integration entirely (key
  setting, UI toggle, fetch fallback). The product stays fully free.
- **Recipe sections**: `IngredientSection` and `StepSection` models added to the
  schema — named groups for ingredients and steps within a recipe (e.g. "Tangzhong",
  "Pâte à pain"). Sections use `SetNull` on delete so ingredients/steps are never
  lost. Form: empty by default, "Ajouter une section" button per block, drag-reorder
  section headers, step numbering restarts at 1 per section. Detail page renders
  section sub-headings with an accent rule under Ingrédients and Préparation; the
  servings scaler scales all quantities across sections.

## [v0.3.5] — 2026-06-16

- **Grouped filters** (design handoff `filters_gemini`): on the home and the
  catalogue, the search box + "by ingredient" toggle stay visible, but
  **category / time / difficulty** now live in a collapsible **"Filtres"**
  disclosure — a new shared `FilterDisclosure` component (adaptive pill with
  active-filter summary + count badge + "Tout effacer", isolated panel below),
  the same pill/panel pattern now also used by `/saisons` (mutualised). URL
  filtering (`?q&cat&t&d&ing`) unchanged.
- **`/saisons` consistency**: the product-type chips (Tout/Fruits/Légumes/…) use
  the season-shortcut style — active in `accent-soft`/`accent-ink` with a
  transparent border (instead of the ink fill); counts kept.
- **Scan gating polish**: the disabled "Scanner une photo" card now shows a lock
  icon alongside "Clé requise" (gating itself shipped in v0.3.3).

## [v0.3.4] — 2026-06-16

- **Web import — Gemini-assisted parsing**: when a Gemini key is configured,
  `extractRecipeFromUrl` now structures the fetched page with Gemini
  (`extractRecipeFromText`) for a much cleaner field distribution — feeding the
  JSON-LD recipe node when present, else the page's cleaned visible text (capped).
  Without a key (or on Gemini failure) it falls back to the built-in
  schema.org/Recipe parser, so the crawler keeps working unchanged. The shared
  Gemini→form mapper is reused by both the web and photo-scan paths. The crawl
  view gains an **AI on/off switch** (Gemini), on by default when a key exists and
  **disabled without a key** — turning it off forces the built-in parser.
- Fix: the creation form showed two back buttons ("Retour" + "Retour aux choix");
  the page-level "Retour" now lives in the chooser only, so each view has one.

## [v0.3.3] — 2026-06-16

- **Recipe photo scan — switch from Tesseract to Gemini**: the Tesseract OCR
  attempt is removed (poor recognition quality) and replaced by **Gemini**
  (vision). The scan sub-step sends the photo(s) to a server action
  (`extractRecipeFromImagesAction`) → `lib/gemini.ts` calls the Gemini API (REST,
  no SDK) with a **structured-output schema**, returning a recipe (title /
  ingredients {name,quantity,unit} / steps / times) that prefills the form
  (source = "Photo importée"; fields stay editable). The image is sent to Google.
- **Key gating**: the Gemini key is a server secret (`GEMINI_API_KEY` env, or saved
  from **Paramètres › Général**, Setting table — same pattern as Pexels). On the
  creation chooser the **scan card is disabled ("Clé requise") until a key is set**;
  a deep link to `?method=scan` falls back to the chooser. Model overridable via
  `GEMINI_MODEL`.
- **Photo uploads**: images are downscaled client-side (longest side ≤ 1600 px,
  JPEG) before upload, and the Server Action body cap is raised to 8 MB
  (`next.config`) — fixes "Body exceeded 1 MB limit" on phone photos (also covers
  the recipe photo upload).

## [v0.3.2] — 2026-06-15

- **Recipe creation — OCR scan** (design handoff `import`, stage 3/3, completes
  the import feature): the "Scanner une photo" method is now live. Import (or, on
  mobile, shoot via `capture="environment"`) one or more photos, managed in a
  thumbnail gallery; **Tesseract** (`tesseract.js`, **client-side** so the image
  never leaves the device, `fra`+`eng`, live progress %) recognizes the text,
  concatenated across images in order. A heuristic splits it into
  title/ingredients/steps (source = "Photo importée"); all fields stay editable.
- Extract the ingredient-line parser (quantity/unit/name) into a shared
  client-safe `lib/recipe-parse.ts`, reused by the web-crawl and OCR paths.

## [v0.3.1] — 2026-06-15

- **Recipe creation — web import** (design handoff `import`, stage 2/3): the
  "Importer depuis le web" card is now live. Paste a URL → the
  **`extractRecipeFromUrl`** server action fetches the page **server-side**
  (timeout + clear errors) and parses **schema.org/Recipe** (JSON-LD preferred,
  handles `@graph`; `HowToStep`/`HowToSection` instructions; ISO-8601 durations →
  minutes; `recipeYield` → servings; ingredient lines split into
  quantity/unit/name; image), pre-filling the form. The origin URL is added as
  the first source (with a "Source pré-remplie" banner). A title fallback
  (og:title / `<h1>` / `<title>`) covers pages without JSON-LD. All fields stay
  editable; a web-imported image URL is persisted as-is.

## [v0.3.0] — 2026-06-15

- **Recipe creation — method chooser + Sources** (design handoff `import`, stage
  1/3): `/recettes/nouvelle` now opens on a **method picker** (`CreateFlow`):
  Importer depuis le web / Scanner une photo / Saisie manuelle, mirrored to
  `?method=`, with a "Retour aux choix" button on the form. Web-crawl and OCR
  ship in later v0.3 releases (cards disabled "Bientôt"); manual entry is live.
- **Sources**: new **`RecipeSource`** model (`value` + `kind` enum `url|text`
  derived from the value + `position`, owned by Recipe like Step) + migration.
  The form gains a multi-source **Sources** section (URL or free text, add/remove,
  "Source pré-remplie" banner ready for the web method); sources show on the
  recipe page (URLs as links) and round-trip through create/edit.

## [v0.2.29] — 2026-06-15

- **Timer alert** (widgets): the end-of-timer alarm now **repeats** (beep +
  vibration every ~1.8 s) for up to **1 minute** or until the user stops it
  (Relancer / Pause / Réinitialiser / Supprimer), instead of a single beep. The
  AudioContext is reused across beeps; vibration pulses each cycle (mobile) and is
  cancelled on stop.
- **Fix**: a ringing timer in the "Minuteurs en cours" list showed **two**
  reset-looking buttons — the play/pause control no longer borrows the refresh
  icon (it becomes "Relancer" ▶) and the separate Réinitialiser button is hidden
  while ringing, leaving a single relaunch action.

## [v0.2.28] — 2026-06-15

- **Kitchen widgets dock** (design handoff `widgets`): a floating launcher
  (`WidgetsDock`) mounted in the root layout (global chrome, like the notif bell).
  A round FAB expands an extensible **widget registry** (today `timer` active;
  `convert`/`portions`/`notes` shown disabled "à venir"); each opens in a reusable
  popin (bottom-sheet on mobile).
- **Timer widget**: Simple mode (min/sec steppers + 1/3/5/10 presets) and an
  **egg-cooking** mode (boiling-water plunge) with a calibrated time table
  (doneness × size + cold-fridge +60 s + `(n−4)×15 s`), recomputed live. Multiple
  timers run in parallel (250 ms tick), minimize to floating **pills** with a
  progress ring + a count badge on the FAB, and on completion **beep** (WebAudio)
  + **vibrate** + flash the popin ("À retirer !"). Mounted in the layout, timers
  survive SPA navigation. A11y: `aria-expanded`, `role="menu"`, popin
  `role="dialog"` + focus-trap + Escape + click-outside; `prefers-reduced-motion`.
- Add `timer`/`egg`/`play`/`pause`/`scale`/`note` icons and a `flash-ring`
  keyframe (`animate-flash`) for the timer alert.

## [v0.2.27] — 2026-06-15

- **Design system formalised** (design handoff `design_system`): add **`DESIGN.md`**
  at the repo root as the single source of truth for the visual system (identity,
  colours, typography, spacing/radii/shadows, themes, accents, components, tone),
  referenced from `AGENTS.md` and `CONTEXT.md`.
- **`@theme` aligned to `DESIGN.md`**: content width 1180 → **1200px**; add carbon
  footprint tier tokens **`--color-carbon-low/med/high`** (#4b8b5a / #cc8d2e /
  #d8582e); the seasonal views now colour the carbon indicator via `text-carbon-*`
  / `bg-carbon-*` instead of reusing veg/amber/accent. Dead `tailwind/theme.v4.css`
  reference removed.
- **Token sync guard**: `npm run check:design` (`scripts/check-design.mjs`) parses
  the hex/values of `DESIGN.md` vs the `@theme` and fails on any divergence; wired
  into `vercel-build` (a drift breaks the deploy). The sync rule (DESIGN.md +
  @theme + theme.ts, same change) is documented in `AGENTS.md` and the
  `preview-release` checklist.

## [v0.2.26] — 2026-06-15

- **`assign-unit-types` maintenance script** (`scripts/assign-unit-types.ts`,
  `npm run assign-unit-types`): assigns the default unit family (UnitType) to the
  standard units that still have none (g → Masse, ml → Volume…). **Dry-run by
  default**; `-- --apply` writes. Idempotent and non-destructive — only fills
  `typeId` where null, never touches recipes. Target the prod DB by passing its
  pooled `DATABASE_URL` inline (overrides `.env.local`). Lets unit types show
  their real usage (and lock against deletion) on a DB where the legacy `kind`
  was never populated.

## [v0.2.25] — 2026-06-15

- **Editable referentials** (design handoff `referentiels`): the lists feeding
  the catalog dropdowns become first-class, manageable data.
  - **Schema**: the grocery aisle ("rayon") and the unit family ("type") are
    promoted from free string columns to **referential tables** — new models
    **Aisle** (`Ingredient.aisleId`) and **UnitType** (`Unit.typeId`), joining
    the existing **Tag** / **Category**. Renaming a value now follows the id, so
    every entity referencing it is renamed at once. Data-safe migration: the
    tables are seeded with the canonical lists + any value already in use, then
    existing rows are backfilled before the old columns are dropped.
  - **Creatable catalog cells**: the Rayon / Unité par défaut / Type `<select>`s
    in `/parametres/{ingredients,unites}` become **comboboxes** (`CellCombo`,
    same accent-insensitive "+ Créer" UX as the recipe form). Creating upserts
    the referential (or a Unit for "Unité par défaut") and selects it on the row.
  - **Référentiels rail group** + 4 views (`RefList`): **Rayons**, **Types
    d'unité**, **Tags**, **Catégories** — search, add (focused row), inline
    rename, usage counter, delete **blocked server-side when still in use**
    (lock + toast). Server Actions in `ref-actions.ts`.
  - Knock-on updates: the recipe-form unit-create modal now picks a `UnitType`
    (passed from the page); `lib/season-update` resolves the derived aisle by
    name; `lib/notifications` and the "À compléter" derivations switch to the FKs.
  - **Prod rollout**: the migration backfills automatically; run `npm run seed`
    (or it is implied by deploy seeding) only to top up the canonical referentials
    on a fresh DB.

## [v0.2.24] — 2026-06-12

- **Seasonal dataset — year-round tropical imports**: add **banane, avocat,
  ananas, mangue** to `lib/data/seasonality.json` as `fruits` available all year
  (`months: 1–12`), with their ADEME Agribalyse footprint committed to
  `carbon-ademe.json` (banane 0.79, ananas 1.24, avocat 1.46, **mangue 11.80** —
  air-freighted, "high" tier). These imports were absent from the French seasonal
  calendar, so they never showed on `/saisons`; they now appear whenever a month
  is selected. (Out-of-season produce staying hidden is by design — the rework
  shows only the selection; pick "Toute l'année" or the relevant months to widen.)
  Apply to a seeded DB via `npm run seasonality -- import` (the page reads the DB,
  not the committed JSON).

## [v0.2.23] — 2026-06-12

- **`/saisons` rework** (design handoff `saisons_rework`): the page becomes a
  client-driven `SeasonsBrowser` whose state is mirrored into the URL (shareable,
  back/forward-able), replacing the server-round-trip month band.
  - **Multi-month selection** (`?m=6,7,8`; default = current month; explicit empty
    set = `?m=none`): a product is listed when its months intersect the selection.
    Checkable month **pills** (current month dotted) + **shortcuts** — Ce mois-ci,
    Toute l'année, the four seasons, Tout effacer.
  - **Removable Filters panel** (closed by default, summary + active-count badge,
    sticky on mobile) now holds the month selector, category chips and the sort,
    bringing the list right under the search. The standalone month band is gone.
  - **Live name search** filters the grid (accent-insensitive); category **counts**
    and the list derive from the current selection (out-of-selection items hidden).
  - **View selector** — **Grille** / **Liste dense** / **Étagères** (default):
    shelves are one horizontal slider per category (arrow buttons + swipe /
    scroll-snap, empty categories hidden); dense rows show thumbnail + state +
    carbon + 12-month bar.
  - **Dynamic titles**: `en {mois}` for one month, a season's own phrasing
    (**au printemps**, **en été**, **en automne**, **en hiver**) when the selection
    matches a season, `sur N mois`, or `cette année`.
  - **Mobile**: months in 4 columns; shortcuts and categories become **custom
    dropdowns** (icons, counts, colored selection) since a native `<select>` can't.
  - Seasonal recipes are now matched client-side against the multi-month selection
    from data pre-resolved on the server (`seasonalRecipesData`), with no
    per-interaction round-trip.

## [v0.2.22] — 2026-06-12

- **Mobile nav tweaks** (design review): the mobile (`< sm`) top bar is now the
  **logo only** — the search shortcut is removed (search is reached via the
  Recettes tab) and the notification bell stays **desktop-only**. In the "Plus"
  bottom sheet, the **Paramètres** entry gains an accent **count badge** (top-right
  of its icon) reusing the notification `todoCount` (0 → no badge); the badge is
  `aria-hidden` and the link's `aria-label` includes "(N à compléter)". The raised
  "Créer" FAB and the "Plus" tab badge are unchanged.

## [v0.2.21] — 2026-06-12

- **Operational seasonal-data update** (`lib/season-update.ts` `runSeasonUpdate`):
  re-applies the committed dataset to the DB (months/category), **derives each
  produce's grocery aisle ("rayon") from its category** (fruits→Fruit, legumes→
  Légume, herbes→Herbe, legumineuses→Épicerie) — only where the aisle is still
  null, so manual edits aren't clobbered — **refreshes the carbon footprint from
  the live ADEME Agribalyse API** (best-effort), then stamps the date. Filling
  the aisles clears those entries from the "À compléter" / notification counts.
- **Manual button**: `/parametres/saisons` now has a working **"Mettre à jour"**
  button (`updateSeasonData` server action) that runs the update and reports what
  changed (produits · rayons renseignés · carbone rafraîchi). Replaces the former
  re-timestamp-only stub.
- **Scheduled task**: a daily **Vercel Cron** (`vercel.json`) hits
  `GET /api/cron/season-update`; the route gates on the chosen frequency
  (Manuelle / Hebdomadaire / Mensuelle) + the last-check date, so the monthly (or
  weekly) cadence is configurable at runtime. Protected by `CRON_SECRET`
  (`Authorization: Bearer …`) — a safe 401 no-op until that env var is set.

## [v0.2.20] — 2026-06-12

- **Notification center ("À traiter")**: a **bell** in the chrome — far right of the
  desktop `TopBar` (after the "Créer" CTA) and next to the search icon on mobile — with
  an accent **count badge**. Clicking it opens a panel listing **derived** action signals
  (no stored table): catalog entries still to complete (ingredients without aisle/default
  unit, units without abbreviation/kind — same derivation as `/parametres`), stale
  seasonal data, and recipes without a photo. Each item links straight to the right place
  (`/parametres/{ingredients,unites,saisons}`, `#row-<id>` highlighting the entry via
  `:target`); `todo` signals are accent (and counted on the badge), `info` signals are
  amber (shown, not counted). Empty state "Tout est à jour 🎉" + "Tout voir dans les
  Paramètres" footer; panel closes on outside-click / Escape, `role="menu"` + aria.
- **Settings rail dots**: an accent count badge on the Ingrédients / Unités rail items
  (entries to complete), plus a badge on the mobile **"Plus"** tab.
- `getNotifications()` (`lib/notifications.ts`, React `cache()`) computes the list +
  per-section counts once per request, shared by the root layout (bell + Plus badge) and
  the `/parametres` layout (rail dots). New `bell` icon. No schema change.

## [v0.2.19] — 2026-06-12

- **On-the-fly catalog creation in the recipe form**: the ingredient / unit /
  utensil fields now use a shared accessible combobox (`form-combobox.tsx`,
  `role="combobox"` + `aria-activedescendant`, arrow/Enter/Escape, click-outside)
  that appends a "+ Créer « … »" row when the typed value matches no option.
  - **Ingredient**: "+ Créer" creates immediately (name suffices) and shows an
    "à compléter" badge (derived: missing default unit / aisle). Selecting an
    existing ingredient **auto-fills its default unit** (`Ingredient.defaultUnit`)
    unless the row's unit was already set.
  - **Unit**: "+ Créer" opens a mini-modal (`role="dialog"`, focus-trap, Escape,
    focus return) for the abbreviation (= the typed value, editable) + type
    (default "Quantité").
  - **Utensil**: "+ Créer" creates in one click.
- Creation goes through Zod-validated Server Actions (`catalog-actions.ts`) that
  **dedupe** accent-insensitively / plural-tolerantly (`fuzzyKey` in
  `lib/seasons-data`) and **reuse** a close existing entry instead of duplicating
  (with a toast). Creation is optimistic; the recipe submit reconciles links via
  `connectOrCreate`. New entries surface as "À compléter" in `/parametres`
  (status stays derived). Replaces the standalone lot-3 demo — everything lives in
  the real form. `unit-combobox.tsx` (Headless UI) is replaced by the shared
  combobox. No schema change (`Ingredient.defaultUnitId` already exists).

## [v0.2.18] — 2026-06-12

- **Settings page (`/parametres`)**: a side-rail shell (grouped Préférences /
  Catalogues / Données, sticky, active item `bg-accent-soft text-accent-ink`)
  with sub-routes under a common layout; `/parametres` redirects to
  `/parametres/ingredients`. The global breadcrumb now resolves FR labels +
  icons for each sub-section.
- **Editable catalogs** (`/parametres/{ingredients,ustensiles,unites}`): a
  reusable `CatalogTable` client component — accent-insensitive search,
  "Toutes (N)" / "À compléter (M)" chips, add-on-the-fly (draft row, focus
  name), inline edit (text + selects), usage counter ("N rec." = recipe
  relations), delete (trash when unused, **locked** + toast when used), and
  **merge duplicates** (centered modal → Server Action that reassigns the
  `RecipeIngredient`/`RecipeUtensil`/`unitId` relations in a transaction, then
  deletes the source). "À compléter" is **derived** (required field null:
  ingredient without aisle/default unit; unit without abbreviation/kind) →
  pill + highlighted fields + filter. Ingredients/utensils carry a custom
  `image` (priority over the auto **Pexels** thumbnail, lazy-loaded via the new
  `GET /api/pexels`); custom imports upload through `lib/media` (Cloudinary).
- **Général**: the Pexels API key is saved as a **server secret** (`Setting`
  table, never returned to the client; `getPexelsKey` prefers it over the env
  var); masked field + "Connectée" badge. AI key is a disabled "À venir"
  placeholder.
- **Apparence**: light/dark theme + accent (Terracotta/Paprika/Ambre/Olive),
  a client preference (localStorage) applied app-wide by overriding the
  `--color-*` tokens on `<html>`, with a before-paint bootstrap (no FOUC). The
  token swap suppresses transitions for one frame (`.no-transition`) to avoid
  the dark-mode custom-property freeze.
- **Données de saison**: status card (pulsed voyant + last-check date +
  "Vérifier les sources" job that recomputes the DB stats and stamps the date),
  sources list with "Opérationnelle" voyants, and an auto-check frequency
  (Manuelle / Hebdomadaire / Mensuelle). Frequency + last-check persisted in
  `Setting`.
- **Schema** (migration `settings_and_catalog_fields`): `Setting(key/value)`;
  `Ingredient.aisle/defaultUnitId/image/imagePublicId`;
  `Unit.abbreviation/kind`; `Utensil.image/imagePublicId`.

## [v0.2.17] — 2026-06-12

- **Unified global chrome**: a **breadcrumb** (`Breadcrumb`, server, ≥ sm) is pinned
  under the `TopBar` on every page (Accueil › … › current), with DB-resolved labels
  (recipe title, produce name). It reads the path from an `x-pathname` header set by
  the proxy (`proxy.ts`), and is wrapped in `<Suspense>` so it never blocks the page
  stream. `<body>` reserves `sm:pt-[108px]` for the TopBar + breadcrumb. Hidden on
  mobile (the bottom tab bar stays the nav).
- The **Saisons** nav icon is now `leaf` (was `sun`) on both the desktop TopBar and the
  mobile tab bar (`calendar` stays for "Menu de la semaine"). "Plus" dropdown width
  tightened to `min-w-[290px]`.

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
