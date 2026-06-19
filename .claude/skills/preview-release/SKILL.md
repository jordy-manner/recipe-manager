---
name: preview-release
description: Commit versionné quotidien du projet → déploiement Preview Vercel. À utiliser dès qu'il faut commiter / tagger / livrer une étape de travail (ex. « commit », « preview-release », « livre cette étape », « tague »). Développe sur la branche de version (vX.Y), crée un tag patch incrémenté, puis pousse la branche de version (ce qui déclenche un Preview Vercel sur la base dev). NE merge PAS dans main (la mise en prod se fait via la skill prod-release). Impose une validation explicite du commit par l'utilisateur, quel que soit le mode de permission.
---

# preview-release — commit versionné → Preview

Convention de versioning du projet. Le développement se fait **toujours sur la branche de version** (ex. `v0.1`), **jamais directement sur `main`**.

- Push de la **branche de version** → déploiement **Preview** Vercel (sur la base Neon **dev**).
- La mise en **production** est **découplée** : elle se fait via la skill **`prod-release`** (merge dans `main`). Cette skill-ci **ne touche jamais `main`**.

## ⚠️ Conventions de rédaction (OBLIGATOIRES)

Avant tout commit, s'assurer que :

1. **Tous les commentaires de code sont en ANGLAIS** (`//`, `/* */`, JSDoc `/** */`, commentaires JSX `{/* */}`, `//` Prisma). Tout commentaire français introduit/modifié dans le diff doit être traduit avant de commiter. L'**UI et les données restent en français** (texte affiché, `lang="fr"`, page « En construction » du `proxy.ts`, noms d'ingrédients/unités/ustensiles du seed) — seuls les **commentaires** passent en anglais.
2. **Le `CHANGELOG.md` est mis à jour AVANT le commit** (cf. étape 3) : l'entrée de la release fait partie du commit du tag.
3. **Le `CHANGELOG.md` est rédigé en ANGLAIS**, dans le style des entrées existantes.
4. **Le `CONTEXT.md` est mis à jour (en ANGLAIS) AVANT le commit** dès que l'architecture, le modèle de données Prisma, les routes ou les conventions ont changé. C'est le doc d'onboarding transmis aux autres IA/devs : il doit refléter l'état RÉEL de l'app au moment du commit.
5. **Design tokens synchronisés** : si un token visuel (couleur, typo, rayon, ombre, thème, accent) a changé, la modif est répercutée AU MÊME MOMENT dans `DESIGN.md` **et** le `@theme` de `app/globals.css` (+ `app/components/theme.ts` pour dark/accents). Lancer `npm run check:design` — il doit passer (il tourne aussi dans `vercel-build`, donc une divergence casse le déploiement).

## ⚠️ Règle absolue — validation du commit

Quel que soit le mode de permission (y compris `acceptEdits`, auto-accept, `bypassPermissions`), **NE JAMAIS exécuter `git commit` sans une validation EXPLICITE de l'utilisateur dans le tour courant**.

- Présenter d'abord la liste des fichiers stagés **et** le message de commit proposé.
- Attendre un accord clair (« ok », « go », « valide », « commit »…).
- En l'absence de validation explicite → s'arrêter, ne pas commiter.

Cette règle prime sur tout réglage de permissions.

## Étapes

