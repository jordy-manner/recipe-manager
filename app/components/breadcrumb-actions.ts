'use server';

import { prisma } from '@/lib/prisma';
import { SETTINGS_ITEMS } from '../parametres/_nav';
import type { IconName } from './icons';

export type Crumb = { label: string; href?: string; icon?: IconName };

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

export async function buildCrumbs(path: string): Promise<Crumb[]> {
  const seg = path.split('?')[0].split('/').filter(Boolean);
  const crumbs: Crumb[] = [HOME];
  if (!seg.length) return crumbs;
  const [root, a, b] = seg;

  if (root === 'recettes') {
    if (a === 'nouvelle') return [...crumbs, { label: 'Créer une recette', icon: 'plus', href: '/recettes/nouvelle' }];
    crumbs.push(SECTION.recettes);
    if (a) {
      const r = await prisma.recipe.findUnique({ where: { slug: a }, select: { title: true } });
      crumbs.push({ label: r?.title ?? humanize(a), href: `/recettes/${a}` });
      if (b === 'modifier') crumbs.push({ label: 'Modifier' });
    }
    return crumbs;
  }

  if (root === 'saisons') {
    crumbs.push(SECTION.saisons);
    if (a) {
      const ing = await prisma.ingredient.findUnique({ where: { slug: a }, select: { name: true } });
      crumbs.push({ label: ing?.name ?? humanize(a), href: `/saisons/${a}` });
    }
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
