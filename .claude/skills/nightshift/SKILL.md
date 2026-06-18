---
name: nightshift
description: Mode nuit — traite les issues GitHub sélectionnées en parallèle dans des tmux windows, chacune avec un Claude autonome. Monitoring via GitHub comments. Lancer avec « /nightshift », « night shift », « traite les issues cette nuit ».
---

# nightshift — implémentation autonome des issues

Une commande → issues sélectionnées traitées en parallèle pendant la nuit.

## Pré-requis

```bash
command -v tmux      || echo "MANQUANT: tmux (sudo apt install tmux)"
command -v claude    || echo "MANQUANT: claude CLI"
```

---

## Étapes

### 1. Lister les issues ouvertes

```bash
gh issue list \
  --repo jordy-manner/recipe-manager \
  --state open \
  --json number,title,body,labels \
  --limit 20
```

---

### 2. Filtrer et sélectionner les issues à traiter

#### 2a. Règles de filtrage (avant de proposer la sélection)

Pour chaque issue récupérée, appliquer ce filtre :

| Condition | Action |
|-----------|--------|
| Pas de label `hasPR` | ✅ Éligible normalement |
| Label `hasPR` + PR associée avec `Status:Needs Work` | ✅ Éligible en **mode fix** — lire les directives de la PR (comments + review requests) avant d'implémenter |
| Label `hasPR` + PR associée sans `Status:Needs Work` | ❌ Exclure silencieusement |

Pour détecter la PR associée et son label :

```bash
# Trouver la PR ouverte liée à l'issue (via "Closes #N" dans le body)
gh pr list --repo jordy-manner/recipe-manager --state open --json number,labels,body \
  | jq --arg n "{numéro}" '.[] | select(.body | contains("Closes #\($n)") or contains("closes #\($n)"))'
```

#### 2b. Afficher la sélection

Poser via `AskUserQuestion` avec `multiSelect: true` :

- **Label** : `[{type}] #{N} — {titre}`
  - `type` depuis les labels de l'issue : `Type:Fix` → `fix`, `Type:Chore` → `chore`, sinon `feat`
  - Mode fix : ajouter ` ⚠️ Needs Work` à la fin du label
- **Description** : premiers 120 caractères du body de l'issue (tronquer proprement au dernier mot)
  - Mode fix : remplacer par la directive principale de la PR (premier change request)
- **Ne pas ajouter d'option "Annuler"** — l'utilisateur utilise Échap pour annuler tout

Si aucune issue cochée (ou Échap) → arrêter le skill proprement, message : `Night shift annulé.`

Pour chaque issue sélectionnée :
- `type` : depuis les labels (`Type:Fix` → `fix`, `Type:Chore` → `chore`, sinon `feat`)
- `slug` : kebab-case 2–4 mots depuis le titre
- `mode` : `normal` ou `fix` (si PR a `Status:Needs Work`)

---

### 3. Vérifier l'absence d'une session nightshift existante

```bash
tmux has-session -t nightshift 2>/dev/null && echo "SESSION_EXISTS"
```

Si session existe → demander confirmation avant de continuer.

---

### 4. Résoudre la branche de base

```bash
BASE_BRANCH=$(git -C /home/jmanner/www/html/__lab/recipe-manager/main branch --show-current)
# → ex. "v0.3"
```

Cette variable est utilisée dans toutes les étapes suivantes à la place de `v0.X`.

---

### 5. Pour chaque issue sélectionnée : préparer le worktree (séquentiel)

Traiter **une issue à la fois** pour éviter les conflits git/Prisma.

#### 5a. Branche

```bash
BRANCH="{type}/{numéro}-{slug}"
git show-ref --verify --quiet refs/remotes/origin/$BRANCH || {
  git checkout -b $BRANCH
  git push -u origin $BRANCH
  git checkout $BASE_BRANCH
}
```

#### 5b. Worktree — détecter par branche, pas par chemin

Un worktree pour cette branche existe peut-être déjà (créé via `task-new`). Détecter par branche d'abord :

