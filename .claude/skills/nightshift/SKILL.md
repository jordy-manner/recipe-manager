---
name: nightshift
description: Mode nuit — traite les issues GitHub sélectionnées en parallèle dans des tmux windows, chacune avec un Claude autonome. Monitoring via GitHub comments (prioritaire) + ntfy.sh + ttyd optionnel. Lancer avec « /nightshift », « night shift », « traite les issues cette nuit ».
---

# nightshift — implémentation autonome des issues

Une commande → issues sélectionnées traitées en parallèle pendant la nuit.

## Pré-requis

```bash
command -v tmux      || echo "MANQUANT: tmux (sudo apt install tmux)"
command -v claude    || echo "MANQUANT: claude CLI"
command -v ttyd      || echo "OPTIONNEL: ttyd (monitoring web mobile)"
command -v qrencode  || echo "OPTIONNEL: qrencode (sudo apt install qrencode)"
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

- Issues normales : `#N — {titre}`
- Issues en mode fix : `#N — {titre} ⚠️ Needs Work` avec description = directive de la PR
- **Ne pas ajouter d'option "Annuler"** — l'utilisateur utilise Échap pour annuler tout

Si aucune issue cochée (ou Échap) → arrêter le skill proprement, message : `Night shift annulé.`

Pour chaque issue sélectionnée :
- `type` : depuis les labels (`bug` → `fix`, `chore` → `chore`, sinon `feat`)
- `slug` : kebab-case 2–4 mots depuis le titre
- `mode` : `normal` ou `fix` (si PR a `Status:Needs Work`)

---

### 3. Configurer le topic ntfy

Demander en texte libre :
> "Topic ntfy pour les notifications mobile (défaut : `recipe-nightshift`) :"

URL monitoring : `https://ntfy.sh/{topic}`
App mobile : ntfy (Android/iOS, gratuit, aucun compte requis)

---

### 4. Vérifier l'absence d'une session nightshift existante

```bash
tmux has-session -t nightshift 2>/dev/null && echo "SESSION_EXISTS"
```

Si session existe → demander confirmation avant de continuer.

---

### 5. Pour chaque issue sélectionnée : préparer le worktree (séquentiel)

Traiter **une issue à la fois** pour éviter les conflits git/Prisma.

#### 5a. Branche

```bash
BRANCH="{type}/{numéro}-{slug}"
git show-ref --verify --quiet refs/remotes/origin/$BRANCH || {
  git checkout -b $BRANCH
  git push -u origin $BRANCH
  git checkout v0.X
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
  for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
    echo "$USED_PORTS" | grep -q "^$port$" && continue
    ss -tlnp 2>/dev/null | grep -q ":${port}[^0-9]" && continue
    echo $port > "$WORKTREE/.port"
    PORT=$port
    break
  done
fi
```

---

### 6. GitHub comments + ntfy de démarrage

Générer le token bot **une fois** avant la boucle :

```bash
NIGHTSHIFT_TOKEN=$(nightshift-token jordy-manner/recipe-manager)
```

Pour chaque issue sélectionnée :

```bash
GH_TOKEN=$NIGHTSHIFT_TOKEN gh issue comment {numéro} \
  --repo jordy-manner/recipe-manager \
  --body "🌙 **Night shift started** — Claude is autonomously implementing this issue.
Worktree: \`{slug}/\` · Dev port: \`{port}\`"

# mode fix uniquement : PR existe déjà → WIP sur la PR
# mode normal : WIP posé sur la PR après sa création (voir step 5 du prompt)
if [ "{mode}" = "fix" ]; then
  GH_TOKEN=$NIGHTSHIFT_TOKEN gh issue edit {pr_number} \
    --repo jordy-manner/recipe-manager \
    --add-label "Work in Progress"
fi
```

Notification ntfy globale :

