# Decisions — LeGuideAuditif.fr

> Choix techniques datés (ADR légers). Append-only.

## Format
`[YYYY-MM-DD] **Décision** : ... | **Raison** : ... | **Alternative rejetée** : ...`

## Entries

[2026-04-07] **Décision** : Astro 6 + React 19 + Tailwind v4 | **Raison** : Stack moderne, SSG optimal pour SEO santé | **Alternative** : Next.js (trop lourd pour un site contenu)

[2026-04-07] **Décision** : Palette marine/crème/orange (#1B2E4A/#F8F5F0/#D97B3D) | **Raison** : Confiance (marine), chaleur (crème), accessibilité seniors | **Alternative** : Palette froide médicale

[2026-04-07] **Décision** : Double gate YMYL obligatoire (evaluator >=70 + E-E-A-T >=80) | **Raison** : Contenu santé — responsabilité maximale, conformité Google YMYL | **Alternative** : Gate unique (risque qualité)

[2026-04-07] **Décision** : Chaîne GAN 6 étapes (writer→humanizer→evaluator→eeat→fixer→post-publish) | **Raison** : Qualité industrielle, chaque skill a un rôle unique | **Alternative** : Pipeline simplifié 3 étapes

[2026-04-07] **Décision** : Interdiction emojis Unicode dans le code | **Raison** : Accessibilité seniors, lecteurs d'écran, cohérence | **Alternative** : Emojis autorisés en contenu

[2026-04-10] **Décision** : Ajout système mémoire 5 fichiers + hooks manquants | **Raison** : Cohérence cross-projet, persistance inter-sessions | **Alternative** : Pas de mémoire (reset à chaque session)