```bash
BRANCH="{type}/{numéro}-{slug}"
DEFAULT_WORKTREE="/home/jmanner/www/html/__lab/recipe-manager/{slug}"

# Cherche un worktree existant pour cette branche
EXISTING=$(git worktree list --porcelain \
  | awk '/^worktree /{wt=$2} /^branch refs\/heads\/'$BRANCH'$/{print wt}')

if [ -n "$EXISTING" ]; then
  WORKTREE="$EXISTING"
  echo "Worktree existant réutilisé : $WORKTREE"
else
  git worktree add "$DEFAULT_WORKTREE" "$BRANCH"
  WORKTREE="$DEFAULT_WORKTREE"
fi
```

#### 5c. Port auto-détecté — évite les conflits avec les .port existants

```bash
# Ports déjà réservés dans tous les worktrees voisins
USED_PORTS=$(find /home/jmanner/www/html/__lab/recipe-manager \
  -maxdepth 2 -name ".port" -exec cat {} \; 2>/dev/null | sort -u)

if [ -f "$WORKTREE/.port" ]; then
  # Worktree réutilisé : conserver son port existant
  PORT=$(cat "$WORKTREE/.port")
else
  for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 3018 3019; do
    echo "$USED_PORTS" | grep -q "^$port$" && continue
    ss -tlnp 2>/dev/null | grep -q ":${port}[^0-9]" && continue
    echo $port > "$WORKTREE/.port"
    PORT=$port
    break
  done
fi
```

---

### 6. GitHub comments de démarrage

Générer le token bot **une fois** avant la boucle :

```bash
NIGHTSHIFT_TOKEN=$(nightshift-token jordy-manner/recipe-manager)
```

Pour chaque issue sélectionnée :

```bash
# mode fix uniquement : PR existe déjà → WIP sur la PR
if [ "{mode}" = "fix" ]; then
  GH_TOKEN=$NIGHTSHIFT_TOKEN gh api repos/jordy-manner/recipe-manager/issues/{pr_number}/labels \
    --method POST \
    --field 'labels[]=Work in Progress'
fi
```

---

### 7. Créer la session tmux + lancer Claude dans chaque fenêtre

```bash
tmux new-session -d -s nightshift -x 220 -y 50
```

Pour chaque issue, écrire le prompt + un **wrapper script**, puis lancer le script via tmux.

> **Pourquoi un wrapper ?** Passer le prompt inline via `$(cat ...)` dans `tmux send-keys` provoque l'exécution du texte numéroté comme commandes shell après la sortie de Claude. Le wrapper isole l'appel : rien ne s'exécute après `claude`.

Si `mode == fix` (PR existante avec `Status:Needs Work`) : le prompt inclut en plus les directives de la PR :

```
MODE FIX — Cette issue a une PR existante avec des change requests.
Lis d'abord tous les comments de la PR #{pr_number} pour comprendre ce qui doit être corrigé :
  GH_TOKEN={nightshift_token} gh pr view {pr_number} --repo jordy-manner/recipe-manager --comments
Applique uniquement les corrections demandées. Retire le label Status:Needs Work et ajoute Status:Reviewed sur la PR une fois corrigé.
```