```bash
curl -s \
  -H "Title: 🌙 Night shift démarré" \
  -H "Tags: moon,rocket" \
  -d "{N} issues : {liste des titres}" \
  https://ntfy.sh/{topic}
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

1. Poste un comment de démarrage :
   GH_TOKEN={nightshift_token} gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "⚙️ Implementation in progress..."

2. Implémente l'issue (ou applique les corrections si mode fix).

3. Si bloqué :
   GH_TOKEN={nightshift_token} gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "🚧 Blocked: {reason}"
   GH_TOKEN={nightshift_token} gh api repos/jordy-manner/recipe-manager/issues/{pr_number}/labels --method POST --field 'labels[]=Status:Needs Work'
   curl -s -H "Title: 🚧 Blocked #{numéro}" -H "Tags: warning" -H "Priority: high" -d "{reason}" https://ntfy.sh/{topic}
   Arrête-toi et attends.

4. Quand terminé, pousse la branche :
   git push origin {branch}

5. Ouvre la PR via le bot avec corps structuré (issue title + problem summary + changes + acceptance criteria) :
   PR_URL=$(GH_TOKEN={nightshift_token} gh pr create --repo jordy-manner/recipe-manager \
     --head {branch} --base v0.X \
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
   GH_TOKEN={nightshift_token} gh issue edit $PR_NUMBER --repo jordy-manner/recipe-manager --add-label "Work in Progress"

6. Ajoute les labels et poste le comment de fin :
   {si mode normal}
   GH_TOKEN={nightshift_token} gh issue edit $PR_NUMBER --repo jordy-manner/recipe-manager --remove-label "Work in Progress"
   GH_TOKEN={nightshift_token} gh issue edit {numéro} --repo jordy-manner/recipe-manager --add-label "hasPR"
   GH_TOKEN={nightshift_token} gh issue edit $PR_NUMBER --repo jordy-manner/recipe-manager --add-label "Status:Needs Review"
   {/si}
   {si mode fix}
   GH_TOKEN={nightshift_token} gh issue edit {pr_number} --repo jordy-manner/recipe-manager --remove-label "Work in Progress"
   GH_TOKEN={nightshift_token} gh issue edit {pr_number} --repo jordy-manner/recipe-manager --remove-label "Status:Needs Work"
   GH_TOKEN={nightshift_token} gh issue edit {pr_number} --repo jordy-manner/recipe-manager --add-label "Status:Reviewed"
   {/si}
   GH_TOKEN={nightshift_token} gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "✅ Implementation done — branch \`{branch}\` ready for review."

6. curl -s -H "Title: ✅ #{numéro} ready" -H "Tags: white_check_mark" -d "{titre} — ready for review" https://ntfy.sh/{topic}
PROMPT

# 2. Wrapper script — isole l'appel Claude, rien ne s'exécute après sa sortie
# Le token bot est injecté comme variable d'environnement pour les gh commands autonomes
cat > /tmp/ns-run-{numéro}.sh << SCRIPT
#!/bin/bash
export NIGHTSHIFT_TOKEN=$(nightshift-token jordy-manner/recipe-manager)
cd /home/jmanner/www/html/__lab/recipe-manager/{slug}
exec claude --dangerously-skip-permissions -p "\$(cat /tmp/ns-{numéro}.txt | sed 's|{nightshift_token}|'\$NIGHTSHIFT_TOKEN'|g')"
SCRIPT
chmod +x /tmp/ns-run-{numéro}.sh

# 3. Lancer dans tmux via le wrapper
tmux new-window -t nightshift -n "#{numéro}"
tmux send-keys -t "nightshift:#{numéro}" "bash /tmp/ns-run-{numéro}.sh" Enter
```

---

### 8. ttyd — terminal web mobile (si disponible)

```bash
if command -v ttyd &>/dev/null; then
  ttyd -p 7681 -W tmux attach-session -t nightshift &
  echo "📱 http://$(hostname -I | awk '{print $1}'):7681"
fi
```

---

### 9. Rapport final

```
🌙 Night shift lancé — {N} issues

{pour chaque issue}
  #{numéro} — {titre}
  Branch   : {type}/{numéro}-{slug}
  Worktree : recipe-manager/{slug}/
  Port     : {port}

Monitoring :
  ✓ GitHub comments (app GitHub mobile)
  ✓ ntfy.sh → https://ntfy.sh/{topic}
  {si ttyd} ✓ Terminal web → http://{ip}:7681

{si qrencode disponible, générer et afficher le QR ntfy ici}
```bash
qrencode -t ANSIUTF8 "https://ntfy.sh/{topic}"
```

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
