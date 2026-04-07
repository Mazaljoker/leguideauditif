# Contrats JSON — nposts-content-evaluator

## Input (depuis nposts-seo-humanizer)

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string (contenu humanise)",
    "frontmatter": {
      "title": "string (max 60 chars)",
      "description": "string (max 155 chars)",
      "author": "string",
      "pubDate": "date ISO",
      "category": "string",
      "affiliateDisclosure": "boolean"
    },
    "word_count": "number",
    "metrics": {
      "burstiness": "number (0-1)",
      "flesch_fr": "number (0-100)",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "anecdotes_injected": "number",
      "ymyl_claims_preserved": "number"
    }
  }
}
```

## Output (vers me-eeat-compliance si PASS, vers humanizer si REVISE)

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
        "axe": "completude|seo|lisibilite|ia_detection|accuracy",
        "description": "string",
        "severity": "high|medium|low"
      }
    ],
    "generator_instructions": "string|null"
  }
}
```

## Consomme par

- `me-eeat-compliance` (Gate 2 — si verdict PASS)
- `nposts-seo-humanizer` (retour REVISE avec generator_instructions)
- `nposts-seo-fixer` (issues a corriger)

## Recu de

- `nposts-seo-humanizer` (contenu humanise avec metriques)
