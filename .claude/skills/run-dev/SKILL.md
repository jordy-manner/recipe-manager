---
name: run-dev
description: Lance le serveur de développement sur le bon port depuis un worktree. Lit le port dans `.port` (créé par task-new) ou en détecte un libre si absent. À utiliser avec « /run-dev », « lance le dev », « démarre le serveur ».
---

# run-dev — lancer le dev sur le bon port

## Étapes

### 1. Trouver le port

**Cas A — `.port` existe dans le répertoire courant** (worktree créé via `task-new`) :

```bash
cat .port
```

Utiliser ce port directement.

**Cas B — `.port` absent** (worktree créé manuellement ou `main/`) :

Détecter le premier port libre dans `3001–3009` :

```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  ss -tlnp 2>/dev/null | grep -q ":${port}[^0-9]" || { echo $port; break; }
done
```

Écrire `.port` pour les prochains appels :

```bash
echo {port} > .port
```

### 2. Lancer le serveur

```bash
PORT={port} npm run dev
```

Afficher avant de lancer :

```
▶ Dev server → http://localhost:{port}
```
