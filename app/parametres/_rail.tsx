"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../components/icons";
import { SETTINGS_NAV } from "./_nav";

// Sticky side rail: grouped sections (Préférences / Catalogues / Données). The
// active item (matched on the current path) is highlighted with the accent.
// `sectionCounts` drives an accent count badge on the catalog sections with
// entries still "À compléter".
export function SettingsRail({
  release,
  sectionCounts,
}: {
  release?: string;
  sectionCounts?: { ingredients: number; unites: number };
}) {
  const pathname = usePathname();
  const active = pathname.split("/")[2] ?? "";
  const countFor = (slug: string): number =>
    slug === "ingredients"
      ? (sectionCounts?.ingredients ?? 0)
      : slug === "unites"
        ? (sectionCounts?.unites ?? 0)
        : 0;

  return (
    <aside className="sm:sticky sm:top-[124px] sm:self-start">
      <nav aria-label="Sections des paramètres" className="flex flex-col gap-5">
        {SETTINGS_NAV.map((g) => (
          <div key={g.group} className="flex flex-col gap-1">
            <span className="px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              {g.group}
            </span>
            {g.items.map((it) => {
              const on = it.slug === active;
              const count = countFor(it.slug);
              return (
                <Link
                  key={it.slug}
                  href={`/parametres/${it.slug}`}
                  aria-current={on ? "page" : undefined}
                  className={
                    "flex items-center gap-2.5 rounded-input px-3 py-2 text-sm transition " +
                    (on
                      ? "bg-accent-soft font-semibold text-accent-ink"
                      : "text-ink-soft hover:bg-surface-muted hover:text-ink")
                  }
                >
                  <Icon name={it.icon} size={18} className="shrink-0" />
                  <span className="flex-1">{it.label}</span>
                  {count > 0 && (
                    <span
                      className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-[#151517]"
                      title={`${count} à compléter`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {release && (
        <div className="mt-6 px-3 font-mono text-[11px] text-ink-faint">
          Sur le Plat · {release}
        </div>
      )}
    </aside>
  );
}
