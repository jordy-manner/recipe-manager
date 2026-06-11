"use client";

import { useState } from "react";
import { Icon } from "./icons";

// Shared presentational helpers for the recipe screens.

/** Deterministic hue (0–360) derived from a string, for photo placeholders. */
export function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Formats a duration in minutes as "45 min" or "1 h 15". */
export function formatTime(min: number): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

const VEG_TAGS = new Set(["Végé", "Végétarien", "Healthy", "Vegan"]);

/** Tag/category badge. Veg-ish tags turn green; `accent` forces the accent look. */
export function Tag({
  children,
  accent = false,
}: {
  children: string;
  accent?: boolean;
}) {
  const veg = VEG_TAGS.has(children);
  const cls = veg
    ? "bg-green-soft text-green-ink"
    : accent
      ? "bg-accent-soft text-accent-ink"
      : "bg-surface-2 text-ink-soft";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}
    >
      {veg && <Icon name="leaf" size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}

/** Three dots showing difficulty 1–3. */
export function Difficulty({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[1, 2, 3].map((i) => (
        <i
          key={i}
          className={`block h-1.5 w-1.5 rounded-full ${i <= level ? "bg-accent" : "bg-line"}`}
        />
      ))}
    </span>
  );
}

/**
 * Recipe photo: the real image when available, otherwise a warm gradient
 * placeholder (hue derived from the title) with a faint diagonal weave.
 */
export function RecipePhoto({
  imageUrl,
  title,
  label,
  className = "",
}: {
  imageUrl?: string | null;
  title: string;
  label?: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const hue = hueFromString(title);
  const bg = `linear-gradient(150deg, oklch(0.72 0.13 ${hue}) 0%, oklch(0.58 0.15 ${hue - 12}) 100%)`;
  return (
    <div
      className={`photo-ph relative grid h-full w-full place-items-center ${className}`}
      style={{ ["--ph-bg" as string]: bg }}
    >
      <span className="relative z-[1] rounded-full bg-ink/25 px-2.5 py-1 font-mono text-[11px] tracking-wider text-white/80 backdrop-blur-[2px]">
        [ {label ?? "photo"} ]
      </span>
    </div>
  );
}

/** Cosmetic favorite toggle (local state only — no persistence yet). */
export function FavoriteButton({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn((v) => !v);
      }}
      aria-pressed={on}
      aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`grid place-items-center rounded-full transition ${
        on ? "bg-accent text-white" : "bg-surface/90 text-ink hover:text-accent"
      } ${className}`}
    >
      <Icon name="heart" size={16} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
