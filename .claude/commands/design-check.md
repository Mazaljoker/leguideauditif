# Commande : Vérifier le rendu visuel de tout le site

Tu dois vérifier le rendu visuel de TOUTES les pages du site LeGuideAuditif.
Travail en AUTONOMIE COMPLETE.

## Prérequis

Lire le skill `.claude/skills/me-design-checker/SKILL.md` AVANT de commencer.

## Étapes

1. `npm install && npm run build` — si le build casse, lister les erreurs et STOP
2. `npm run preview &` — lancer le serveur de preview
3. Lister toutes les pages générées dans `dist/`
4. Exécuter le script `scripts/design-check.mjs` (le créer s'il n'existe pas, en suivant le template du SKILL.md)
5. D'abord en desktop (1280x900), puis en mobile (375x812)
6. Générer le rapport
7. Pour chaque issue HIGH : proposer un fix
8. Commiter les fixes + le rapport
9. Créer une PR

## Règles

- NE PAS modifier le contenu éditorial — uniquement le rendu (CSS, composants, structure HTML)
- Screenshots des pages cassées dans `/tmp/screenshots/`
- Si > 10 issues HIGH : s'arrêter après les fixes et demander validation