1. **Se placer sur la branche de version.** C'est la branche courante si elle correspond à `vX.Y` ; sinon `git checkout <branche-version>`. Ne jamais commiter sur `main`.
2. **Préambule — identité + prochain tag + bump `APP_RELEASE`.**
   - Garde-fou identité : `git config --local user.name "jordy-manner"` et `git config --local user.email "jordy.manner@milkcreation.fr"`.
   - Synchroniser les tags distants : `git fetch --tags` (obligatoire — un tag peut avoir été poussé depuis un autre worktree et être absent localement, ce qui ferait calculer un numéro déjà pris).
   - Lire le dernier tag **reachable depuis HEAD** : `git describe --tags --abbrev=0` (ex. `v0.1.6`). Incrémenter le **patch** → `vX.Y.Z` (ex. `v0.1.7`). Si le tag calculé existe déjà (`git tag -l vX.Y.Z`), incrémenter à nouveau. Le `major.minor` suit le nom de la branche de version. **Mémoriser ce `vX.Y.Z`** (sert ici ET au tag).
   - Écrire `APP_RELEASE=vX.Y.Z` dans `.env` (le `.env` commité correspond toujours à son tag ; le footer de l'app affiche cette version).
3. **Mettre à jour le `CHANGELOG.md` (OBLIGATOIRE à chaque release).** Ajouter en **haut de la liste** (juste sous l'intro, avant l'entrée précédente) une nouvelle section pour le tag courant :
   - En-tête `## [vX.Y.Z] — AAAA-MM-JJ` (date du jour).
   - Une à quelques puces résumant les évolutions de cette release (features, correctifs, breaking changes notables).
   - **Le CHANGELOG est rédigé en ANGLAIS** (comme les commentaires de code). Rester concis et factuel, dans le style des entrées existantes.
   - Ce fichier sera stagé avec le reste à l'étape suivante : l'entrée fait donc partie du commit du tag.
4. **Stager + garde-fou secrets.** `git add -A`, puis vérifier que `.env.local` / `settings.local.json` (et tout secret) **ne sont pas** dans l'index :
   `git diff --cached --name-only | grep -iE '\.env\.local|settings\.local\.json'` doit être vide. Si non → `git reset` et stopper.
5. **Demander validation** (cf. règle absolue) : montrer `git diff --cached --name-only` + le message proposé (qui DOIT déjà inclure le pied « consommation de tokens », cf. section dédiée). Mentionner le bump `APP_RELEASE` → `vX.Y.Z` et l'entrée CHANGELOG ajoutée.
6. **Commit** (uniquement après validation) : `git commit`. Le message se termine par le pied de tokens (dernière ligne), **sans** `Co-Authored-By`.
7. **Tag annoté** : `git tag -a vX.Y.Z -m "vX.Y.Z — <résumé>"` — le même `vX.Y.Z` que le préambule.
8. **Push branche de version + tag → Preview.** L'identité ayant été posée à l'étape 2 : `git push origin <branche-version>` puis `git push origin vX.Y.Z`. Ce push déclenche un **Preview** Vercel. (Pas de force-push : c'est un fast-forward sur la branche de version.)
9. **Rester sur la branche de version.** Ne jamais merger `main` ici.

> Note push : remote `origin` = repo public `jordy-manner/mealoday` en **HTTPS** (jeton `gh` ; la clé SSH de la machine appartient à un autre compte). Le push de la branche de version est non destructif (fast-forward) ; on peut le faire dans la foulée du commit validé. La prod (`main`) reste hors de cette skill.

## Pied de message — consommation de tokens

Chaque message de commit se termine par une ligne de **consommation cumulée de tokens du projet** (peu coûteux : simple parsing local des transcripts), en **toute dernière ligne**.

> **Pas de trailer `Co-Authored-By`.** Attribution unique `jordy-manner <jordy.manner@milkcreation.fr>` (config git locale). Ne jamais ajouter de co-auteur Claude.

Générer la ligne avec :

```bash
node -e '
const fs=require("fs");
const dir="/home/jmanner/.claude/projects/-home-jmanner-www-html---lab-mealoday-main";
let i=0,cw=0,cr=0,o=0;
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".jsonl")))
  for(const l of fs.readFileSync(dir+"/"+f,"utf8").split("\n")){
    if(!l.trim())continue; let j; try{j=JSON.parse(l)}catch{continue}
    const u=j.message&&j.message.usage; if(!u)continue;
    i+=u.input_tokens||0; cw+=u.cache_creation_input_tokens||0; cr+=u.cache_read_input_tokens||0; o+=u.output_tokens||0;
  }
const M=n=>(n/1e6).toFixed(2)+"M", k=n=>Math.round(n/1000)+"k";
console.log(`Tokens-projet: ~${M(i+cw+cr+o)} total (output ${k(o)}, cache-write ${M(cw)}, cache-read ${M(cr)}, input ${k(i)})`);
'
```

Forme du message :

```
<titre>

<corps>

Tokens-projet: ~XX.XXM total (output …k, cache-write …M, cache-read …M, input …k)
```

## Historique (référence)

`v0.0.0` setup → `v0.1.0` CRUD → `v0.1.1` ingrédients/tags → `v0.1.2` skill commit → `v0.1.3` ingrédients structurés → `v0.1.4` tags autocomplete → `v0.1.5` footer/APP_RELEASE → `v0.1.6` prépa Vercel. Prochain tag attendu : `v0.1.7`.
