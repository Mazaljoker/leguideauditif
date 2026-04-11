---
name: me-design-checker
description: >
  Verifie le rendu visuel des pages LeGuideAuditif contre le design system reel.
  20 checks en 7 blocs bases sur global.css, article-tokens.css et les composants Astro.
  Trigger: 'verifie le rendu', 'check design', 'qa visuel', 'le site est ok',
  'verifie les pages', 'rendu', 'affichage', 'mise en page', 'design check'.
  NE PAS utiliser pour le contenu (me-affiliate-writer) ni le SEO (seo-auditor).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
---

# LeGuideAuditif Design Checker v2.0

Verifie le rendu visuel contre le design system REEL du site.
Criteres extraits de `src/styles/global.css`, `src/styles/article-tokens.css` et `src/components/`.

> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/design-tokens.md` pour les valeurs de reference.

## INPUT

Standalone — pas de JSON en entree. Declenchement manuel ou post-upgrade.

## OUTPUT

```json
{
  "type": "me-design-checker",
  "payload": {
    "date": "string (ISO)",
    "total_pages": "number",
    "pages_ok": "number",
    "pages_with_issues": "number",
    "by_severity": { "high": "number", "medium": "number", "low": "number" },
    "results": [
      {
        "path": "string",
        "issues": [
          { "bloc": "A-G", "check": "string", "severity": "high|medium|low", "detail": "string" }
        ]
      }
    ]
  }
}
```

## WORKFLOW

1. `npm install && npm run build` — si build echoue, STOP.
2. `npm run preview &` + lister pages dans `dist/`.
3. Creer/executer `scripts/design-check.mjs` (Playwright) avec les 20 checks.
4. Lancer en desktop (1280x900) puis mobile (375x812).
5. Screenshots des pages avec issues HIGH.
6. Rapport.

## 20 CHECKS EN 7 BLOCS

**A. Structure HTML** : HTTP 200, 1 seul H1, hierarchie Hn, breadcrumbs, meta title < 60, meta desc < 155.
**B. Composants articles** : AuthorBox, HealthDisclaimer, AffiliateDisclosure (comparatifs), FAQ >= 3, CtaBanner, TableOfContents (> 1000 mots).
**C. Typographie** : font-size >= 16px (article 17px), line-height >= 1.6 (article 1.75), max-width <= 720px (cible 680px), paragraphes <= 5 phrases, contraste >= 4.5:1 WCAG AA.
**D. Images** : 0 broken, alt non-vide, format webp prefere.
**E. Tableaux** : overflow desktop, overflow mobile 375px, ComparisonTable sur comparatifs.
**F. Accessibilite seniors** : focus-visible 3px orange, skip-to-content, reduced-motion, touch targets >= 44px.
**G. Performance** : 0 console JS errors, reading progress bar, chargement < 3s.

Detail des tokens dans `references/design-tokens.md`.

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN CHECK — LeGuideAuditif

Pages : {N} | OK : {N} | Issues : {N}
High : {N} | Medium : {N} | Low : {N}

A (Structure)  : {pass}/{total}
B (Composants) : {pass}/{total}
C (Typo)       : {pass}/{total}
D (Images)     : {pass}/{total}
E (Tableaux)   : {pass}/{total}
F (A11y)       : {pass}/{total}
G (Perf)       : {pass}/{total}

Top issues HIGH : {liste}
→ Corriger ? (oui/ignorer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
