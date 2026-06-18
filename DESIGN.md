# DESIGN.md — Mealoday

> Source of truth for the **Mealoday** design system (home-cooking recipe app).
> Single portable file, readable by humans **and** AI agents. Frozen variant:
> **”Gourmand Arrondi · Terracotta”**.
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

**Mealoday** is a mainstream **home-cooking** app (ex-"Marmite"). Tagline:
*Orchestrer vos menus*. The world is **warm, editorial and appetising**:
terracotta on cream, large serif titles, a round and welcoming UI.

**Logotype** — wordmark "Meal(o)day" in Outfit 600 where the "o" is a styled
egg (white disc, terracotta yolk offset top-left, white glint). `<Logo>` in
`app/components/Logo.tsx`. App icon: terracotta rounded tile, 7 equalizer bars
forming an "M" (`<AppIcon>`).

**Keywords**: warm · editorial · appetising · round · legible · responsible
(seasonality, carbon).

---

## 2. Couleurs

Light theme (base). Mirrored by `@theme` in `app/globals.css`.

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#fff3e9` | App background (warm cream) |
| `--color-surface` | `#fffdf8` | Cards, panels (near-white warm) |
| `--color-surface-muted` | `#faebe0` | Muted surface (chips, icon tiles) — DS alias `--surface-2` |
| `--color-ink` | `#271d18` | Primary text (deep cocoa) |
| `--color-ink-soft` | `#665751` | Secondary text |
| `--color-ink-faint` | `#91837c` | Tertiary text, placeholders |
| `--color-line` | `#e4ddd5` | Borders |
| `--color-line-soft` | `#ece7e1` | Hairlines, dividers |
| `--color-accent` | `#d8582e` | **Terracotta** — primary actions, active states |
| `--color-accent-deep` | `#a73a1b` | Hover / pressed accent |
| `--color-accent-soft` | `#ffdfcb` | Accent backgrounds (chips, soft fills) |
| `--color-accent-ink` | `#852b09` | Text/icons on `accent-soft` |
| `--color-veg` | `#4b8b5a` | “Seasonal / health / positive” green |
| `--color-veg-soft` | `#d6f0da` | Soft green fill (peak-season state) |
| `--color-amber` | `oklch(0.7 0.13 70)` | Warning / “À compléter” / end-of-season |
| `--color-amber-soft` | `oklch(0.93 0.06 78)` | Soft amber fill |
| `--color-amber-ink` | `oklch(0.48 0.12 64)` | Text/icons on `amber-soft` |
| `--color-carbon-low` | `#4b8b5a` | Carbon footprint low (< 0.7 kg CO₂e) |
| `--color-carbon-med` | `#cc8d2e` | Carbon footprint medium (0.7–1.6) |
| `--color-carbon-high` | `#d8582e` | Carbon footprint high (> 1.6) |

### Thème sombre — `app/components/theme.ts` (`DARK_TOKENS`)
Applied at runtime on `<html>` (client preference). Overrides:
`--color-bg #1f1a17` · `--color-surface #2a2421` · `--color-surface-muted #332c28`
· `--color-ink #f6efe8` · `--color-ink-soft #c4b8ae` · `--color-ink-faint #968a80`
· `--color-line #3d352f` · `--color-line-soft #352e29` · `--color-veg #6fb07e`
· `--color-veg-soft #2c3b30`.

### Accents alternatifs — `theme.ts` (`ACCENTS`)
Default = **Terracotta** (above). Alternates override accent/-deep/-soft/-ink:
- **Paprika** → `#c0392b` / `#992c20` / `#ffd9d2` / `#7e241a`
- **Ambre** → `#cc8d2e` / `#a06f1f` / `#fdecc8` / `#7a541a`
- **Olive** → `#6f8f3f` / `#566f30` / `#e6efcf` / `#42531f`

> ⚠️ **Dark-mode pitfall**: never transition `background`/`color` on the `body`
> when the value comes from a custom property that changes — the transition
> freezes the old value. `applyTheme` swaps tokens with `.no-transition` for one
> frame (see `app/globals.css`).

---

## 3. Typographie

Loaded via `next/font` (`app/layout.tsx`) into the `--font-*` `@theme` variables.

