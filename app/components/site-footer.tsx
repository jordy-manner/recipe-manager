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
    <footer className="mt-14 border-t border-white/[0.08] bg-ink">
      {/* Mega sitemap */}
      <div className="mx-auto grid w-full max-w-content grid-cols-1 gap-10 px-[18px] pt-[60px] pb-10 sm:grid-cols-3 sm:px-8">
        {/* Recettes */}
        <div>
          <Link
            href="/recettes"
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-white/90 hover:text-white"
          >
            Recettes
          </Link>
          {categories.length === 0 ? (
            <p className="text-[13.5px] text-white/40">Aucune catégorie</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.name}>
                  <Link
                    href={`/recettes?cat=${encodeURIComponent(c.name)}`}
                    className="text-[13.5px] text-white/55 hover:text-white transition-colors"
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
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-white/90 hover:text-white"
          >
            Saisons
          </Link>
          <ul className="space-y-2">
            {SAISONS_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[13.5px] text-white/55 hover:text-white transition-colors"
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
            className="mb-4 block text-[13.5px] font-semibold uppercase tracking-[0.1em] text-white/90 hover:text-white"
          >
            Paramètres
          </Link>
          <div className="space-y-5">
            {SETTINGS_NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  {g.group}
                </p>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it.slug}>
                      <Link
                        href={`/parametres/${it.slug}`}
                        className="text-[13.5px] text-white/55 hover:text-white transition-colors"
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
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-6 border-t border-white/[0.08] px-[18px] pb-12 pt-8 sm:px-8">
        <div className="flex flex-col items-center gap-2">
          <Logo size={42} color="white" />
          <p
            style={{
              fontFamily: "var(--font-outfit, Outfit, system-ui, sans-serif)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            Orchestrer vos menus
            {recipeCount != null && ` · ${recipeCount} recette${recipeCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <p className="text-[13.5px] text-white/50">
            © {new Date().getFullYear()} Mealoday. Tous droits réservés.
          </p>
          <span className="rounded-md bg-white/[0.08] px-2.5 py-1 font-mono text-[12px] text-white/[0.62]">
            Release {release}
          </span>
        </div>
      </div>
    </footer>
  );
}
