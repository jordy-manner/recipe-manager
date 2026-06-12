import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon, type IconName } from "./icons";

// Global breadcrumb, pinned under the TopBar on ≥ sm (hidden on mobile, where the
// bottom tab bar is the nav). Server Component: reads the current path from the
// `x-pathname` header set by the proxy (proxy.ts) and resolves dynamic labels
// (recipe title, produce name) from the DB. The last crumb is the current page.

type Crumb = { label: string; href?: string; icon?: IconName };

const HOME: Crumb = { label: "Accueil", href: "/", icon: "home" };

// Known top-level sections (label + icon) for the crumb after Accueil.
const SECTION: Record<string, { label: string; icon: IconName; href: string }> = {
  recettes: { label: "Recettes", icon: "book", href: "/recettes" },
  saisons: { label: "Saisons", icon: "leaf", href: "/saisons" },
  parametres: { label: "Paramètres", icon: "sliders", href: "/parametres" },
  "menu-semaine": { label: "Menu de la semaine", icon: "calendar", href: "/menu-semaine" },
  "liste-courses": { label: "Liste de courses", icon: "cart", href: "/liste-courses" },
  favoris: { label: "Favoris", icon: "heart", href: "/favoris" },
};

const humanize = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

async function buildCrumbs(path: string): Promise<Crumb[]> {
  const seg = path.split("?")[0].split("/").filter(Boolean);
  const crumbs: Crumb[] = [HOME];
  if (!seg.length) return crumbs;
  const [root, a, b] = seg;

  if (root === "recettes") {
    if (a === "nouvelle") return [...crumbs, { label: "Créer une recette", icon: "plus", href: "/recettes/nouvelle" }];
    crumbs.push(SECTION.recettes);
    if (a) {
      const r = await prisma.recipe.findUnique({ where: { slug: a }, select: { title: true } });
      crumbs.push({ label: r?.title ?? humanize(a), href: `/recettes/${a}` });
      if (b === "modifier") crumbs.push({ label: "Modifier" });
    }
    return crumbs;
  }

  if (root === "saisons") {
    crumbs.push(SECTION.saisons);
    if (a) {
      const ing = await prisma.ingredient.findUnique({ where: { slug: a }, select: { name: true } });
      crumbs.push({ label: ing?.name ?? humanize(a), href: `/saisons/${a}` });
    }
    return crumbs;
  }

  if (root === "parametres") {
    crumbs.push(SECTION.parametres);
    if (a) crumbs.push({ label: humanize(a), href: `/parametres/${a}` });
    return crumbs;
  }

  // Single-segment secondary destinations (and any other known section).
  crumbs.push(SECTION[root] ?? { label: humanize(root), href: `/${root}` });
  return crumbs;
}

export async function Breadcrumb() {
  const path = (await headers()).get("x-pathname") ?? "/";
  const crumbs = await buildCrumbs(path);

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="fixed inset-x-0 top-[68px] z-30 hidden h-10 border-b border-line-soft bg-bg sm:block"
    >
      <ol className="mx-auto flex h-full w-full max-w-content items-center gap-1.5 px-8 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <Icon name="chevron" size={13} className="shrink-0 text-ink-faint" />}
              {last || !c.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className="flex min-w-0 max-w-[360px] items-center gap-1.5 font-semibold text-accent-ink"
                >
                  {c.icon && <Icon name={c.icon} size={14} className="shrink-0" />}
                  <span className="truncate">{c.label}</span>
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="flex shrink-0 items-center gap-1.5 text-ink-soft transition hover:text-ink"
                >
                  {c.icon && <Icon name={c.icon} size={14} className="shrink-0" />}
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
