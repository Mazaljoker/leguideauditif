---
name: me-snippet-evaluator
description: >
  GATE 1 du pipeline snippet. Pour chaque proposition title/meta/H1 de
  me-title-writer, calcule un score 0-100 sur 6 axes : relevance_query (x0.25),
  ctr_prediction (x0.20), pixel_width_compliance (x0.15), clarity_non_clickbait
  (x0.15), coherence_title_h1_meta (x0.15), differentiation_vs_serp (x0.10).
  Verdict PASS si total >=75 ET relevance >=80 ET pixel_width =100. REVISE 55-74,
  REJECT <55. Pour topologies C/D, rend les patterns avec sample vars. L'evaluateur
  JUGE, ne modifie JAMAIS.
  Trigger: 'evaluer snippets', 'scorer titles', 'gate 1 snippet', 'verdict pipeline',
  'verifier proposition title'.
  Ne PAS utiliser pour : YMYL/EEAT (me-eeat-snippet-check), generation (me-title-writer),
  patching (me-snippet-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 5
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> me-title-writer -> [me-snippet-evaluator] -> me-eeat-snippet-check -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_snippet_evaluate.py"
  status: functional
---

# me-snippet-evaluator — GATE 1 (Position 5)

Scoring technique des propositions title/meta. Ne modifie JAMAIS.

## INPUT / OUTPUT

```
python .claude/me_snippet_evaluate.py [--in audit/title-proposals-*.json]
                                      [--out audit/snippet-eval-<today>.json]
```

Lit aussi `audit/gsc-mapped-*.json` pour les queries par URL.

## 6 AXES

| Axe | Poids | Calcul |
|---|---|---|
| `relevance_query` | 0.25 | coverage primary (40) + secondaires (30) + long_tail (20) + root token (10) |
| `ctr_prediction` | 0.20 | map(predicted_ctr_delta_pct -15..+15 -> 0..100) |
| `pixel_width_compliance` | 0.15 | title <=520px (60) + <=580px (40) ; meta <=155c (40) |
| `clarity_non_clickbait` | 0.15 | base 100, malus clickbait -50, CAPS -20, superclaim -30 |
| `coherence_title_h1_meta` | 0.15 | overlap title/H1 (40) + meta non-redite (30) + H1!=title (30) |
| `differentiation_vs_serp` | 0.10 | v1 neutre 50 (pas de DataForSEO). V2 : serp/google/organic |

## VERDICT

```
PASS   = total >= 75 ET relevance_query >= 80 ET pixel_width_compliance = 100
REVISE = 55 <= total < 75
REJECT = total < 55
```

En REVISE : `generator_instructions` est produit (actionnable par `me-title-writer`).
Max 3 iterations writer <-> evaluator avant escalade humaine (orchestrateur).

## TEMPLATE RENDERING

Propositions C/D contiennent des patterns `${...}`. Avant scoring, rendus avec
sample vars (Oticon Xceed 3 UP, Audika La Brede, etc.). Placeholders non mappés
remplacés par `"X"`. Le `rendered_sample` est inclus dans l'output pour review.

## TEST DE NON-RÉGRESSION

Run sur LGA J+14 (3 propositions) :

```
PASS   : 1  (audiogramme 86.0)
REVISE : 2  (catalogue 83.5, centre 75.0)
REJECT : 0
Score moyen : 81.5
```

Templates REVISE car impossible d'integrer un primary query specifique dans un
pattern universel -> resolu par les `individual_overrides` du writer (J6).

## V2 ENRICHISSEMENT

`differentiation_vs_serp` via DataForSEO MCP sur chaque primary query. Cap 20
proposals/run. V1 neutre 50/100.
