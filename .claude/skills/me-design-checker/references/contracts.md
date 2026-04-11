# Contrats JSON — me-design-checker v2.0

## Input Contract

Standalone — pas d'input JSON. Declenchement via commande `/design-check`.

## Output Contract

```json
{
  "type": "me-design-checker",
  "payload": {
    "date": "string (ISO)",
    "total_pages": "number",
    "pages_ok": "number",
    "pages_with_issues": "number",
    "by_severity": {
      "high": "number",
      "medium": "number",
      "low": "number"
    },
    "results": [
      {
        "path": "string",
        "issues": [
          {
            "bloc": "A|B|C|D|E|F|G",
            "check": "string (ex: A1, B2, C3)",
            "severity": "high|medium|low",
            "detail": "string",
            "screenshot": "string|null (path si issue high)"
          }
        ]
      }
    ]
  }
}
```

## Not consumed by other skills

Standalone QA tool. Rapport lu par l'humain ou par le seo-fixer pour auto-correction.
