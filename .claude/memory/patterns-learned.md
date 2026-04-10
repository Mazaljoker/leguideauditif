# Patterns Learned — LeGuideAuditif.fr

> Patterns découverts et validés en session. Append-only.

## Format
`[YYYY-MM-DD] **Pattern** : ... | **Contexte** : ... | **Exemple** : ...`

## Entries

[2026-04-07] **Pattern** : Double gate YMYL avant publication | **Contexte** : Contenu santé auditif, responsabilité E-E-A-T | **Exemple** : content-evaluator (>=70) PUIS eeat-compliance (>=80)

[2026-04-07] **Pattern** : Chaîne GAN avec contrats JSON entre skills | **Contexte** : Chaque skill produit un JSON consommable par le suivant | **Exemple** : writer output → humanizer input → evaluator input

[2026-04-07] **Pattern** : Composants obligatoires YMYL (AuthorBox + HealthDisclaimer) | **Contexte** : Chaque page contenu doit montrer expertise + disclaimer | **Exemple** : `<AuthorBox />` + `<HealthDisclaimer />`

[2026-04-07] **Pattern** : Fourchettes de prix, jamais prix exacts | **Contexte** : Les prix appareils auditifs changent souvent | **Exemple** : "entre 900€ et 1 500€ par oreille" au lieu de "1 200€"

[2026-04-07] **Pattern** : Classe 1 (100% Santé) ET Classe 2 systématiquement | **Contexte** : Équilibre éditorial, pas de biais vers les appareils chers | **Exemple** : Chaque comparatif inclut au moins 1 appareil de chaque classe