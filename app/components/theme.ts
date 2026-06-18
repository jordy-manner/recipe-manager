// Theme + accent tokens for the Apparence settings. Theme/accent are a CLIENT
// preference (localStorage) applied by overriding the --color-* custom
// properties on <html> at runtime — Tailwind v4 utilities read those vars, so
// the override re-cascades across the whole app without a rebuild.
//
// Dark-mode pitfall: never transition the body background/color tied to a
// custom property (the transition freezes the old value). We swap tokens
// instantly and suppress transitions for one frame via the `no-transition`
// class (see globals.css) so nothing animates the var() change.

export const THEME_STORAGE = "mealoday-theme";
export const ACCENT_STORAGE = "mealoday-accent";

export type ThemeMode = "light" | "dark";

export const ACCENTS = [
  { id: "Terracotta", value: "#d8582e", deep: "#a73a1b", soft: "#ffdfcb", ink: "#852b09" },
  { id: "Paprika", value: "#c0392b", deep: "#992c20", soft: "#ffd9d2", ink: "#7e241a" },
  { id: "Ambre", value: "#cc8d2e", deep: "#a06f1f", soft: "#fdecc8", ink: "#7a541a" },
  { id: "Olive", value: "#6f8f3f", deep: "#566f30", soft: "#e6efcf", ink: "#42531f" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

// Token values per theme. Keys map to --color-<key>. Light mirrors globals.css.
export const LIGHT_TOKENS: Record<string, string> = {
  bg: "#fff3e9",
  surface: "#fffdf8",
  "surface-muted": "#faebe0",
  ink: "#271d18",
  "ink-soft": "#665751",
  "ink-faint": "#91837c",
  line: "#e4ddd5",
  "line-soft": "#ece7e1",
  veg: "#4b8b5a",
  "veg-soft": "#d6f0da",
};

export const DARK_TOKENS: Record<string, string> = {
  bg: "#1f1a17",
  surface: "#2a2421",
  "surface-muted": "#332c28",
  ink: "#f6efe8",
  "ink-soft": "#c4b8ae",
  "ink-faint": "#968a80",
  line: "#3d352f",
  "line-soft": "#352e29",
  veg: "#6fb07e",
  "veg-soft": "#2c3b30",
};

/** Applies theme + accent to <html> (client-only — touches the DOM). */
export function applyTheme(theme: ThemeMode, accentId: string) {
  const root = document.documentElement;
  // Suppress transitions for one frame to avoid freezing the var() change.
  root.classList.add("no-transition");
  root.setAttribute("data-theme", theme);
  const tokens = theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--color-${k}`, v);
  const a = ACCENTS.find((x) => x.id === accentId) ?? ACCENTS[0];
  root.style.setProperty("--color-accent", a.value);
  root.style.setProperty("--color-accent-deep", a.deep);
  root.style.setProperty("--color-accent-soft", a.soft);
  root.style.setProperty("--color-accent-ink", a.ink);
  requestAnimationFrame(() => root.classList.remove("no-transition"));
}
