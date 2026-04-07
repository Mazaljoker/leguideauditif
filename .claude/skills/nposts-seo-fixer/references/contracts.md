# Contrats JSON — nposts-seo-fixer

## Input (depuis me-eeat-compliance apres double PASS)

```json
{
  "slug": "string",
  "content_md": "string (contenu valide par les 2 gates)",
  "frontmatter": {},
  "content_type": "guide|comparatif",
  "evaluator_issues": [
    { "axe": "string", "description": "string", "severity": "high|medium|low" }
  ],
  "eeat_issues": [
    { "type": "string", "severity": "high|medium|low", "fix": "string" }
  ],
  "eeat_fixes_applied": ["string"],
  "products": []
}
```

## Output (vers nposts-seo-post-publish)

```json
{
  "type": "nposts-seo-fixer",
  "payload": {
    "slug": "string",
    "file_path": "string",
    "fixes_applied": ["string"],
    "schemas_injected": ["string"],
    "frontmatter_valid": "boolean",
    "branch": "string",
    "pr_url": "string",
    "warnings": ["string (ex: claim non source non corrige)"]
  }
}
```

## Consomme par
- `nposts-seo-post-publish` (monitoring post-publication)
- `me-leadgen-manager` (correlation performance / leads)

## Recu de
- `me-eeat-compliance` (contenu + issues apres double PASS)
- `nposts-content-evaluator` (issues complementaires)
