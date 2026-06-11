"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

/** Marmite. wordmark with the accent dot. */
export function Brand({ size = 21 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent text-white shadow-soft">
        <Icon name="chef" size={20} />
      </span>
      <span className="font-display text-[21px] font-semibold" style={{ fontSize: size }}>
        Marmite<span className="text-accent">.</span>
      </span>
    </span>
  );
}

const NAV = [{ label: "Accueil", href: "/recipes" }];

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-bg/[0.88] backdrop-blur-[12px]">
      <div className="mx-auto flex h-[68px] w-full max-w-[1180px] items-center gap-7 px-[18px] sm:px-8">
        <Link href="/recipes" className="shrink-0">
          <Brand />
        </Link>

        <nav className="hidden gap-1 sm:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/recipes"
                ? pathname === "/recipes" || pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition ${
                  active
                    ? "bg-accent-soft text-accent-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <Link
          href="/recipes"
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink sm:inline-flex"
        >
          <Icon name="search" size={17} /> Rechercher
        </Link>
        <Link
          href="/recipes/new"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-soft transition hover:bg-accent-deep active:translate-y-px"
        >
          <Icon name="plus" size={17} />
          <span className="hidden sm:inline">Créer une recette</span>
          <span className="sm:hidden">Créer</span>
        </Link>
      </div>
    </header>
  );
}
