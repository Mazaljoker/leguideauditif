---
name: me-product-evaluator
description: >
  Gate qualite des fiches produits LeGuideAuditif. Evalue completude, exactitude,
  qualite editoriale et coherence de la noteExpert. Score PASS >= 80/100.
  Utiliser AUTOMATIQUEMENT apres chaque me-product-writer.
  L'evaluateur JUGE, il ne MODIFIE JAMAIS le contenu.
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 2
---

# LeGuideAuditif Product Evaluator v1.0

Gate qualite obligatoire avant publication d'une fiche produit.
L'evaluateur JUGE. Il ne modifie JAMAIS le contenu.

> Lire `.claude/BIBLE-CONTENU-PRODUITS.md` pour les regles.
> Lire `src/content.config.ts` pour le schema Zod.

## INPUT

Fichier JSON produit par `me-product-writer` + rapport de notation.

## OUTPUT

```json
{
  "type": "me-product-evaluator",
  "payload": {
    "produit": "string",
    "slug": "string",
    "verdict": "PASS | FAIL",
    "score_global": 0,
    "axes": {
      "completude": { "score": 0, "details": [] },
      "exactitude": { "score": 0, "details": [] },
      "editorial": { "score": 0, "details": [] },
      "notation": { "score": 0, "details": [] },
      "seo": { "score": 0, "details": [] },
      "credibilite": { "score": 0, "details": [] }
    },
    "bloquants": ["string — issues qui empechent la publication"],
    "ameliorations": ["string — suggestions non bloquantes"],
    "iteration": 1
  }
}
```

**PASS** = score >= 80 ET zero bloquant
**FAIL** = score < 80 OU au moins 1 bloquant

Max 3 iterations writer→evaluator. Apres 3 FAIL → escalade humaine.

## 6 AXES D'EVALUATION (100 points)

### Axe 1 : Completude (25 pts)

Verifier que TOUS les champs obligatoires du schema sont remplis.

| Check | Points | Bloquant si absent |
|-------|--------|--------------------|
| slug, marque, marqueLabel, groupe | 3 | OUI |
| modele, formeType, niveauPosition, annee | 3 | OUI |
| prix.eur (au moins min ou unitaire) | 3 | OUI |
| specs (canaux OU bandes + batterie + autonomie) | 3 | NON mais -3 |
| connectivite (bluetooth + application) | 2 | NON mais -2 |
| fonctionnalites (rechargeable au minimum) | 2 | NON mais -2 |
| descriptionCourte | 3 | OUI |
| descriptionComplete | 3 | OUI |
| pointsForts (>= 4) | 1.5 | OUI si < 3 |
| pointsFaibles (>= 3) | 1.5 | OUI si < 2 |

### Axe 2 : Exactitude (20 pts)

Verifier que les donnees sont COHERENTES et PLAUSIBLES.

| Check | Points |
|-------|--------|
| Marque correspond au groupe fabricant | 2 |
| formeType coherent avec le modele connu | 2 |
| niveauPosition coherent (5=premium, 1=entree) | 2 |
| Prix EUR dans la fourchette plausible pour la categorie | 3 |
| Autonomie batterie plausible (pas 100h pour un RIC) | 2 |
| Canaux coherents avec le niveau (premium > entree) | 2 |
| Annee correcte (pas dans le futur, pas trop ancien sans legacy) | 2 |
| Classe coherente (classe 1 = prix <= PLV, classe 2 = prix > PLV) | 3 |
| Bluetooth version plausible pour l'annee | 2 |

### Axe 3 : Qualite editoriale (25 pts)

| Check | Points | Bloquant |
|-------|--------|----------|
| descriptionCourte < 200 chars | 2 | OUI si > 250 |
| descriptionCourte mentionne puce + type + profil | 3 | NON |
| descriptionComplete 800-1500 mots | 3 | OUI si < 500 |
| Bloc 1 : accroche terrain (pas "Le X est un appareil...") | 3 | OUI |
| Bloc 2 : verdicts calme/bruit/streaming | 2 | NON |
| Bloc 3 : terrain adapte au contexte (voir ci-dessous) | 2 | NON |
| Bloc 4 : pour qui / pas pour qui | 2 | OUI |
| Bloc 5 : vs predecesseur + concurrent | 2 | NON |
| Bloc 6 : verdict + note justifiee | 2 | OUI |
| Zero language marketing (scanner les interdits) | 4 | OUI si detecte |

