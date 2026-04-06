# Contrats JSON — me-affiliate-writer

## Input Contract (from seo-brief-writer)

```json
{
  "type": "seo-brief-writer",
  "payload": {
    "slug": "string",
    "intent": "transactional|commercial",
    "keyword_primary": "string",
    "keywords_secondary": ["string"],
    "h2_structure": ["string"],
    "word_count_target": "number",
    "internal_links": ["string (slug)"]
  }
}
```

## Output Contract

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "title": "string (< 60 chars)",
    "meta_description": "string (< 155 chars)",
    "word_count": "number",
    "products_compared": "number",
    "affiliate_links": "number",
    "lead_forms": "number",
    "content_md": "string",
    "frontmatter": {
      "title": "string",
      "description": "string",
      "author": "Franck-Olivier, Audioprothésiste DE",
      "date": "string (ISO)",
      "lastUpdated": "string (ISO)",
      "category": "string",
      "affiliateDisclosure": true
    }
  }
}
```

## Consumed by

- `nposts-seo-humanizer` : passage anti-IA
- `nposts-seo-fixer` : PR GitHub
- `nposts-seo-post-publish` : indexation + reverse links

## Product Data Schema

```json
{
  "brand": "string",
  "model": "string",
  "type": "contour|intra|RIC|invisible",
  "class": "1|2",
  "price_range": "string (ex: 950-1200€)",
  "channels": "number",
  "bluetooth": "boolean",
  "rechargeable": "boolean",
  "warranty_years": "number",
  "verdict": "string (1 phrase)",
  "best_for": "string",
  "affiliate_url": "string|null"
}
```