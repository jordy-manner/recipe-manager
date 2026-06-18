"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { DesktopMoreMenu } from "./nav-more-menu";
import { NotifBell } from "./notif-bell";
import { Logo } from "./Logo";
import type { Notifications } from "@/lib/notifications";

const NAV: { label: string; href: string; icon: IconName }[] = [
  { label: "Recettes", href: "/recettes", icon: "book" },
  { label: "Saisons", href: "/saisons", icon: "leaf" },
];

const isActive = (pathname: string, href: string): boolean => pathname.startsWith(href);

export function TopBar({ notif }: { notif: Notifications }) {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line-soft bg-ink/90 backdrop-blur-[12px]">
      <div className="mx-auto flex h-[64px] w-full max-w-content items-center gap-[22px] px-[18px] sm:px-8">
        <Link href="/" className="shrink-0">
          <Logo color="white" size={21} />
        </Link>

        {/* Desktop nav — dark top bar: inactive white/75, active accent fill, hover white/12. */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition ${
                  active
                    ? "bg-accent text-white"
                    : "text-white/75 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </Link>
            );
          })}
          <DesktopMoreMenu dark />
        </nav>

        <div className="flex-1" />

        {/* Desktop CTA. */}
        <Link
          href="/recettes/nouvelle"
          className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-white shadow-card transition hover:bg-accent-deep active:translate-y-px sm:inline-flex"
        >
          <Icon name="plus" size={17} /> Créer une recette
        </Link>

        {/* Desktop notification bell — dark top bar variant. */}
        <div className="hidden shrink-0 sm:block">
          <NotifBell items={notif.items} todoCount={notif.todoCount} placement="desktop" dark />
        </div>
      </div>
    </header>
  );
}
