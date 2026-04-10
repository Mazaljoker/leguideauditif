# /memory — Gestion Memoire Persistante

Gere la memoire inter-sessions de Claude Code pour LeGuideAuditif.fr.

## Usage

```
/memory                    # Afficher etat de la memoire (5 fichiers)
/memory save <contexte>    # Sauvegarder un apprentissage
/memory decisions          # Lister les decisions architecturales
/memory patterns           # Lister les patterns appris
/memory bugs               # Lister les bugs resolus (troubleshooting)
/memory search <terme>     # Chercher dans toute la memoire
```

## Fichiers memoire

| Fichier | Contenu |
|---------|----------|
| `.claude/memory/decisions.md` | Choix techniques dates (ADR legers) |
| `.claude/memory/patterns-learned.md` | Patterns decouverts en session |
| `.claude/memory/troubleshooting.md` | Bugs resolus + solutions |
| `.claude/memory/anti-patterns.md` | Ce qui a echoue et pourquoi |
| `.claude/memory/session-log.md` | Resume de chaque session |

## Comportement

Quand l'utilisateur execute `/memory save` :
1. Identifier le type (decision, pattern, troubleshooting, anti-pattern)
2. Formater avec date et structure standard
3. Append dans le fichier correspondant
4. Confirmer la sauvegarde

Quand l'utilisateur execute `/memory` sans argument :
1. Lire les 5 fichiers memoire
2. Afficher resume compact (5 dernieres entrees par fichier)
3. Indiquer le nombre total d'entrees
