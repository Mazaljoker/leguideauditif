# Grille de scoring — nposts-content-evaluator

## Axe 1 : Completude (0.20)

Score /100 base sur 4 criteres a 25 points chacun.

| Score | Qualification |
|---|---|
| 90-100 | Tous les elements du brief presents + bonus (ex: 5+ FAQ) |
| 70-89 | Brief respecte avec elements mineurs manquants |
| 50-69 | 1-2 H2 manquants ou word count hors cible |
| < 50 | Brief fondamentalement non respecte |

## Axe 2 : SEO technique (0.25)

| Score | Qualification |
|---|---|
| 90-100 | Keyword naturellement integre, maillage riche, meta parfaites |
| 70-89 | SEO solide, 1-2 points d'amelioration mineurs |
| 50-69 | Keyword density faible ou liens internes insuffisants |
| < 50 | SEO negligee — pas de keyword, pas de liens, meta absentes |

### Calcul keyword density
```
density = (occurrences du keyword principal / nombre total de mots) * 100
Cible : 1-2%
Trop bas (< 0.5%) : contenu pas assez optimise
Trop haut (> 3%) : keyword stuffing, risque de penalite
```

## Axe 3 : Lisibilite (0.20)

| Score | Qualification |
|---|---|
| 90-100 | Flesch 65-75, phrases aerees, sous-titres frequents, zero jargon |
| 70-89 | Bon niveau, quelques phrases longues a couper |
| 50-69 | Flesch < 60 ou > 85, paragraphes denses, jargon non explique |
| < 50 | Texte impenetrable pour un senior ou trop simpliste |

## Axe 4 : Detection IA (0.20)

| Score | Qualification |
|---|---|
| 90-100 | Burstiness > 0.8, zero pattern P0, variation naturelle |
| 70-89 | Burstiness 0.7+, 0-1 pattern P0, bon rythme |
| 50-69 | Burstiness 0.5-0.69, patterns P0 restants, uniformite |
| < 50 | Texte clairement IA — burstiness < 0.5, multiples P0, monotone |

## Axe 5 : Accuracy sante (0.15)

| Score | Qualification |
|---|---|
| 90-100 | Tous les claims sources, references < 2 ans, zero promesse |
| 70-89 | Claims principaux sources, 1 source ancienne, zero promesse |
| 50-69 | 1-2 claims non sources, ou source > 3 ans |
| < 50 | Claims non sources + promesse therapeutique = BLOQUANT |

### Promesses therapeutiques (severity HIGH, bloquantes)
Expressions interdites :
- "guerir", "eliminer completement", "100% efficace"
- "vous n'aurez plus jamais", "solution miracle"
- "garanti", "resultats certains"

Score automatiquement mis a 0 si une promesse therapeutique est detectee.
