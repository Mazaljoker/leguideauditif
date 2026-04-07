# Contrats JSON — me-video-generator

## Input Contract

```json
{
  "type": "me-image-generator|standalone",
  "payload": {
    "slug": "string",
    "title": "string",
    "category": "string"
  }
}
```

## Output Contract

```json
{
  "type": "me-video-generator",
  "payload": {
    "slug": "string",
    "hero_video": {
      "prompt": "string",
      "path": "string",
      "duration": 8,
      "aspect_ratio": "16:9",
      "size_mb": "number"
    },
    "short_video": {
      "prompt": "string",
      "path": "string",
      "duration": 8,
      "aspect_ratio": "9:16",
      "size_mb": "number"
    },
    "model": "string",
    "cost_usd": "number"
  }
}
```

## Consumed by

- `nposts-seo-fixer` : ajoute les vidéos au repo GitHub
- Article layout : `<video>` tag dans le composant hero

## GAN Chain Position

```
me-image-generator → ME-VIDEO-GENERATOR → seo-fixer
```

Video generation is OPTIONAL — not blocking for article publication.
Images are mandatory, videos are a bonus.

## Cost Safety

- Default: Veo 3.1 Lite ($0.05/s) = $0.40 per 8s video
- Budget per article: 2 videos × $0.40 = $0.80
- Hard limit: script refuses to proceed if total > $5 without --force flag