- **Display** — `--font-display: Newsreader, Georgia, serif`. Editorial titles;
  **one word often in *italic* accent colour** (« Que cuisiner en *juin* ? »).
- **UI / body** — `--font-sans: Hanken Grotesk, system-ui, sans-serif`.
- **Mono** — `--font-mono: Spline Sans Mono, ui-monospace, monospace`. Eyebrows,
  quantities, metadata, dates (`250 g`, `4 pers.`, `0.51 kg CO₂e`).

**Scale**: eyebrow 12 (mono, uppercase, `letter-spacing .14em`) · sm 13.5 ·
base 14.5 · md 16 · lg 18 · card title 21 · section 26 · page title 34 · hero 56.
Display headings: `letter-spacing: -0.02em`. Body line-height: 1.55.

**Casing**: initial capital only (no Title Case). Eyebrows in tracked UPPERCASE.

---

## 4. Spacing, rayons, ombres

Mirrored by `@theme`.

- **Radii**: `--radius-card: 22px` (cards/panels, “gourmand”) and
  `--radius-input: 14px` (inputs). **Pills** use Tailwind `rounded-full` (DS alias
  `--radius-pill` 99px). Dense views (Paramètres) may drop to 18/12.
- **Spacing**: Tailwind scale (4 · 8 · 12 · 16 · 22 · 32 · 48 px ≈ DS `--space-1..7`).
- **Shadows** (soft, warm-tinted):
  - `--shadow-card: 0 1px 2px rgb(64 48 40 / 0.06), 0 2px 8px rgb(64 48 40 / 0.05)`
  - `--shadow-card-lg: 0 4px 14px rgb(64 48 40 / 0.08), 0 12px 34px rgb(64 48 40 / 0.07)`
- **Layout**: `--container-content: 1200px` (→ `max-w-content`).

---

## 5. Motifs visuels & interactions

- **Backgrounds**: flat cream, **no decorative gradients**. Photos via Pexels;
  placeholders = warm deterministic gradients (hash of the slug).
- **Cards**: `--color-surface`, `--color-line-soft` border, `--radius-card`,
  `--shadow-card`. Hover: `translateY(-3px)` + `--shadow-card-lg`.
- **Hover**: surfaces → `--color-surface-muted`; accent button → `--color-accent-deep`.
  **Press**: `translateY(1px)`.
- **Text selection**: `--color-accent-soft` background.
- **Animations**: fades + short translations (.15–.4s, ease-out). “Sonar” status
  pulses. **No bounce.** Always honour `prefers-reduced-motion` (and never leave
  content at `opacity:0` at rest).
- **Chrome**: sticky top bar + **breadcrumb** (`Accueil › Section › Page`), sticky
  side rails. Desktop nav = `Recettes · Saisons · Plus` + “Créer une recette” CTA;
  logo = home.
- **Mobile**: bottom tab bar with a raised circular **“Créer” FAB**; notifications
  carried by the “Plus” tab + a badge on “Paramètres”.

---

## 6. Iconographie

**Stroke** icons, Lucide-like (stroke ~1.8), inline SVG (`app/components/icons.tsx`):
`chef`, `carrot`, `leaf`, `ruler`, `tool`, `sun`, `bell`, `dots`, `sliders`,
`home`, `book`, `calendar`, `cart`, `tag`, `folder`, `layers`, `grid`… **No
icon-font, no emoji as icons** (emoji very rare, never decorative).

---

## 7. Composants

Reusable, styled via tokens. All `rounded-full` except Card/Input.

- **Button** — `primary` = accent fill + white text + `--shadow-card`; `ghost` =
  `--color-line` outline; `soft` = `--color-surface-muted`. One `primary` per screen.
- **Badge** — status/tag pill. `neutral | accent | veg`. `accent` for category/active,
  `veg` for seasonal/positive.
- **Card** — rounded surface container (`--radius-card`, `--shadow-card`).
- **Input** — text field, `--radius-input`, accent ring on focus.
- **Chip** — on/off filter. Selected = `--color-ink` fill on `--color-bg`; else outline.

### Patterns notables
- **Combobox « + Créer »**: accent-insensitive search + on-the-fly creation
  (ingredients/units/aisles/types); incomplete entry → derived “À compléter” status.
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
