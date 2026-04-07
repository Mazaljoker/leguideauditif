---
name: nposts-content-evaluator
description: >
  Gate 1 du pipeline GAN LeGuideAuditif : evalue la qualite du contenu humanise
  sur 5 axes (completude, SEO, lisibilite, detection IA, accuracy sante).
  Score 0-100, verdict PASS (>=70) / REVISE (50-69) / REJECT (<50).
  L'evaluateur ne modifie JAMAIS le contenu — il juge uniquement.
  Trigger: 'evaluer contenu', 'content check', 'gate 1', 'quality check',
  'verifier article', 'score contenu', 'pre-eeat', 'noter le contenu'.
  Ne PAS utiliser pour : publication (nposts-seo-fixer), audit E-E-A-T (me-eeat-compliance),
  generation (me-affiliate-writer), humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 3
  chain: "me-affiliate-writer → nposts-seo-humanizer → [nposts-content-evaluator] → me-eeat-compliance → nposts-seo-fixer"
---

# nposts-content-evaluator — Gate 1

Evalue la qualite du contenu humanise AVANT le passage au gate E-E-A-T.
REGLE ABSOLUE : l'evaluateur ne modifie JAMAIS le contenu. Il juge et produit
un verdict + des instructions pour le generateur si REVISE.

## INPUT

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string (contenu humanise)",
    "frontmatter": {},
    "word_count": "number",
    "metrics": {
      "burstiness": "number",
      "flesch_fr": "number",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "anecdotes_injected": "number",
      "ymyl_claims_preserved": "number"
    }
  }
}
```

## SCORING — 5 axes

### Axe 1 : Completude vs brief (poids 0.20)

| Critere | Points | Deduction |
|---|---|---|
| Tous les H2 du brief couverts | 25 | -5 par H2 manquant |
| Word count dans la cible (±15%) | 25 | -10 si ecart > 15% |
| FAQ presente (min 3 questions) | 25 | -25 si absente |
| Produits compares (si comparatif, min 2) | 25 | -25 si < 2 produits |

### Axe 2 : SEO technique (poids 0.25)

| Critere | Points | Deduction |
|---|---|---|
| Keyword density 1-2% | 20 | -10 si < 0.5% ou > 3% |
| Title < 60 chars avec keyword | 20 | -10 si > 60, -5 si sans keyword |
| Meta description < 155 chars | 20 | -10 si > 155, -5 si sans keyword |
| Liens internes >= 2 | 20 | -10 par lien manquant |
| Schema.org reference dans frontmatter | 20 | -20 si absent |

### Axe 3 : Lisibilite (poids 0.20)

| Critere | Points | Deduction |
|---|---|---|
| Flesch FR 60-80 | 30 | -15 si < 50 ou > 90 |
| Paragraphes < 4 phrases | 25 | -5 par paragraphe trop long |
| Jargon medical explique entre parentheses | 25 | -10 par terme non explique |
| Sous-titres (H2/H3) tous les 300 mots | 20 | -5 par section trop longue |

### Axe 4 : Detection IA (poids 0.20)

| Critere | Points | Deduction |
|---|---|---|
| Burstiness >= 0.7 (depuis humanizer) | 30 | -15 si < 0.5, -5 si 0.5-0.69 |
| Patterns P0 = 0 | 30 | -10 par pattern P0 restant |
| Pas de meta-references ("cet article") | 20 | -10 par meta-reference |
| Variation attaques de paragraphes | 20 | -5 si 3+ paragraphes commencent pareil |

### Axe 5 : Accuracy sante (poids 0.15)

| Critere | Points | Deduction |
|---|---|---|
| Claims medicaux sources (HAS/INSERM/OMS) | 35 | -10 par claim non source |
| Pas de promesse therapeutique | 25 | -25 si present (bloquant) |
| Sources < 3 ans | 20 | -5 par source > 3 ans |
| Coherence avec les guidelines HAS | 20 | -10 si contradiction |

## FORMULE

```
score = completude * 0.20 + seo * 0.25 + lisibilite * 0.20 + ia_detection * 0.20 + accuracy * 0.15
```

## VERDICTS

| Verdict | Score | Action |
|---|---|---|
| **PASS** | >= 70 | Continuer vers me-eeat-compliance (Gate 2) |
| **REVISE** | 50-69 | Renvoyer au humanizer avec GENERATOR_INSTRUCTIONS (max 3 iter) |
| **REJECT** | < 50 | BLOCKED — escalade humaine, le contenu a un probleme fondamental |

## PROTOCOLE RETRY

1. L'evaluateur produit `GENERATOR_INSTRUCTIONS` — instructions specifiques et actionnables
2. Le generateur (humanizer) ne voit JAMAIS le verdict brut ni le score
3. Maximum 3 iterations. Si iteration N+1 a plus d'issues que N → BLOCK immediat
4. Chaque iteration doit reduire le nombre de findings

## OUTPUT

```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number (0-100)",
    "scores": {
      "completude": "number (0-100)",
      "seo": "number (0-100)",
      "lisibilite": "number (0-100)",
      "ia_detection": "number (0-100)",
      "accuracy": "number (0-100)"
    },
    "verdict": "PASS|REVISE|REJECT",
    "iteration": "number (1-3)",
    "issues": [
      {
        "axe": "string",
        "description": "string",
        "severity": "high|medium|low"
      }
    ],
    "generator_instructions": "string|null (uniquement si REVISE)"
  }
}
```

## EXAMPLES

### Exemple 1 : PASS a 78

```
CONTENT EVALUATION — comparatif-phonak-oticon-2026

