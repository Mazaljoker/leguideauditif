# Contrats JSON — nposts-seo-humanizer

## Input (depuis me-affiliate-writer ou tout generateur)

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string — identifiant unique de l'article",
    "content_md": "string — contenu markdown brut genere par IA",
    "frontmatter": {
      "title": "string (max 60 chars)",
      "description": "string (max 155 chars)",
      "author": "string (defaut: Franck-Olivier, Audioprothesiste DE)",
      "pubDate": "date ISO",
      "category": "string",
      "affiliateDisclosure": "boolean"
    },
    "word_count": "number",
    "products": "array (si comparatif)"
  }
}
```

## Output (vers nposts-content-evaluator)

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string — contenu humanise",
    "frontmatter": {},
    "word_count": "number",
    "metrics": {
      "burstiness": "number (0-1, objectif >= 0.7)",
      "flesch_fr": "number (0-100, objectif 60-80)",
      "ai_patterns_replaced": "number total",
      "ai_patterns_detail": {
        "P0": "number (objectif: 0 restants)",
        "P1": "number",
        "P2": "number"
      },
      "anecdotes_injected": "number (1 pour 800-1000 mots)",
      "ymyl_claims_preserved": "number"
    }
  }
}
```

## Consomme par

- `nposts-content-evaluator` (Gate 1 — evaluation qualite)
- `me-eeat-compliance` (Gate 2 — si bypass content-evaluator en mode urgence)

## Recu de

- `me-affiliate-writer` (comparatifs, fiches produits)
- Tout futur generateur (me-guide-writer, etc.)
