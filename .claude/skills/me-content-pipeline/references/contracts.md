# Contrats JSON — me-content-pipeline

## Transitions de la machine a etats

### INIT → GENERATING (brief)
```json
{
  "type": "content-brief",
  "payload": {
    "content_type": "guide|comparatif",
    "keyword_primary": "string",
    "keywords_secondary": ["string"],
    "h2_structure": ["string"],
    "word_count_target": "number (1500-2500)",
    "products": ["string (si comparatif)"],
    "intent": "informationnel|transactionnel|comparatif"
  }
}
```

### GENERATING → HUMANIZING (contenu brut)
```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number",
    "products": []
  }
}
```

### HUMANIZING → GATE_1 (contenu humanise)
```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number",
    "metrics": {
      "burstiness": "number",
      "flesch_fr": "number",
      "ai_patterns_replaced": "number",
      "anecdotes_injected": "number",
      "ymyl_claims_preserved": "number"
    }
  }
}
```

### GATE_1 → GATE_2 (si PASS) ou → HUMANIZING (si REVISE)
```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number",
    "scores": {},
    "verdict": "PASS|REVISE|REJECT",
    "iteration": "number",
    "issues": [],
    "generator_instructions": "string|null"
  }
}
```

### GATE_2 → FIXING (si PASS) ou → HUMANIZING (si REVISE)
```json
{
  "type": "me-eeat-compliance",
  "payload": {
    "slug": "string",
    "score_eeat": "number",
    "verdict": "PASS|REVISE|REJECT",
    "issues": [],
    "fixes_applied": []
  }
}
```

### FIXING → PUBLISHING
```json
{
  "type": "nposts-seo-fixer",
  "payload": {
    "slug": "string",
    "file_path": "string",
    "fixes_applied": [],
    "schemas_injected": [],
    "frontmatter_valid": "boolean",
    "branch": "string",
    "pr_url": "string"
  }
}
```
