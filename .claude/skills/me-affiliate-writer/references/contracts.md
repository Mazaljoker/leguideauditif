# Contrats JSON — me-affiliate-writer v2.0

## Input Contract (from seo-brief-writer)

```json
{
  "type": "seo-brief-writer",
  "payload": {
    "slug": "string",
    "intent": "transactional|commercial|informational",
    "keyword_primary": "string",
    "keywords_secondary": ["string"],
    "h2_structure": ["string"],
    "word_count_target": "number",
    "internal_links": ["string (slug)"],
    "content_type": "guide|comparatif|fiche_produit",
    "angle_dominant": "string (1 des 5 angles de la bible)"
  }
}
```

## Output Contract

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_type": "guide|comparatif|fiche_produit",
    "title": "string (< 60 chars)",
    "meta_description": "string (< 155 chars)",
    "word_count": "number",
    "content_md": "string (Astro-ready markdown)",
    "frontmatter": {
      "title": "string",
      "description": "string",
      "author": "Franck-Olivier, Audioprothesiste DE",
      "date": "string (ISO)",
      "updatedDate": "string (ISO)",
      "category": "string",
      "affiliateDisclosure": "boolean"
    },
    "terrain_checklist": {
      "hook_dissonant": "boolean",
      "erreurs_frequentes": "number (min 3)",
      "cas_reel": "number (min 1)",
      "methode_expert": "boolean",
      "limites_mentionnees": "number (min 2)",
      "prises_position": "number (min 2)",
      "expert_judgment": {
        "recommandation": "boolean",
        "rejet": "boolean",
        "nuance": "boolean"
      },
      "elements_non_interchangeables": "number (min 3)",
      "variation_structurelle": "boolean"
    }
  }
}
```

## Consumed by

- `nposts-seo-humanizer` : finition stylistique
- `nposts-content-evaluator` : gate 1 (score >= 75, terrain >= 80)
- `me-eeat-compliance` : gate 2 (score >= 80)
- `nposts-seo-fixer` : PR GitHub
- `nposts-seo-post-publish` : indexation + reverse links

## Product Data Schema (comparatifs)

```json
{
  "brand": "string",
  "model": "string",
  "type": "contour|intra|RIC|invisible",
  "class": "1|2",
  "price_range": "string (ex: 950-1200 EUR)",
  "channels": "number",
  "bluetooth": "boolean",
  "rechargeable": "boolean",
  "warranty_years": "number",
  "verdict": "string (1 phrase)",
  "best_for": "string",
  "affiliate_url": "string|null"
}
```
