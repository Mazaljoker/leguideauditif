# Règle éditoriale : Classe 1 / 100% Santé

Source de vérité pour savoir quand flagger un produit du catalogue comme "Classe 1 / RAC 0€".

## Flags JSON dans `src/content/catalogue-appareils/*.json`

- `rac0: true` — le fabricant propose CE niveau précis dans son catalogue 100% Santé 2026. **Flag canonique.**
- `classe: "1"` — SKU exclusivement Classe 1 (entrées de gamme déclassées + gammes dédiées 100% Santé type Silk IX, Zeal, Jet PX, Signature Series).
- `classe: "2"` — SKU exclusivement Classe 2 (tous les niveaux 5+/50+ des gammes flagships).
- SKU qui existe en Classe 1 ET Classe 2 (ex: Phonak Audéo Lumity 30, Signia Motion IX 1) : `rac0: true` + **omettre** `classe` (reste ambigu par design).

Le helper `isClasse1()` dans [src/lib/catalogue-utils.ts:75-77](../../src/lib/catalogue-utils.ts#L75-L77) retourne `true` dès que `classe === '1'` OU `rac0 === true`. Le flag UI (badge vert "RAC 0€", filtre budget, stat tile) suit cette logique.

## Granularité — 1 fiche = 1 niveau technologique

- **Règle** : une fiche catalogue = un niveau précis (ex: Lumity 30, Motion IX 1, Magnify 220). Pas de fiche générique multi-niveaux.
- **Exception** : marques qui n'éclatent pas par niveau en France (ex: Oticon Zeal, Jet PX, Starkey Signature Series, Signia Silk IX) → fiche unique acceptable.
- **Corollaire** : si un modèle a plusieurs niveaux 100% Santé chez le fabricant (ex: Widex Magnify 110 + 220, Signia Motion IX 1 + 2), il doit y avoir autant de fiches `rac0: true`.

## Ne pas confondre

- Un appareil vendu 950€ chez un distributeur ≠ toujours Classe 1 officielle. Certains audios écoulent des gammes anciennes en 950€ RAC 0€ sans que le fabricant les positionne officiellement Classe 1. **Se baser sur le catalogue fabricant**, pas sur les listings distributeurs.
- `legacy: true` + `rac0: true` = à éviter pour les fiches actives du catalogue. Privilégier les gammes 2024–2026 encore produites. Les legacy Classe 1 (Paradise 30, Resound Key, Viron 1) restent dans le catalogue pour la complétude historique mais ne comptent pas dans les stats `/catalogue/`.

## Champs obligatoires d'une fiche Classe 1

En plus des champs standard du schéma ([src/content.config.ts:150-274](../../src/content.config.ts#L150-L274)) :
- `rac0: true`
- `classe: "1"` si et seulement si le SKU est exclusivement Classe 1
- `descriptionComplete` : mention explicite de l'éligibilité 100% Santé, avec ton direct Franck-Olivier (pas de promesse thérapeutique YMYL)
- `noteExpert` dans la plage **6.0–7.5** (cf. `feedback_product_tone.md` — 7.5+ réservé au premium)
- `prix.eur.unitaire` peut être renseigné, mais la card catalogue affichera **950€** (prix hardcodé ligne 514 de [CatalogueGrid.tsx](../../src/components/catalogue/CatalogueGrid.tsx) — plafond 100% Santé par convention)

## Pipeline obligatoire pour créer/modifier une fiche Classe 1

```
me-product-researcher (site fabricant + PDF + HAS/ameli)
  → me-product-writer (JSON schema-conforme)
  → me-product-evaluator (>= 80, retry max 3x)
  → nposts-seo-humanizer (descriptionComplete voix Franck-Olivier)
  → me-eeat-compliance (>= 80, YMYL hearing)
```

Exceptions flag unitaire :
- Simple toggle `rac0: true` sur fiche existante avec `descriptionComplete` déjà validé : **édition directe autorisée** sans pipeline complet, à condition d'ajouter 1–3 phrases sur le 100% Santé.
- Si le paragraphe 100% Santé dépasse 3 phrases → passer par `nposts-seo-humanizer` + `me-eeat-compliance`.
