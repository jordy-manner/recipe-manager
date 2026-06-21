# DESIGN.md — Sur le Plat

> Source of truth for the **Sur le Plat** design system (home-cooking recipe app).
> Single portable file, readable by humans **and** AI agents. Frozen variant:
> **"Gourmand Arrondi · Jaune Vintage · Sur le Plat"**.
>
> **Implementation:** the values below are mirrored 1:1 by the Tailwind v4
> `@theme` in `app/globals.css` (light tokens) and `app/components/theme.ts`
> (dark theme + alternate accents, applied at runtime). This file is the
> documentary mirror; **`app/globals.css` / `theme.ts` are the running source**.
> A guard (`npm run check:design`) fails the build if a hex/value here diverges
> from the `@theme` — see [§10](#10-synchronisation--règle-de-release).
>
> Token names below are the **production** names (`--color-*`, `--radius-*`…).
> Portable aliases used in the standalone mockups map as: `--bg`=`--color-bg`,
> `--surface-2`=`--color-surface-muted`, `--radius`=`--radius-card`,
> `--radius-sm`=`--radius-input`, `--shadow-lg`=`--shadow-card-lg`,
> `--maxw-content`=`--container-content`.

---

## 1. Identité

**Sur le Plat** is a mainstream **home-cooking** app. Tagline:
*Toutes vos recettes dans une même coquille*. The world is **comics / BD maîtrisée**: egg-on-plate
hero, vintage yellow, strong outlines, discrete halftone, charcoal dark theme
and eggshell light theme.

**Logotype** — wordmark "SUR LE PLAT" in Bangers 400 (cartoon, yellow
`#f5c700`, outline `#16181f`, extrude navy `#15223d`) preceded by an inline
fried-egg SVG. `<Logo>` in `app/components/Logo.tsx`.

**Keywords**: comics · vintage · egg · round · legible · responsible
(seasonality, carbon).

---

## 2. Couleurs

Light theme (base). Mirrored by `@theme` in `app/globals.css`.

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#f3ecd8` | App background (eggshell) |
| `--color-surface` | `#fffdf3` | Cards, panels (near-white warm) |
| `--color-surface-muted` | `#efe7d2` | Muted surface (chips, icon tiles) — DS alias `--surface-2` |
| `--color-ink` | `#1a1a1a` | Primary text (deep charcoal) |
| `--color-ink-soft` | `#6b6456` | Secondary text |
| `--color-ink-faint` | `#9b9484` | Tertiary text, placeholders |
| `--color-line` | `#e4dabf` | Borders |
| `--color-line-soft` | `#ede4cf` | Hairlines, dividers |
| `--color-accent` | `#f5c700` | **Jaune Vintage** — primary actions, active states |
| `--color-accent-deep` | `#d9af00` | Hover / pressed accent |
| `--color-accent-soft` | `#fdf2c0` | Accent backgrounds (chips, soft fills) |
| `--color-accent-ink` | `#8a6a00` | Text/icons on `accent-soft` |
| `--color-veg` | `#4b8b5a` | "Seasonal / health / positive" green |
| `--color-veg-soft` | `#dcefdf` | Soft green fill (peak-season state) |
| `--color-amber` | `oklch(0.7 0.13 70)` | Warning / "À compléter" / end-of-season |
| `--color-amber-soft` | `oklch(0.93 0.06 78)` | Soft amber fill |
| `--color-amber-ink` | `oklch(0.48 0.12 64)` | Text/icons on `amber-soft` |
| `--color-carbon-low` | `#4b8b5a` | Carbon footprint low (< 0.7 kg CO₂e) |
| `--color-carbon-med` | `#cc8d2e` | Carbon footprint medium (0.7–1.6) |
| `--color-carbon-high` | `#f5c700` | Carbon footprint high (> 1.6) |

### Thème sombre — `app/components/theme.ts` (`DARK_TOKENS`)
Applied at runtime on `<html>` (client preference). Overrides:
`--color-bg #151517` · `--color-surface #232327` · `--color-surface-muted #2d2d33`
· `--color-ink #f4eedd` · `--color-ink-soft #9a958c` · `--color-ink-faint #6f6a62`
· `--color-line #34343b` · `--color-line-soft #2a2a30` · `--color-veg #74b487`
· `--color-veg-soft #1f2c23`.

### Accents alternatifs — `theme.ts` (`ACCENTS`)
Default = **Jaune Vintage** (above). Alternates override accent/-deep/-soft/-ink:
- **Terracotta** → `#d8582e` / `#a73a1b` / `#ffdfcb` / `#852b09`
- **Paprika** → `#c0392b` / `#992c20` / `#ffd9d2` / `#7e241a`
- **Ambre** → `#cc8d2e` / `#a06f1f` / `#fdecc8` / `#7a541a`
- **Olive** → `#6f8f3f` / `#566f30` / `#e6efcf` / `#42531f`

> ⚠️ **Accent-on-text rule**: text/icons on a yellow (`bg-accent`) background
> (CTA, active nav, badges, FAB, chips) must use `#151517` (charcoal), never white.
>
> ⚠️ **Dark-mode pitfall**: never transition `background`/`color` on the `body`
> when the value comes from a custom property that changes — the transition
> freezes the old value. `applyTheme` swaps tokens with `.no-transition` for one
> frame (see `app/globals.css`).

---

## 3. Typographie

Loaded via `next/font` (`app/layout.tsx`) into the `--font-*` `@theme` variables.

- **Display / UI / body** — `--font-display` / `--font-sans`: `Outfit`, system-ui, sans-serif.
  Weights 400–900. Editorial titles (700–800) and body (400–600).
- **Logo / BD titles** — `--font-logo`: `Bangers`, cursive. Wordmark, large cartoon headings.
- **Hero accent word** — `--font-script`: `Architects Daughter`, cursive. The `<em>` word in
  hero titles (non-italic, accent colour).
- **Mono** — `--font-mono`: `Spline Sans Mono`, ui-monospace, monospace. Eyebrows,
  quantities, metadata, dates (`250 g`, `4 pers.`, `0.51 kg CO₂e`).

**Scale**: eyebrow 12 (mono, uppercase, `letter-spacing .14em`) · sm 13.5 ·
base 14.5 · md 16 · lg 18 · card title 21 · section 26 · page title 34 · hero 56.
Display headings: `letter-spacing: -0.02em`. Body line-height: 1.55.

**Casing**: initial capital only (no Title Case). Eyebrows in tracked UPPERCASE.

Hero titles: `.hero-title em { font-family: var(--font-script); font-style: normal;
color: var(--color-accent-ink); }` (light) / `var(--color-accent)` (dark).

---

## 4. Spacing, rayons, ombres

Mirrored by `@theme`.

- **Radii**: `--radius-card: 22px` (cards/panels, "gourmand") and
  `--radius-input: 14px` (inputs). **Pills** use Tailwind `rounded-full` (DS alias
  `--radius-pill` 99px). Dense views (Paramètres) may drop to 18/12.
- **Spacing**: Tailwind scale (4 · 8 · 12 · 16 · 22 · 32 · 48 px ≈ DS `--space-1..7`).
- **Shadows** (soft, warm-tinted):
  - `--shadow-card: 0 1px 2px rgb(64 48 40 / 0.06), 0 2px 8px rgb(64 48 40 / 0.05)`
  - `--shadow-card-lg: 0 4px 14px rgb(64 48 40 / 0.08), 0 12px 34px rgb(64 48 40 / 0.07)`
- **Layout**: `--container-content: 1200px` (→ `max-w-content`).

---

## 5. Motifs visuels & interactions

- **Backgrounds**: eggshell (`#f3ecd8`) with **discrete halftone BD dot pattern**
  (`radial-gradient(rgb(0 0 0 / .04) 1px, transparent 1.4px)`, 11×11px, fixed).
  Dark: charcoal `#151517` with inverted halftone (`.03` white). **No halftone under
  headers** (solid colour headers only).
- **Cards**: `--color-surface`, `--color-line-soft` border, `--radius-card`,
  `--shadow-card`. Hover: `translateY(-3px)` + `--shadow-card-lg`.
- **Photo placeholders**: `surface-muted` fill + halftone dot pattern.
- **Hover**: surfaces → `--color-surface-muted`; accent button → `--color-accent-deep`.
  **Press**: `translateY(1px)`.
- **Text selection**: `--color-accent-soft` background.
- **Animations**: fades + short translations (.15–.4s, ease-out). "Sonar" status
  pulses (yellow halos). **No bounce.** Always honour `prefers-reduced-motion`.
- **Chrome**: sticky top bar (`#101012` dark) + **breadcrumb** (`Accueil › Section › Page`).
  Desktop nav = `Recettes · Saisons` + "Créer une recette" CTA + theme toggle; logo = home.
- **Mobile**: bottom tab bar with a raised circular **"Créer" FAB** (accent bg,
  `#151517` icon); theme toggle tab at the right.

---

## 6. Iconographie

**Stroke** icons, Lucide-like (stroke ~1.8), inline SVG (`app/components/icons.tsx`):
`chef`, `carrot`, `leaf`, `ruler`, `tool`, `sun`, `bell`, `dots`, `sliders`,
`home`, `book`, `calendar`, `cart`, `tag`, `folder`, `layers`, `grid`… **No
icon-font, no emoji as icons** (emoji very rare, never decorative).

---

## 7. Composants

Reusable, styled via tokens. All `rounded-full` except Card/Input.

- **Button** — `primary` = accent fill + `#151517` text + `--shadow-card`; `ghost` =
  `--color-line` outline; `soft` = `--color-surface-muted`. One `primary` per screen.
- **Badge** — status/tag pill. `neutral | accent | veg`. `accent` for category/active
  (text `#151517` on yellow), `veg` for seasonal/positive.
- **Card** — rounded surface container (`--radius-card`, `--shadow-card`).
- **Input** — text field, `--radius-input`, accent ring on focus.
- **Chip** — on/off filter. Selected = `--color-ink` fill on `--color-bg`; else outline.

### Patterns notables
- **Combobox « + Créer »**: accent-insensitive search + on-the-fly creation
  (ingredients/units/aisles/types); incomplete entry → derived "À compléter" status.
- **Editable catalog table**: search, add, inline rename, usage counter,
  **delete blocked when in use** (→ merge duplicates).
- **Referential editor (`RefList`)**: rename cascades via the id; delete blocked when used.
- **Seasonality bar**: 12 bubbles (months), accent = in season, outline = current month.

---

## 8. Contenu & ton

- **Language**: French UI. **Tone**: warm, direct, appetising but sober. Neutral/
  impersonal phrasing (« Ajouter un ingrédient », « Que cuisiner aujourd'hui ? »).
- **Numbers & units** in mono. **Emoji** almost absent.
- **Examples**: « De saison · juin » · « Populaires cette semaine » · « Tout est à
  jour » · « À compléter ».

---

## 9. Comment utiliser ce système

- **In the app**: reference the Tailwind utilities generated from `@theme`
  (`bg-surface`, `text-ink-soft`, `rounded-card`, `shadow-card`…). **Never hardcode
  colours/typography** — always go through tokens.
- **Theme**: `applyTheme(theme, accent)` sets `data-theme` + overrides `--color-*`
  on `<html>` (client preference, `localStorage`).
- **Change the system**: edit the value here **and** in `@theme` (and `theme.ts`
  for dark/accents) in the **same change** — see §10.

---

## 10. Synchronisation — règle de release

**Any change to a design token must be applied at the same time in:**
1. **`DESIGN.md`** (this file — the documented mirror), and
2. the **`@theme`** in `app/globals.css` (light tokens) — and `app/components/theme.ts`
   for the dark theme / alternate accents.

The running CSS is the source; this file mirrors it. `npm run check:design`
parses the hex/value tokens of §2/§4 and fails if any diverges from the `@theme`
(wired into `vercel-build`, so a drift breaks the deploy). The
`preview-release` checklist enforces this before every commit.
