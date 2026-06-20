"use client";

import { useEffect, useState } from "react";
import { Icon } from "../components/icons";
import {
  ACCENTS,
  ACCENT_STORAGE,
  THEME_STORAGE,
  applyTheme,
  type AccentId,
  type ThemeMode,
} from "../components/theme";

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
];

export function ApparenceControls() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [accent, setAccent] = useState<AccentId>("Jaune");

  // Sync the controls with the preference the bootstrap script already applied.
  // localStorage is client-only (absent during SSR), so this must run after
  // mount — the initial light/Terracotta render matches the server markup.
  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE) as ThemeMode) || "dark";
    const a = (localStorage.getItem(ACCENT_STORAGE) as AccentId) || "Jaune";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a client-only store on mount
    setTheme(t);
    setAccent(a);
  }, []);

  const chooseTheme = (t: ThemeMode) => {
    setTheme(t);
    localStorage.setItem(THEME_STORAGE, t);
    applyTheme(t, accent);
  };
  const chooseAccent = (a: AccentId) => {
    setAccent(a);
    localStorage.setItem(ACCENT_STORAGE, a);
    applyTheme(theme, a);
  };

  return (
    <div className="space-y-4">
      <Card icon="palette" title="Thème" subtitle="Mode clair ou sombre.">
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const on = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseTheme(t.id)}
                aria-pressed={on}
                className={
                  "rounded-card border p-3 text-left transition " +
                  (on ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-ink-faint")
                }
              >
                <span
                  className="mb-2 flex h-16 flex-col gap-1.5 rounded-input p-2.5"
                  style={
                    t.id === "dark"
                      ? { background: "#151517", border: "1px solid #34343b" }
                      : { background: "#f3ecd8", border: "1px solid #e4dabf" }
                  }
                >
                  <span className="h-2 w-10 rounded-full" style={{ background: "#f5c700" }} />
                  <span
                    className="h-1.5 w-full rounded-full"
                    style={{ background: t.id === "dark" ? "#3d352f" : "#e4ddd5" }}
                  />
                  <span
                    className="h-1.5 w-2/3 rounded-full"
                    style={{ background: t.id === "dark" ? "#3d352f" : "#e4ddd5" }}
                  />
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {t.label}
                  {on && <Icon name="check" size={14} strokeWidth={2.6} className="text-accent" />}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card icon="sparkle" title="Couleur d'accent" subtitle="Teinte des boutons, liens et éléments actifs.">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const on = accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => chooseAccent(a.id)}
                aria-pressed={on}
                className="flex flex-col items-center gap-1.5"
                title={a.id}
              >
                <span
                  className={
                    "grid h-10 w-10 place-items-center rounded-full text-surface transition " +
                    (on ? "ring-2 ring-offset-2 ring-offset-surface" : "")
                  }
                  style={{ background: a.value, boxShadow: on ? `0 0 0 2px ${a.value}` : undefined }}
                >
                  {on && <Icon name="check" size={16} strokeWidth={2.6} />}
                </span>
                <span className={"text-xs " + (on ? "font-semibold text-ink" : "text-ink-soft")}>
                  {a.id}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: "palette" | "sparkle";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-surface-muted text-accent-ink">
          <Icon name={icon} size={18} />
        </span>
        <div>
          <b className="text-sm text-ink">{title}</b>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
