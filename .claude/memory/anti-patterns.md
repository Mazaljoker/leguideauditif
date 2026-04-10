# Anti-Patterns — LeGuideAuditif.fr

> Ce qui a échoué et pourquoi. Append-only.

## Format
`[YYYY-MM-DD] **Anti-pattern** : ... | **Pourquoi** : ... | **Correction** : ...`

## Entries

[2026-04-07] **Anti-pattern** : Publier contenu santé sans double gate | **Pourquoi** : Risque YMYL, déclassement Google, responsabilité | **Correction** : TOUJOURS passer evaluator (>=70) + eeat-compliance (>=80)

[2026-04-07] **Anti-pattern** : Promesses thérapeutiques ("guérir", "100% efficace") | **Pourquoi** : Illégal en contenu santé, pénalisé par Google | **Correction** : Formulations prudentes, sources obligatoires

[2026-04-07] **Anti-pattern** : Emojis Unicode dans le code | **Pourquoi** : Accessibilité seniors, lecteurs d'écran | **Correction** : Utiliser astro-icon avec Iconify (set Lucide)

[2026-04-07] **Anti-pattern** : Prix exacts pour appareils auditifs | **Pourquoi** : Les prix changent, information périmée rapidement | **Correction** : Fourchettes de prix uniquement