```bash
# 1. Prompt
cat > /tmp/ns-{numéro}.txt << 'PROMPT'
Tu travailles de façon AUTONOME sur l'issue GitHub #{numéro} : "{titre}".

Contexte :
{body}

{si mode fix}
MODE FIX — PR #{pr_number} a des change requests. Lis ses comments avant tout :
  GH_TOKEN={nightshift_token} gh pr view {pr_number} --repo jordy-manner/recipe-manager --comments
Applique uniquement les corrections demandées.
{/si mode fix}

Règles :
- Lis CLAUDE.md + AGENTS.md + DESIGN.md avant tout code.
- Commits atomiques avec refs #{numéro}.
- Après changement UI : npm run check:design.
- NE PAS ajouter Co-Authored-By dans les messages de commit.
- PR ouverte par le bot via GH_TOKEN={nightshift_token} — jordy-manner review et merge manuellement.
- Tous les GitHub comments, messages de commit et corps de PR sont rédigés en **anglais**.

Séquence :

1. Implémente l'issue (ou applique les corrections si mode fix).

2. Si bloqué :
   GH_TOKEN={nightshift_token} gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "🚧 Blocked: {reason}"
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{numéro}/labels --method POST --field 'labels[]=Status:Needs Work'
   Arrête-toi et attends.

3. Quand terminé, pousse la branche :
   git push origin {branch}

4. Ouvre la PR via le bot avec corps structuré (issue title + problem summary + changes + acceptance criteria) :
   PR_URL=$(GH_TOKEN={nightshift_token} gh pr create --repo jordy-manner/recipe-manager \
     --head {branch} --base {base_branch} \
     --title "{commit title}" \
     --body "## Issue
Closes #{numéro} — {issue title}

> {one-line problem summary from issue body}

## Changes
{bullet list of files changed and what was done}

## Acceptance criteria
{copy acceptance criteria checkboxes from issue}

🌙 Night shift — man-work-nightshift-bot")
   PR_NUMBER=$(echo $PR_URL | grep -o '[0-9]*$')
   # WIP sur la PR dès sa création (mode normal uniquement — en mode fix il est déjà posé)
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/$PR_NUMBER/labels \
     --method POST --field 'labels[]=Work in Progress'

5. Ajoute les labels et poste le comment de fin :
   {si mode normal}
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/$PR_NUMBER/labels \
     --method DELETE --field 'labels[]=Work in Progress'
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{numéro}/labels \
     --method POST --field 'labels[]=hasPR'
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/$PR_NUMBER/labels \
     --method POST --field 'labels[]=Status:Needs Review'
   {/si}
   {si mode fix}
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{pr_number}/labels \
     --method DELETE --field 'labels[]=Work in Progress'
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{pr_number}/labels \
     --method DELETE --field 'labels[]=Status:Needs Work'
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{pr_number}/labels \
     --method POST --field 'labels[]=Status:Reviewed'
   {/si}
   GH_TOKEN={nightshift_token} gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "✅ Implementation done — branch \`{branch}\` ready for review."
PROMPT

# 2. Wrapper script — isole l'appel Claude, rien ne s'exécute après sa sortie
# Token bot + branche de base injectés comme valeurs littérales (résolus à la génération)
cat > /tmp/ns-run-{numéro}.sh << SCRIPT
#!/bin/bash
cd /home/jmanner/www/html/__lab/recipe-manager/{slug}
exec claude --dangerously-skip-permissions -p "$(cat /tmp/ns-{numéro}.txt \
  | sed 's|{nightshift_token}|{NIGHTSHIFT_TOKEN_RESOLVED}|g' \
  | sed 's|{base_branch}|{BASE_BRANCH_RESOLVED}|g')"
SCRIPT
chmod +x /tmp/ns-run-{numéro}.sh

# 3. Lancer dans tmux via le wrapper
tmux new-window -t nightshift -n "#{numéro}"
tmux send-keys -t "nightshift:#{numéro}" "bash /tmp/ns-run-{numéro}.sh" Enter
```

---

### 8. Rapport final

```
🌙 Night shift lancé — {N} issues

{pour chaque issue}
  [{type}] #{numéro} — {titre}
  Branch   : {type}/{numéro}-{slug}
  Worktree : recipe-manager/{slug}/
  Port     : {port}
  GitHub   : https://github.com/jordy-manner/recipe-manager/issues/{numéro}

Commandes utiles :
  tmux attach -t nightshift               # voir toutes les fenêtres
  tmux kill-window -t "nightshift:#{N}"  # arrêter une issue
  tmux kill-session -t nightshift        # tout arrêter
```

---

## Notes

- Worktrees créés **séquentiellement** (évite conflits migrations Prisma).
- Claude lancé **en parallèle** dans chaque window tmux une fois tous les worktrees prêts.
- Si plusieurs issues touchent le schema Prisma → signaler le risque dans le rapport final.
- Pour tuer un seul Claude : `tmux kill-window -t "nightshift:#{numéro}"`.
- Labels gérés via `gh api .../issues/{n}/labels` (POST/DELETE) — `gh issue edit --add-label/--remove-label` échoue silencieusement (Projects classic déprécié).
