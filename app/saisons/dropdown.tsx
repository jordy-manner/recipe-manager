"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../components/icons";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: IconName;
  count?: number;
  /** "clear" → set apart (top border, accent text) for a reset action. */
  variant?: "clear";
};

/**
 * Custom listbox-style dropdown (a native <select> can't show icons, per-option
 * counts or colored selection). Closes on outside-click and Escape; the chosen
 * option's tone follows `tone` ("accent" → accent-soft/-ink, "ink" → dark).
 */
export function Dropdown({
  value,
  onChange,
  options,
  emptyLabel = "—",
  tone = "accent",
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  emptyLabel?: string;
  tone?: "accent" | "ink";
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cur = options.find((o) => o.value === value);
  const onClasses =
    tone === "ink" ? "bg-ink text-bg" : "bg-accent-soft text-accent-ink";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center gap-2 rounded-full border border-line bg-surface py-2 pl-3.5 pr-3 text-[14px] font-semibold text-ink transition hover:border-ink-faint"
      >
        {cur?.icon && <Icon name={cur.icon} size={15} className="shrink-0 text-ink-soft" />}
        <span className="flex-1 truncate text-left">{cur ? cur.label : emptyLabel}</span>
        {cur?.count != null && (
          <span className="font-mono text-[11.5px] text-ink-faint">{cur.count}</span>
        )}
        <Icon
          name="chevron"
          size={13}
          className={`shrink-0 rotate-90 text-ink-faint transition-transform ${open ? "-rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-input border border-line bg-surface py-1 shadow-card-lg"
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[14px] font-semibold transition ${
                  o.variant === "clear" ? "mt-1 border-t border-line-soft text-accent-ink" : ""
                } ${on ? onClasses : "text-ink-soft hover:bg-surface-muted"}`}
              >
                <span className="grid w-[18px] shrink-0 place-items-center">
                  {o.icon && <Icon name={o.icon} size={15} />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
                {o.count != null && (
                  <span className="font-mono text-[11.5px] opacity-70">{o.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
