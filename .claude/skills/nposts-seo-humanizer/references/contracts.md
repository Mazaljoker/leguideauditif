# Contrats JSON — nposts-seo-humanizer v2.0

## Input Contract (from me-affiliate-writer)

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_md": "string (markdown avec blocs terrain integres)",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": {
      "hook_dissonant": "boolean",
      "erreurs_frequentes": "number",
      "cas_reel": "number",
      "methode_expert": "boolean",
      "limites_mentionnees": "number",
      "prises_position": "number",
      "expert_judgment": {},
      "elements_non_interchangeables": "number",
      "variation_structurelle": "boolean"
    }
  }
}
```

## Output Contract

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string (humanise)",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": "(passe-through du writer, NON modifie)",
    "metrics": {
      "burstiness": "number (0-1)",
      "flesch_fr": "number (0-100)",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "micro_variations_added": "number",
      "ymyl_claims_preserved": "number",
      "terrain_content_modified": false
    }
  }
}
```

## Consumed by

- `nposts-content-evaluator` : gate 1 (6 axes)
