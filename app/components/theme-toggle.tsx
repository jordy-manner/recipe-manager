"use client";

import { useEffect, useState } from "react";
import { applyTheme, ACCENT_STORAGE, THEME_STORAGE, type ThemeMode } from "./theme";

/** Lightbulb toggle: off = light mode, on (yellow) = dark mode. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    setTheme((localStorage.getItem(THEME_STORAGE) as ThemeMode) || "dark");
  }, []);

  const toggle = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE, next);
    applyTheme(next, localStorage.getItem(ACCENT_STORAGE) || "Jaune");
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-pressed={isDark}
      className={`grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/[0.12] ${className}`}
    >
      {/* Lightbulb icon: filled yellow when dark (on), stroked dim when light (off) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={isDark ? "#f5c700" : "none"}
        stroke={isDark ? "#f5c700" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    </button>
  );
}
