"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icons";
import { SHEET_GROUPS, SHEET_ROUTES } from "./nav-data";

// Mobile-only navigation (hidden ≥ sm): a fixed bottom tab bar with a raised
// center "Créer" action, plus a "Plus" tab opening a bottom sheet for the
// secondary destinations. Desktop keeps the top-bar nav.

type Tab = { label: string; href: string; icon: IconName };

const TABS: Tab[] = [
  { label: "Accueil", href: "/", icon: "home" },
  { label: "Recettes", href: "/recettes", icon: "book" },
  { label: "Saisons", href: "/saisons", icon: "leaf" },
];

/** Active tab. Order matters: "/recettes/nouvelle" belongs to Créer, not Recettes. */
function tabActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/recettes")
    return pathname.startsWith("/recettes") && pathname !== "/recettes/nouvelle";
  return pathname.startsWith(href);
}

export function MobileTabBar({ notifCount = 0 }: { notifCount?: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);

  const createActive = pathname === "/recettes/nouvelle";
  const moreActive = SHEET_ROUTES.some((r) => pathname.startsWith(r));

  // While the sheet is open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] sm:hidden"
      >
        <ul className="mx-auto flex max-w-content items-stretch px-1">
          {TABS.slice(0, 2).map((tab) => (
            <TabItem key={tab.href} tab={tab} active={tabActive(pathname, tab.href)} />
          ))}

          {/* Créer — raised center action. */}
          <li className="flex flex-1 justify-center">
            <Link
              href="/recettes/nouvelle"
              aria-label="Créer une recette"
              aria-current={createActive ? "page" : undefined}
              className="-mt-5 flex min-h-[44px] flex-col items-center gap-1"
            >
              <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-white shadow-card-lg ring-4 ring-bg transition active:translate-y-px">
                <Icon name="plus" size={24} />
              </span>
              <span
                className={`text-[11px] font-semibold ${createActive ? "text-accent" : "text-ink-faint"}`}
              >
                Créer
              </span>
            </Link>
          </li>

          <TabItem key={TABS[2].href} tab={TABS[2]} active={tabActive(pathname, TABS[2].href)} />

          {/* Plus — opens the bottom sheet. */}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-current={moreActive ? "page" : undefined}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition ${
                moreActive ? "text-accent" : "text-ink-faint hover:text-ink"
              }`}
            >
              <span className="relative">
                <Icon name="dots" size={22} />
                {notifCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-white ring-2 ring-bg"
                  >
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold">Plus</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Plus"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMore();
          }}
          className="animate-fade-in fixed inset-0 z-50 flex flex-col justify-end bg-ink/40 backdrop-blur-[2px] sm:hidden"
        >
          <div className="animate-sheet-up rounded-t-[26px] bg-bg pb-[max(env(safe-area-inset-bottom),20px)] shadow-card-lg">
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between px-6 pb-1 pt-3">
              <h2 className="font-display text-[20px] font-semibold">Plus</h2>
              <button
                type="button"
                onClick={closeMore}
                aria-label="Fermer"
                className="grid h-[36px] w-[36px] place-items-center rounded-full bg-surface text-ink shadow-card transition hover:text-accent"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5 px-4 pb-2 pt-2">
              {SHEET_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-1">
                  <p className="px-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    {group.title}
                  </p>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMore}
                      className="flex min-h-[56px] items-center gap-3.5 rounded-input px-3 text-ink-soft transition hover:bg-surface-muted hover:text-ink"
                    >
                      <span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[12px] bg-surface-muted text-ink-soft">
                        <Icon name={item.icon} size={20} />
                      </span>
                      <span className="flex-1 text-[15.5px] font-semibold">{item.label}</span>
                      <Icon name="chevron" size={18} className="text-ink-faint" />
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <li className="flex flex-1">
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition ${
          active ? "text-accent" : "text-ink-faint hover:text-ink"
        }`}
      >
        <Icon name={tab.icon} size={22} />
        <span className="text-[11px] font-semibold">{tab.label}</span>
      </Link>
    </li>
  );
}
