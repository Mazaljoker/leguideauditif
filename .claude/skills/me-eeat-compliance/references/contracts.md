# Contrats JSON — me-eeat-compliance v2.0

## Input Contract (from nposts-content-evaluator)

```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number (>= 75)",
    "scores": {
      "completude": "number",
      "seo": "number",
      "lisibilite": "number",
      "ia_detection": "number",
      "accuracy": "number",
      "terrain": "number (>= 80)"
    },
    "verdict": "PASS",
    "non_interchangeable_elements": ["string"]
  }
}
```

## Output Contract

```json
{
  "type": "me-eeat-compliance",
  "payload": {
    "slug": "string",
    "score_eeat": "number (0-100)",
    "score_experience": "number (0-100)",
    "score_expertise": "number (0-100)",
    "score_authority": "number (0-100)",
    "score_trust": "number (0-100)",
    "experience_signal": {
      "vecu": "number (0-30)",
      "coherence_exemples": "number (0-30)",
      "depth_of_insight": "number (0-20)",
      "fausse_expertise_flags": "number (0-10)",
      "red_flags": ["string"]
    },
    "verdict": "PASS|REVISE|REJECT",
    "issues": [
      { "type": "string", "severity": "high|medium|low", "fix": "string", "target": "writer|humanizer|structure" }
    ],
    "fixes_applied": ["string"]
  }
}
```

## Consumed by

- `nposts-seo-fixer` : applique les corrections et cree la PR GitHub

## Seuils

| Score | Verdict |
|---|---|
| >= 80 | PASS |
| 60-79 | REVISE |
| < 60 | REJECT |
