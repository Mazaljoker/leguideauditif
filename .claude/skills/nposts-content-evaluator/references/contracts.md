# Contrats JSON — nposts-content-evaluator v2.0

## Input Contract (from nposts-seo-humanizer)

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": {},
    "metrics": {
      "burstiness": "number",
      "flesch_fr": "number",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "micro_variations_added": "number",
      "ymyl_claims_preserved": "number",
      "terrain_content_modified": false
    }
  }
}
```

## Output Contract

```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number (0-100)",
    "scores": {
      "completude": "number",
      "seo": "number",
      "lisibilite": "number",
      "ia_detection": "number",
      "accuracy": "number",
      "terrain": "number"
    },
    "verdict": "PASS|REVISE|REJECT",
    "iteration": "number (1-3)",
    "non_interchangeable_elements": ["string"],
    "issues": [
      {
        "axe": "string",
        "description": "string",
        "severity": "high|medium|low",
        "target": "writer|humanizer"
      }
    ],
    "generator_instructions": "string|null (si REVISE)"
  }
}
```

## Consumed by

- `me-eeat-compliance` : gate 2 (si verdict PASS)

## Verdicts

| Score global | Terrain | Verdict |
|---|---|---|
| >= 75 | >= 80 | PASS |
| >= 75 | < 80 | REVISE (terrain insuffisant) |
| 55-74 | any | REVISE |
| < 55 | any | REJECT |
| any | < 40 | REJECT (auto) |
