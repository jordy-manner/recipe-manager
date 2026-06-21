import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SETTINGS_NAV } from "../parametres/_nav";
import { Logo } from "./Logo";

const SAISONS_LINKS = [
  { label: "Ce mois-ci", href: "/saisons" },
  { label: "Toute l'année", href: "/saisons?m=1,2,3,4,5,6,7,8,9,10,11,12" },
  { label: "Printemps", href: "/saisons?m=3,4,5,6" },
  { label: "Été", href: "/saisons?m=6,7,8,9" },
  { label: "Automne", href: "/saisons?m=9,10,11,12" },
  { label: "Hiver", href: "/saisons?m=12,1,2,3" },
];

export async function SiteFooter({ recipeCount }: { recipeCount?: number }) {
  const release = process.env.APP_RELEASE ?? "dev";
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return (
    // footer-chrome: #101012 in dark, var(--color-surface) in light (see globals.css)
    <footer className="footer-chrome mt-14 border-t border-line-soft">
      {/* Mega sitemap */}
      <div className="mx-auto grid w-full max-w-content grid-cols-1 gap-10 px-[18px] pt-[60px] pb-10 sm:grid-cols-3 sm:px-8">
        {/* Recettes */}
        <div>
          <Link
            href="/recettes"
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-ink hover:text-ink transition-colors"
          >
            Recettes
          </Link>
          {categories.length === 0 ? (
            <p className="text-[13.5px] text-ink-faint">Aucune catégorie</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.name}>
                  <Link
                    href={`/recettes?cat=${encodeURIComponent(c.name)}`}
                    className="text-[13.5px] text-ink-soft hover:text-ink transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Saisons */}
        <div>
          <Link
            href="/saisons"
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-ink hover:text-ink transition-colors"
          >
            Saisons
          </Link>
          <ul className="space-y-2">
            {SAISONS_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] text-ink-soft hover:text-ink transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Paramètres */}
        <div>
          <Link
            href="/parametres"
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-ink hover:text-ink transition-colors"
          >
            Paramètres
          </Link>
          <div className="space-y-5">
            {SETTINGS_NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  {g.group}
                </p>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it.slug}>
                      <Link
                        href={`/parametres/${it.slug}`}
                        className="text-[13.5px] text-ink-soft hover:text-ink transition-colors"
                      >
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logo + copyright strip */}
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-6 border-t border-line-soft px-[18px] pb-12 pt-8 sm:px-8">
        <div className="flex flex-col items-start gap-2">
          <Logo size={46} />
          <p className="text-[12px] font-semibold tracking-[0.05em] text-ink-soft">
            Toutes vos recettes dans une même coquille
            {recipeCount != null && ` · ${recipeCount} recette${recipeCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <p className="text-[13.5px] text-ink-soft">
            © {new Date().getFullYear()} Sur le Plat. Tous droits réservés.
          </p>
          <span className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-[12px] text-ink-faint">
            Release {release}
          </span>
        </div>
      </div>
    </footer>
  );
}
