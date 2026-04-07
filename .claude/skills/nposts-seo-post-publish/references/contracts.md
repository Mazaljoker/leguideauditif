# Contrats JSON — nposts-seo-post-publish

## Input (depuis nposts-seo-fixer apres publication)

```json
{
  "slug": "string",
  "url": "string (URL complete publiee)",
  "published_date": "date ISO",
  "target_keyword": "string (keyword principal vise)",
  "target_position": "number (objectif de position, defaut: 10)",
  "eeat_score": "number (score E-E-A-T de la derniere evaluation)",
  "content_type": "guide|comparatif"
}
```

## Output (rapport de monitoring)

```json
{
  "type": "nposts-seo-post-publish",
  "payload": {
    "slug": "string",
    "url": "string",
    "check_day": "J+1|J+7|J+14|J+30",
    "index_status": "INDEXED|NOT_INDEXED|SUBMITTED",
    "performance": {
      "clicks": "number",
      "impressions": "number",
      "ctr": "number (0-1)",
      "avg_position": "number"
    },
    "cannibalization": [
      {
        "query": "string",
        "competing_page": "string",
        "severity": "HIGH|MEDIUM|LOW",
        "recommendation": "string"
      }
    ],
    "content_decay": "boolean",
    "alerts": ["string"],
    "actions": ["string"]
  }
}
```

## Consomme par

- `me-leadgen-manager` (Level 4 feedback loop : correlation top_pages / leads / EEAT)

## Recu de

- `nposts-seo-fixer` (apres publication et merge de la PR)
