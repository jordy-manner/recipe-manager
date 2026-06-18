---
name: gh new
description: Crée une nouvelle issue GitHub + branche + worktree pour une tâche (feat/fix/chore). À utiliser dès qu'on commence une nouvelle tâche (ex. « /gh new », « nouvelle tâche », « crée une issue », « commence un fix »). Collecte le contexte via un jeu de questions-réponses avant de créer l'issue.
---

# gh new — nouvelle issue + branche + worktree

Workflow complet pour démarrer une tâche : collecte de contexte par Q&A → issue GitHub → branche conventionnelle → worktree isolé.

## ⚠️ Règle absolue — rester sur v0.X dans main/

Le répertoire `main/` reste **toujours sur la branche de version** (`v0.X`). Le worktree de la nouvelle tâche est créé en **sibling** de `main/` dans `recipe-manager/`.

---

## Étapes

### 1. Collecter le type

Poser via `AskUserQuestion` :

- **Type** : `feat` / `fix` / `chore`

---

### 2. Décrire la tâche et collecter le contexte par Q&A

Demander en texte libre :
> "Décris la tâche."

Objectif : rédiger un corps d'issue précis, actionnable, sans sur-spécifier. Le contexte s'écrit de manière **itérative** — Claude pose des questions, l'utilisateur répond, jusqu'à ce que le contexte soit suffisant.

#### 2a. Lire le code pertinent

Avant de poser des questions, lire rapidement les fichiers concernés (grep / Read) pour ne pas poser des questions dont la réponse est déjà dans le code.

#### 2b. Questions à poser (une ou deux à la fois, en texte libre)

Commencer par les questions qui débloquent le plus de contexte :

1. **Comportement actuel** : que se passe-t-il aujourd'hui ? (bug visible, friction UX, comportement incorrect)
2. **Comportement attendu** : qu'est-ce qui devrait se passer à la place ?
3. **Périmètre** : quels fichiers / composants / routes sont concernés ?

Puis, selon la tâche :
- Pour un **bug** : est-ce reproductible ? dans quel contexte précis ?
- Pour une **feat** : y a-t-il des contraintes de design, des edge cases connus ?
- Pour un **chore** : quel est le critère de "done" ?

Continuer les questions jusqu'à pouvoir rédiger les sections **Problem**, **Affected areas**, **Acceptance criteria** sans ambiguïté. En général 2 à 4 tours suffisent.

#### 2c. Déduire automatiquement titre et slug

À partir de la description et des réponses collectées, déduire **sans demander** :

- **Titre** : court, en anglais, actionnable (ex. `Add portion stepper to recipe form`)
- **Slug** : kebab-case, 2-4 mots, dérivé du titre (ex. `portion-stepper`)

**Règle langue** : issues GitHub, commits, corps de PR et comments GitHub sont toujours en **anglais**. Traduire si la description est en français.

#### 2d. Soumettre le récap complet pour validation

Afficher en une seule fois :

```
Type    : {feat|fix|chore}
Titre   : {titre en anglais}
Slug    : {slug}

--- Corps de l'issue ---
{corps markdown : Problem / Affected areas / Acceptance criteria}
```

Demander :
> "Ce récap est-il correct ? Des ajouts / corrections ?"

Itérer si besoin. Ne pas créer l'issue avant validation explicite.

---

### 3. Créer l'issue GitHub

```bash
gh issue create \
  --title "{titre en anglais}" \
  --body "{corps validé}" \
  --label "Type:{Feat|Fix|Chore}" \
  --repo jordy-manner/recipe-manager
```

Le label correspond au type choisi à l'étape 1 : `feat` → `Type:Feat`, `fix` → `Type:Fix`, `chore` → `Type:Chore`.

Récupérer le **numéro** retourné (ex. `#12`).

---

### 4. Construire le nom de branche

```
{type}/{numéro}-{slug}
```

Exemples :
- `feat/12-portion-stepper`
- `fix/1-season-select-all-month`
- `chore/7-cleanup-prisma-seed`

---

### 5. Créer la branche et la pousser

```bash
git checkout -b {type}/{numéro}-{slug}
git push -u origin {type}/{numéro}-{slug}
git checkout v0.X   # revenir sur la branche de version
```

---

### 6. Créer le worktree

```bash
git worktree add ../{slug} {type}/{numéro}-{slug}
```

Résultat :
```
recipe-manager/
├── main/      ← v0.X (toujours)
└── {slug}/    ← fix/feat/chore branch
```

---

### 6b. Détecter et réserver le port dev

Trouver le premier port libre dans la plage `3001–3019` (ports non utilisés par un process ni par un autre worktree) :

```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 3018 3019; do
  ss -tlnp 2>/dev/null | grep -q ":${port}[^0-9]" || { echo $port; break; }
done
```

Écrire ce port dans le worktree pour que `/run-dev` le retrouve :

```bash
echo {port} > ../{slug}/.port
```

---

### 7. Rapport final

```
✓ Issue     : #{numéro} — {titre}
✓ Branche   : {type}/{numéro}-{slug}
✓ Worktree  : ../recipe-manager/{slug}/
✓ Port      : {port} (auto-détecté, enregistré dans .port)
✓ Dev       : cd ../recipe-manager/{slug} && /run-dev
```

---

## Notes

- Ne jamais créer le worktree avec `../../{slug}` (sortirait de `recipe-manager/`).
- Si une branche du même nom existe déjà sur le remote : `git checkout --track origin/{branche}`.
- Migrations Prisma : si un autre worktree a des migrations en cours, **signaler le conflit** avant de créer ce worktree.