Completude : 85/100 (tous H2, FAQ 4 questions, 4 produits)
SEO        : 80/100 (keyword 1.4%, title 58 chars, 3 liens internes)
Lisibilite : 72/100 (Flesch 68, 2 paragraphes un peu longs)
Detection IA : 75/100 (burstiness 0.72, P0 = 0, 1 meta-ref)
Accuracy   : 80/100 (3 claims sources, 0 promesse, sources 2024-2025)

Score total : 78/100
Verdict : PASS

→ Continuer vers me-eeat-compliance
```

### Exemple 2 : REVISE a 62

```
CONTENT EVALUATION — guide-acouphenes (iteration 1/3)

Completude : 70/100 (H2 "traitements" manquant)
SEO        : 55/100 (keyword density 0.3%, 1 seul lien interne)
Lisibilite : 75/100 (Flesch 71, OK)
Detection IA : 60/100 (burstiness 0.58, 2 patterns P0 restants)
Accuracy   : 65/100 (1 claim non source sur efficacite TCC)

Score total : 62/100
Verdict : REVISE

GENERATOR_INSTRUCTIONS :
1. Augmenter la keyword density de "acouphenes appareils auditifs" de 0.3% a 1.5%
2. Ajouter un lien interne vers /guides/perte-auditive-legere/
3. Remplacer "En effet" (paragraphe 5) et "Il convient de noter" (paragraphe 8) — patterns P0
4. Augmenter la burstiness : inserer 3-4 phrases courtes dans les sections longues
5. Sourcer le claim "la TCC reduit les acouphenes de 40%" — reference HAS ou PubMed
6. Ajouter le H2 "Traitements complementaires" manquant du brief
```

## ERROR HANDLING

### Metriques humanizer manquantes
Si le contenu arrive sans les metriques du humanizer (burstiness, flesch_fr, ai_patterns),
ne PAS evaluer l'axe "Detection IA" — le noter 0/100 et signaler dans les issues
que le contenu n'est pas passe par le humanizer.

### Contenu trop court (< 500 mots)
Impossible d'evaluer correctement un contenu tres court.
Retourner REJECT avec instruction : "Contenu < 500 mots, minimum requis pour une evaluation fiable."

### Frontmatter incomplet
Si title, description ou category manquent du frontmatter,
deduire sur l'axe SEO et ajouter en issues severity HIGH.

## TROUBLESHOOTING

### Score coince en REVISE (3 iterations)
Le probleme est souvent dans le brief initial :
1. Sujet trop large → reduire le scope
2. Pas assez de sources disponibles → changer d'angle
3. Keyword trop competitif → viser un long-tail

### Axe accuracy systematiquement bas
- Verifier que le humanizer preserve les claims [YMYL-VERIFIED]
- Le generateur doit inclure les references (HAS, INSERM) des le depart
- Ajouter `references/has-sources-database.md` au generateur pour les sources courantes
