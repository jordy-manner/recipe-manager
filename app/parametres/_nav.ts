import type { IconName } from "../components/icons";

// Side-rail sections for /parametres. Single source shared by the rail
// (_rail.tsx) and the global breadcrumb (FR labels + icons per sub-route).
// Client-safe: plain data only.

export type SettingsItem = { slug: string; label: string; icon: IconName };
export type SettingsGroup = { group: string; items: SettingsItem[] };

export const SETTINGS_NAV: SettingsGroup[] = [
  {
    group: "Préférences",
    items: [
      { slug: "general", label: "Général", icon: "sliders" },
      { slug: "apparence", label: "Apparence", icon: "palette" },
    ],
  },
  {
    group: "Catalogues",
    items: [
      { slug: "ingredients", label: "Ingrédients", icon: "carrot" },
      { slug: "ustensiles", label: "Ustensiles", icon: "tool" },
      { slug: "unites", label: "Unités", icon: "ruler" },
    ],
  },
  {
    group: "Référentiels",
    items: [
      { slug: "rayons", label: "Rayons", icon: "folder" },
      { slug: "types-unite", label: "Types d'unité", icon: "layers" },
      { slug: "tags", label: "Tags", icon: "tag" },
      { slug: "categories", label: "Catégories", icon: "grid" },
    ],
  },
  {
    group: "Données",
    items: [{ slug: "saisons", label: "Données de saison", icon: "leaf" }],
  },
];

/** Flat lookup of a settings sub-route by slug (label + icon). */
export const SETTINGS_ITEMS: Record<string, SettingsItem> = Object.fromEntries(
  SETTINGS_NAV.flatMap((g) => g.items).map((it) => [it.slug, it]),
);
