# Contracts — me-detector-inverse

## Input contract

```json
{
  "$schema": "detector-inverse-input-v1",
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string — URL slug de l'article",
    "content_md": "string — contenu markdown complet",
    "frontmatter": "object — metadonnees YAML",
    "word_count": "number — nombre de mots"
  }
}
```

## Output contract

```json
{
  "$schema": "detector-inverse-output-v1",
  "type": "me-detector-inverse",
  "payload": {
    "slug": "string",
    "score_total": "number (0-100)",
    "status": "FAIL | PASS | DOMINANT",
    "breakdown": {
      "human_signal": "number (0-40)",
      "expert_signal": "number (0-30)",
      "anti_generic_signal": "number (0-30)"
    },
    "flags": ["string — problemes detectes"],
    "quick_fixes": ["string — corrections actionables (max 5)"],
    "malus_applied": ["string — malus avec points retires"],
    "author_fingerprint": "number (0-10) — bonus empreinte auteur",
    "iteration": "number (1-2)",
    "verdict": "string — resume en 1 phrase",
    "target": "humanizer | writer | pass"
  }
}
```

## Validation rules

- score_total = human_signal + expert_signal + anti_generic_signal + sum(malus)
- score_total clamped to [0, 100]
- status derived from score_total thresholds (85+ DOMINANT, 75-84 PASS, 60-74 FAIL-FIXABLE, <60 FAIL-REWRITE)
- target: "pass" if status >= PASS, "humanizer" if FAIL-FIXABLE, "writer" if FAIL-REWRITE
- iteration max 2 — apres 2 FAIL, escalade humaine obligatoire
- quick_fixes max 5 items, chacun actionable et specifique
