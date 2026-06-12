"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { DesktopMoreMenu } from "./nav-more-menu";
import { NotifBell } from "./notif-bell";
import type { Notifications } from "@/lib/notifications";

/** Marmite. wordmark with the accent dot. */
export function Brand({ size = 21 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent text-white shadow-card">
        <Icon name="chef" size={20} />
      </span>
      <span className="font-display text-[21px] font-semibold" style={{ fontSize: size }}>
        Marmite<span className="text-accent">.</span>
      </span>
    </span>
  );
}

// Primary desktop nav. Accueil is reached via the logo; the secondary
// destinations live in the "Plus" dropdown (DesktopMoreMenu / nav-data).
const NAV: { label: string; href: string; icon: IconName }[] = [
  { label: "Recettes", href: "/recettes", icon: "book" },
  { label: "Saisons", href: "/saisons", icon: "leaf" },
];

const isActive = (pathname: string, href: string): boolean => pathname.startsWith(href);

export function TopBar({ notif }: { notif: Notifications }) {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line-soft bg-bg/[0.88] backdrop-blur-[12px]">
      <div className="mx-auto flex h-[68px] w-full max-w-content items-center gap-4 px-[18px] sm:gap-7 sm:px-8">
        <Link href="/" className="shrink-0">
          <Brand />
        </Link>

        {/* Desktop nav: icon links + the "Plus" dropdown (secondary routes). */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition ${
                  active
                    ? "bg-accent-soft text-accent-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </Link>
            );
          })}
          <DesktopMoreMenu />
        </nav>

        <div className="flex-1" />

        {/* Mobile: logo only (full navigation lives in the bottom tab bar; search
            is reached via the Recettes tab, notifications via the "Plus" badge). */}

        {/* Desktop CTA. */}
        <Link
          href="/recettes/nouvelle"
          className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-card transition hover:bg-accent-deep active:translate-y-px sm:inline-flex"
        >
          <Icon name="plus" size={17} /> Créer une recette
        </Link>

        {/* Desktop notification bell — far right, after the CTA. */}
        <div className="hidden shrink-0 sm:block">
          <NotifBell items={notif.items} todoCount={notif.todoCount} placement="desktop" />
        </div>
      </div>
    </header>
  );
}
