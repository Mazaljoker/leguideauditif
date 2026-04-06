# Contrats JSON — me-eeat-compliance

## Input Contract (from seo-humanizer OR me-affiliate-writer)

```json
{
  "type": "seo-humanizer|me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {}
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
    "verdict": "PASS (>=80) | REVISE (60-79) | REJECT (<60)",
    "issues": [
      {
        "type": "string",
        "severity": "high|medium|low",
        "fix": "string (markdown à insérer)"
      }
    ],
    "fixes_applied": ["string"]
  }
}
```

## Consumed by

- `nposts-seo-fixer` : applique les corrections dans le fichier avant PR

## Issue Types

| Type | Severity | Description |
|------|----------|-------------|
| `missing_author_bio` | high | Pas d'encadré auteur |
| `missing_author_page` | high | Page /auteur/ inexistante |
| `missing_health_disclaimer` | high | Pas de disclaimer santé (YMYL) |
| `missing_affiliate_disclosure` | high | Liens affiliés sans mention |
| `unsourced_medical_claim` | high | Affirmation médicale sans source |
| `outdated_source` | medium | Source > 3 ans |
| `missing_date` | medium | Pas de date publication/MAJ |
| `superlative_without_nuance` | low | "Le meilleur" sans contexte |
| `missing_schema` | medium | Pas de JSON-LD auteur |
| `no_https` | high | Page non sécurisée |

## Scoring Formula

```
score_eeat = (experience × 0.2 + expertise × 0.25 + authority × 0.2 + trust × 0.35)
```

Trust pondéré × 1.75 car YMYL santé — Google pénalise lourdement le manque de confiance sur les pages santé.