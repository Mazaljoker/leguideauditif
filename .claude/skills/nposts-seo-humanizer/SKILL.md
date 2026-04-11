---
name: nposts-seo-humanizer
description: >
  Layer stylistique du pipeline LeGuideAuditif. Casse les patterns IA residuels,
  ameliore le rythme et la voix Franck-Olivier. NE MODIFIE PAS le fond ni la structure.
  Utiliser immediatement apres me-affiliate-writer.
  Trigger: 'humaniser', 'humanize', 'anti-IA', 'rendre humain', 'passer au humanizer',
  'desroboter'.
  Ne PAS utiliser pour : generer du contenu terrain (me-affiliate-writer fait ca),
  audit E-E-A-T (me-eeat-compliance), publication (nposts-seo-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 2
  changelog: "v2.0 — Role redefini : finition stylistique uniquement, plus d'injection de contenu"
---

# nposts-seo-humanizer v2.0

Layer de FINITION STYLISTIQUE. Ne cree pas de contenu terrain — c'est le job du writer.

> REGLE D'OR : Ne JAMAIS ajouter de contenu metier, d'exemples ou d'anecdotes.
> Le humanizer est un EDITEUR, pas un auteur.

## CE QUE LE HUMANIZER FAIT

1. Casse les patterns IA residuels (lexicaux, syntaxiques)
2. Varie la burstiness (longueur de phrases)
3. Ajuste le registre voix Franck-Olivier
4. De-symmetrization pass (casse structures repetees)
5. Micro-variations humaines (hesitations, parentheses, relances)
6. Verifie lisibilite Flesch FR 60-80
7. Preserve les claims YMYL sans modification de sens

## CE QUE LE HUMANIZER NE FAIT PAS

❌ Ajouter des anecdotes ou cas reels
❌ Creer des sections erreurs frequentes
❌ Inventer des insights terrain
❌ Modifier la structure H2/H3
❌ Changer le sens d'une affirmation medicale

## WORKFLOW

### Etape 1 — Patterns IA francais
P0 TOUJOURS remplacer : "Il convient de", "Force est de", "Par ailleurs", "En effet", "Il est essentiel", "Dans le cadre de", "Afin de", "Susceptible de"
P1 si > 2 occurrences : "Notamment", "Par consequent", "Toutefois"
P2 optionnel : phrases uniformes, enumerations a 3, meta-references

### Etape 2 — Burstiness >= 0.7
Inserer phrases courtes (3-6 mots) entre les longues. NE PAS inventer de contenu.

### Etape 3 — Voix Franck-Olivier
Ajustements LEGERS : pronoms, registre cabinet, tabous.

### Etape 4 — De-symmetrization pass
Casser : listes trop parfaites, phrases miroir, sections symetriques,
rule of three, ouvertures repetitives.

### Etape 5 — Micro-variations humaines
Parentheses, incises, questions rhetoriques, aveux d'incertitude.
1 pour 200-300 mots.

### Etape 6 — Lisibilite Flesch FR 60-80

### Etape 7 — YMYL preserve
Ne JAMAIS modifier le sens d'un claim medical. Marquer [YMYL-VERIFIED].

## ERROR HANDLING

Contenu sans blocs terrain → NE PAS compenser → renvoyer au writer.
Burstiness impossible apres 2 passes → signaler au writer.
Claims ambigus → flagger pour le content-evaluator.