"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";
import { SHEET_GROUPS, SHEET_ROUTES } from "./nav-data";

// Desktop-only "Plus" dropdown (≥ sm): a popover reusing the mobile sheet groups.
// Toggle on click, close on click-outside / Escape / navigation. Keyboard:
// ↑/↓ move between items, Escape closes and refocuses the trigger.
export function DesktopMoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const active = SHEET_ROUTES.some((r) => pathname.startsWith(r));
  const close = () => setOpen(false);

  // Close on outside pointerdown and on Escape (refocus the trigger).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // On open, move focus to the first menu item.
  useEffect(() => {
    if (open) {
      menuRef.current?.querySelector<HTMLAnchorElement>('[role="menuitem"]')?.focus();
    }
  }, [open]);

  // ↑/↓ cycle focus across the menu items.
  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? [],
    );
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      e.key === "ArrowDown"
        ? (i + 1) % items.length
        : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition ${
          active || open
            ? "bg-accent text-[#151517]"
            : "topbar-plus-inactive"
        }`}
      >
        <Icon name="dots" size={18} />
        Plus
        <Icon
          name="chevron"
          size={15}
          className={`transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Plus"
          onKeyDown={onMenuKeyDown}
          className="animate-fade-in absolute left-0 top-full z-50 mt-2 min-w-[290px] rounded-input border border-line bg-surface p-2.5 shadow-card-lg"
        >
          {SHEET_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5 [&:not(:first-child)]:mt-1.5">
              <p className="px-2.5 pb-1 pt-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                {group.title}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={close}
                  className="flex min-h-[40px] items-center gap-3 rounded-[10px] px-2.5 py-2 outline-none transition hover:bg-surface-muted focus-visible:bg-surface-muted"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-muted text-ink-soft">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold text-ink">{item.label}</span>
                    <span className="text-[12px] text-ink-faint">{item.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
