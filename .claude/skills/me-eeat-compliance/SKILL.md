---
name: me-eeat-compliance
description: >
  Gate 2 du pipeline GAN LeGuideAuditif : verifie conformite E-E-A-T et YMYL sante.
  v2 ajoute le Experience Signal Score — mesure si le contenu DEMONTRE une experience
  vecue, pas juste si la bio existe. Detecte la fausse expertise.
  Score >= 80 requis (Trust pondere ×1.75).
  Trigger: 'E-E-A-T', 'YMYL', 'conformite sante', 'sources medicales', 'credibilite',
  'verifier la page', 'gate 2'.
  NE PAS utiliser pour la redaction (me-affiliate-writer) ni l'humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 4
  changelog: "v2.0 — Experience Signal Score, Depth of Insight, detection fausse expertise"
---

# LeGuideAuditif E-E-A-T Compliance v2.0

Gate 2 du pattern GAN. Ne verifie plus seulement la STRUCTURE mais aussi le CONTENU.

## CHECKS STRUCTURELS (1-4)

### Check 1 : Auteur
Page /auteur/franck-olivier/, bio DE + 25 ans + 18 centres, photo reelle, ADELI.

### Check 2 : Sources medicales
Claims sources (HAS, INSERM, OMS), liens primaires, < 3 ans, pas de promesses.

### Check 3 : Mentions legales YMYL
Disclaimer sante, mention affiliation, confidentialite, CGU, RGPD.

### Check 4 : Signaux confiance
HTTPS, pas de pub intrusive, coherence, pas de superlatifs, dates visibles.

## ⚡ CHECK 5 : EXPERIENCE SIGNAL SCORE (contenu)

### 5a. Presence de vecu (0-30)
Anecdotes cabinet (+10/anecdote, max 20), phrases "je" experience (+5), references temporelles (+5).

### 5b. Coherence exemples (0-30)
Cas reels plausibles (+15), coherence profil (+10), details credibles (+5).
Deductions : exemple trop parfait (-10), chiffre suspect (-5), anecdote fausse (-15).

### 5c. Plausibilite clinique (0-20)
Recommandations coherentes (+10), limites mentionnees (+10).
Deductions : sur-simplification (-5), absence nuance (-10).

### 5d. Depth of Insight Score (0-20)
Explication au-dela du basique (+8), liens symptomes-decisions (+6), priorisation (+6).
❌ "une perte dans les aigus gene la comprehension"
✅ "une chute a 4kHz impacte les consonnes — d'ou la plainte 'j'entends mais je ne comprends pas'"

### 5e. Detection fausse expertise (0-10)
Ton neutre constant (-5), exemples generiques (-3), expertise declaree non demontree (-5), contenu Wikipedia (-10).

## SCORING

| Pilier | Composition | Poids |
|---|---|---|
| Experience | Check 5 | ×1.25 |
| Expertise | Checks 1-2 | ×1.00 |
| Authority | Liens, citations | ×0.75 |
| Trust | Checks 3-4 | ×1.75 |

PASS >= 80 | REVISE 60-79 | REJECT < 60