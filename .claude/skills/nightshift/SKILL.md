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

### 2. Sélectionner les issues à traiter

Poser via `AskUserQuestion` avec `multiSelect: true` :

- Une option par issue, format : `#N — {titre}` avec description = premier paragraphe du body
- **Ne pas ajouter d'option "Annuler"** — l'utilisateur utilise Échap pour annuler tout

Si aucune issue cochée (ou Échap) → arrêter le skill proprement, message : `Night shift annulé.`

Pour chaque issue sélectionnée :
- `type` : depuis les labels (`bug` → `fix`, `chore` → `chore`, sinon `feat`)
- `slug` : kebab-case 2–4 mots depuis le titre

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

Pour chaque issue sélectionnée :

```bash
gh issue comment {numéro} \
  --repo jordy-manner/recipe-manager \
  --body "🌙 **Night shift démarré** — Claude implémente cette issue de façon autonome.
Worktree : \`{slug}/\` · Port dev : \`{port}\`"
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

Pour chaque issue, écrire le prompt dans un fichier temp puis lancer Claude :

```bash
cat > /tmp/ns-{numéro}.txt << 'PROMPT'
Tu travailles de façon AUTONOME sur l'issue GitHub #{numéro} : "{titre}".

Contexte :
{body}

Règles :
- Lis CLAUDE.md + AGENTS.md + DESIGN.md avant tout code.
- Commits atomiques avec refs #{numéro}.
- Après changement UI : npm run check:design.

Séquence :

1. Poste un comment de démarrage :
   gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "⚙️ Implémentation en cours..."

2. Implémente l'issue dans ce worktree.

3. Si bloqué :
   gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "🚧 Bloqué : {raison}"
   curl -s -H "Title: 🚧 Bloqué #{numéro}" -H "Tags: warning" -H "Priority: high" -d "{raison}" https://ntfy.sh/{topic}
   Arrête-toi et attends.

4. Quand terminé, ouvre la PR avec "Closes #{numéro}" dans le body.

5. Poste le comment de fin :
   gh issue comment {numéro} --repo jordy-manner/recipe-manager --body "✅ Terminé — PR ouverte."

6. Envoie la notif ntfy :
   curl -s -H "Title: ✅ #{numéro} terminé" -H "Tags: white_check_mark" -d "{titre}" https://ntfy.sh/{topic}
PROMPT

tmux new-window -t nightshift -n "#{numéro}"
tmux send-keys -t "nightshift:#{numéro}" \
  "cd /home/jmanner/www/html/__lab/recipe-manager/{slug} && claude --dangerously-skip-permissions -p \"$(cat /tmp/ns-{numéro}.txt)\"" \
  Enter
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
