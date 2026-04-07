# Contrats JSON — me-image-generator

## Input Contract (from me-eeat-compliance)

```json
{
  "type": "me-eeat-compliance",
  "payload": {
    "slug": "string",
    "score_eeat": "number (0-100)",
    "verdict": "PASS",
    "content_md": "string"
  }
}
```

## Output Contract

```json
{
  "type": "me-image-generator",
  "payload": {
    "slug": "string",
    "hero": {
      "prompt": "string",
      "path": "string",
      "dimensions": "16:9",
      "size_kb": "number"
    },
    "og": {
      "prompt": "string",
      "path": "string",
      "dimensions": "1200x630",
      "size_kb": "number"
    },
    "generated": "boolean",
    "model": "string",
    "cost_estimated": "string"
  }
}
```

## Consumed by

- `nposts-seo-fixer` : ajoute les images au repo GitHub via PR
- `nposts-seo-post-publish` : vérifie que les images sont en place

## GAN Chain Position

```
content-writer → humanizer → content-evaluator (≥70) → me-eeat-compliance (≥80) → ME-IMAGE-GENERATOR → seo-fixer → seo-post-publish
```
