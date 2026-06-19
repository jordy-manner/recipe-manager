---
name: git-reviewed
description: Traite les PRs marquées Status:Reviewed — sélection par checklist, squash merge dans la branche de base, preview-release (patch bump + déploiement Vercel), nettoyage branche/labels/issue/worktree. Un preview-release par PR, séquentiellement.
---

# git-reviewed — merge & release des PRs reviewées

Workflow de merge pour les PRs ayant passé la review. Pour chaque PR sélectionnée : squash merge → preview-release → nettoyage complet. Traitement **séquentiel**, une PR à la fois.

## Étapes

### 1. Lister les PRs reviewées

```bash
gh pr list \
  --label "Status:Reviewed" \
  --json number,title,headRefName,baseRefName,body \
  --jq '.[] | "\(.number)\t\(.title)\t[\(.headRefName) → \(.baseRefName)]"'
```

Si la liste est vide → afficher `Aucune PR avec le label Status:Reviewed.` et s'arrêter.

---

### 2. Sélection par checklist

Utiliser `AskUserQuestion` avec `multiSelect: true`. Chaque option = une PR :

- **label** : `#42 — Titre de la PR`
- **description** : `feat/42-slug → v0.4`

Attendre la sélection. Si aucune PR sélectionnée → s'arrêter.

---

### 3. Traitement séquentiel — pour chaque PR sélectionnée

Répéter les étapes 3a à 3g dans l'ordre, une PR après l'autre. Ne pas passer à la PR suivante avant que toutes les étapes de la PR courante soient terminées.

#### 3a. Récupérer les détails complets de la PR

```bash
gh pr view {number} --json number,title,headRefName,baseRefName,body,labels
```

Extraire :
- `headRefName` = branche feature (ex. `feat/42-local-image-storage`)
- `baseRefName` = branche de version cible (ex. `v0.4`)
- **Issue liée** : chercher dans `body` un pattern `closes #N`, `fixes #N`, `refs #N` (insensible à la casse). Mémoriser le numéro d'issue. S'il n'y en a pas → noter `no linked issue` et sauter l'étape 3f sans erreur.

---

#### 3b. Se placer sur la branche de base

```bash
git checkout {baseRefName}
git pull origin {baseRefName}
```

---

#### 3c. Squash merge via GitHub

```bash
gh pr merge {number} --squash --delete-branch
```

`--delete-branch` supprime automatiquement la branche distante (`headRefName`) après le merge.

Puis récupérer le commit localement :

```bash
git pull origin {baseRefName}
```

---

#### 3d. Nettoyage branche locale

Supprimer la branche locale si elle existe (elle peut ne pas exister si le worktree était le seul pointeur) :

```bash
git branch -d {headRefName} 2>/dev/null || git branch -D {headRefName} 2>/dev/null || true
```

---

#### 3e. Supprimer le worktree local

Trouver le chemin du worktree associé à la branche :

```bash
git worktree list | grep "{headRefName}"
```

Si un chemin est trouvé :

```bash
git worktree remove {chemin} --force
```

Si aucun worktree local n'est trouvé → afficher un avertissement et continuer.

---

#### 3f. Fermer l'issue liée

Si une issue a été identifiée à l'étape 3a :

```bash
gh issue close {issue_number} --comment "Closed by merge of #{number} — {PR title}"
```

Si aucune issue liée → afficher `⚠ Pas d'issue liée à la PR #{number} — fermeture manuelle requise.` et continuer.

---

#### 3g. Supprimer les labels de la PR

```bash
gh pr edit {number} --remove-label "Status:Reviewed"
```

---

#### 3h. Preview-release

Suivre **intégralement** les étapes de la skill `preview-release` (lire `.claude/skills/preview-release/SKILL.md`), en restant sur la branche `{baseRefName}`.

Points clés à respecter :
- **Synchroniser les tags distants avant tout calcul de version** : `git fetch --tags` (un tag peut avoir été poussé depuis un autre worktree — sans ce fetch, `git describe` retourne un tag obsolète)
- Incrémenter le **patch** du dernier tag git (`git describe --tags --abbrev=0`)
- Bumper `APP_RELEASE` dans `.env`
- Entrée CHANGELOG : mentionner le titre de la PR mergée (ex. `- Merge #42: Local image storage`)
- **Validation explicite obligatoire** avant `git commit` (règle absolue de preview-release)
- Commit + tag annoté + push branche + push tag

---

### 4. Rapport final

Après toutes les PRs traitées :

```
✓ PRs traitées : #{n1} {titre1}, #{n2} {titre2}, …
✓ Version      : {vX.Y.Z} (dernier tag créé)
✓ Worktrees supprimés : {liste ou "aucun"}
✓ Issues fermées      : #{i1}, #{i2}, … (ou "aucune")
⚠ Avertissements      : {liste ou "aucun"}
```

---

## Notes

- Toujours séquentiel : un seul `gh pr merge` et un seul `preview-release` actif à la fois.
- `gh pr merge --squash --delete-branch` crée un commit squash sur la branche de base **via GitHub** — le `git pull` qui suit est obligatoire pour synchroniser le local.
- La suppression de branche distante est gérée par `--delete-branch`; la locale par `git branch -d`.
- Le worktree est identifié par `git worktree list | grep {headRefName}`. Si le slug du worktree diffère du nom de branche exact, chercher aussi par le numéro d'issue dans le chemin.
- Si deux PRs partagent la même branche de base, le second `git checkout {baseRefName}` est un no-op (déjà dessus) — `git pull` reste obligatoire.
