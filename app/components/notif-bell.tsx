"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import type { NotifItem } from "@/lib/notifications";

// Notification bell + "À traiter" panel. The data is computed server-side
// (lib/notifications) and passed in; this component only handles the popover
// interaction. Rendered twice from the TopBar (desktop / mobile placements);
// the badge counts the `todo` items, `info` items are shown but not counted.

export function NotifBell({
  items,
  todoCount,
  placement,
  dark = false,
}: {
  items: NotifItem[];
  todoCount: number;
  placement: "desktop" | "mobile";
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape. (Each panel link also closes on click.)
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

  const badge = todoCount > 99 ? "99+" : String(todoCount);
  const panelPos =
    placement === "desktop"
      ? "absolute right-0 top-[calc(100%+8px)] w-[360px]"
      : "fixed inset-x-3 top-[64px]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={todoCount > 0 ? `Notifications, ${todoCount} à traiter` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative grid h-[42px] w-[42px] place-items-center rounded-full border transition ${
          dark
            ? "border-white/[0.16] bg-white/[0.08] text-white/85 hover:border-white/40 hover:text-white"
            : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
        }`}
      >
        <Icon name="bell" size={19} />
        {todoCount > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ${dark ? "ring-ink" : "ring-bg"}`}>
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="À traiter"
          className={`z-50 overflow-hidden rounded-card border border-line bg-surface shadow-card-lg ${panelPos}`}
        >
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <b className="font-display text-[17px] text-ink">À traiter</b>
            <span className="font-mono text-[12px] text-ink-faint">
              {items.length === 0
                ? "0"
                : `${items.length} élément${items.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-soft">Tout est à jour 🎉</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto p-1.5">
              {items.map((it, i) => (
                <li key={`${it.href}-${i}`} role="none">
                  <Link
                    role="menuitem"
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-input px-2.5 py-2 transition hover:bg-surface-muted"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${
                        it.kind === "todo"
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-amber-soft text-amber-ink"
                      }`}
                    >
                      <Icon name={it.icon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">
                        {it.label}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-soft">{it.sub}</span>
                    </span>
                    <Icon name="chevron" size={15} className="shrink-0 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/parametres"
            onClick={() => setOpen(false)}
            className="block border-t border-line-soft px-4 py-2.5 text-center text-[13px] font-semibold text-accent-ink transition hover:bg-accent-soft"
          >
            Tout voir dans les Paramètres
          </Link>
        </div>
      )}
    </div>
  );
}