**Mots interdits** (scan automatique dans descriptionCourte + descriptionComplete) :
"revolutionnaire", "ultime", "game-changer", "leader", "n1", "numero 1",
"parfait", "ideal" (seul, sans "pour"), "sans compromis", "incomparable",
"inegalable", "le meilleur" (sans qualifier "de sa categorie en..."),
"performant" (seul, sans "en situation de...")

### Axe 4 : Coherence notation (15 pts)

| Check | Points |
|-------|--------|
| noteExpert calculee avec les 7 axes (pas inventee) | 3 |
| Chaque axe a une justification | 3 |
| noteExpert coherente avec pointsForts/pointsFaibles | 3 |
| noteExpert coherente avec le benchmark interne (pas +3 pts au-dessus du benchmark sans raison) | 3 |
| noteExpert differentielle : pas tous les produits a 8+ | 3 |

**Regle anti-biais** : si TOUS les produits recents du meme evaluateur sont > 8.0, c'est suspect.
Un bon catalogue a des notes entre 5.5 et 9.5 avec une distribution realiste.

### Axe 5 : SEO (10 pts)

| Check | Points | Bloquant |
|-------|--------|----------|
| metaTitle present et < 60 chars | 3 | OUI si absent |
| metaDescription present et < 155 chars | 3 | OUI si absent |
| metaTitle contient marque + modele | 2 | NON |
| metaDescription contient verdict + prix | 2 | NON |

### Axe 6 : Credibilite terrain (5 pts)

| Check | Points | Bloquant |
|-------|--------|----------|
| Au moins 1 nuance/limite dans descriptionComplete | 1 | NON |
| pointsFaibles sont VRAIS (pas "le prix est eleve" sur un produit premium) | 1 | NON |
| Pas de contradiction entre description et note | 1 | NON |
| **Coherence temporelle du mode terrain** | 2 | **OUI** |

**Coherence temporelle** (BLOQUANT) — verifier que le Bloc 3 utilise le bon mode :

| Produit | Mode attendu | BLOQUANT si |
|---------|-------------|-------------|
| Big Six + annee <= 2024 | Experience directe OK | Retour confrere sur un Phonak Lumity 2022 = suspect |
| Big Six + annee >= 2025 | Retour confrere OU analyse | "J'ai appareille avec le Zeal" = FAUX (il ne vend plus) |
| Sous-marque (Unitron, Bernafon, etc.) | Experience plateforme OU analyse | "J'ai adapte des patients avec le Bernafon Alpha" = a verifier |
| N'importe quel produit | — | "cas patient" avec details trop precis sur un produit jamais manipule = FAUX |

**Franck-Olivier ne vend plus d'appareils depuis 2025.** Toute pretention d'appareillage
sur un produit sorti apres fin 2024 est une FAUSSE EXPERTISE = bloquant immediat.

**Faux point faible detecte** = -2 points. Exemples :
- "Prix eleve" sur un appareil premium (c'est la categorie, pas un defaut)
- "Necessite un audioprothesiste" (c'est obligatoire pour TOUT appareil Rx)
- "Pas adapte aux pertes severes" (quand la plage est indiquee — c'est une spec, pas un defaut)

## CALCUL SCORE GLOBAL

```
score_global = completude + exactitude + editorial + notation + seo + credibilite
```

## VERDICT

| Score | Verdict | Action |
|-------|---------|--------|
| >= 80 ET 0 bloquant | PASS | Publication autorisee |
| 70-79 OU 1 bloquant mineur | FAIL — corrections mineures | Retour au writer, iteration +1 |
| < 70 OU bloquant majeur | FAIL — rewrite | Retour au writer avec details, iteration +1 |

## RAPPORT

Le rapport DOIT contenir :
1. Score par axe avec details
2. Liste des bloquants (si FAIL)
3. Liste des ameliorations suggerees (si PASS mais < 90)
4. Numero d'iteration

## REGLES

1. **L'evaluateur JUGE, il ne MODIFIE JAMAIS** — il renvoie au writer
2. **Max 3 iterations** — apres 3 FAIL, escalade a Franck-Olivier
3. **Pas de complaisance** — un PASS a 80 est un PASS, pas besoin de feliciter
4. **Bloquants = zero tolerance** — un seul bloquant = FAIL meme si score > 80
5. **Accents** — verifier la presence des accents UTF-8 dans tout le contenu francais
