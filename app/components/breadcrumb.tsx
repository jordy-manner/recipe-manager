'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { SETTINGS_ITEMS } from '../parametres/_nav';
import { buildCrumbs } from './breadcrumb-actions';
import type { Crumb } from './breadcrumb-actions';

// Synchronous static crumbs for the initial render (no DB — humanized slugs for
// dynamic segments). useEffect immediately replaces with DB-resolved values.
function buildStaticCrumbs(path: string): Crumb[] {
  const HOME: Crumb = { label: 'Accueil', href: '/', icon: 'home' };
  const SECTION: Record<string, Crumb> = {
    recettes: { label: 'Recettes', icon: 'book', href: '/recettes' },
    saisons: { label: 'Saisons', icon: 'leaf', href: '/saisons' },
    parametres: { label: 'Paramètres', icon: 'sliders', href: '/parametres' },
    'menu-semaine': { label: 'Menu de la semaine', icon: 'calendar', href: '/menu-semaine' },
    'liste-courses': { label: 'Liste de courses', icon: 'cart', href: '/liste-courses' },
    favoris: { label: 'Favoris', icon: 'heart', href: '/favoris' },
  };
  const humanize = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const seg = path.split('?')[0].split('/').filter(Boolean);
  const crumbs: Crumb[] = [HOME];
  if (!seg.length) return crumbs;
  const [root, a, b] = seg;

  if (root === 'recettes') {
    if (a === 'nouvelle') return [...crumbs, { label: 'Créer une recette', icon: 'plus', href: '/recettes/nouvelle' }];
    crumbs.push(SECTION.recettes);
    if (a) {
      crumbs.push({ label: humanize(a), href: `/recettes/${a}` });
      if (b === 'modifier') crumbs.push({ label: 'Modifier' });
    }
    return crumbs;
  }
  if (root === 'saisons') {
    crumbs.push(SECTION.saisons);
    if (a) crumbs.push({ label: humanize(a), href: `/saisons/${a}` });
    return crumbs;
  }
  if (root === 'parametres') {
    crumbs.push(SECTION.parametres);
    if (a) {
      const item = SETTINGS_ITEMS[a];
      crumbs.push({ label: item?.label ?? humanize(a), icon: item?.icon, href: `/parametres/${a}` });
    }
    return crumbs;
  }
  crumbs.push(SECTION[root] ?? { label: humanize(root), href: `/${root}` });
  return crumbs;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const [crumbs, setCrumbs] = useState<Crumb[]>(() => buildStaticCrumbs(pathname));

  useEffect(() => {
    buildCrumbs(pathname).then(setCrumbs);
  }, [pathname]);

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="fixed inset-x-0 top-[64px] z-30 hidden h-10 border-b border-line-soft bg-surface sm:block"
    >
      <ol className="mx-auto flex h-full w-full max-w-content items-center gap-1.5 px-8 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <Icon name="chevron" size={13} className="shrink-0 text-ink-faint" />}
              {last || !c.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
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
