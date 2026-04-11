---
name: me-design-checker
description: >
  Verifie le rendu visuel des pages LeGuideAuditif contre le design system reel du site.
  Basé sur global.css, article-tokens.css et les composants Astro existants.
  Trigger: 'verifie le rendu', 'check design', 'qa visuel', 'le site est ok',
  'verifie les pages', 'rendu', 'affichage', 'mise en page', 'design check'.
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  changelog: "v2.0 — Criteres bases sur le vrai design system du repo (global.css + article-tokens.css)"
---

# LeGuideAuditif Design Checker v2.0

Verifie le rendu visuel contre le design system REEL du site.
Tous les criteres ci-dessous sont extraits de `src/styles/global.css`,
`src/styles/article-tokens.css` et des composants dans `src/components/`.

## DESIGN SYSTEM — REFERENCE

### Couleurs (global.css @theme)

| Token | Hex | Usage |
|-------|-----|-------|
| --color-marine | #1B2E4A | Titres, header, texte principal body |
| --color-creme | #F8F5F0 | Background body |
| --color-orange | #D97B3D | CTA, liens, accents |
| --color-orange-hover | #c46a2e | Hover CTA |
| --color-gris-texte | #4a5568 | Texte secondaire |
| --color-gris-clair | #e8e4df | Bordures, separateurs |

### Couleurs article (article-tokens.css)

| Token | Hex | Usage |
|-------|-----|-------|
| --article-bg | #FAFAF7 | Background page article |
| --article-text | #2D2A26 | Texte corps article |
| --article-text-light | #6B6560 | Blockquotes, secondaire |
| --article-accent | #C66A32 | Liens dans articles |
| --article-navy | #1B3A5C | H2, strong |
| --article-border | #E8E4DF | HR, separateurs |
| --article-sommaire-bg | #F5F3EF | Background sommaire |

### Typographie

| Contexte | Font | Taille | Line-height |
|----------|------|--------|-------------|
| Body global | Merriweather (serif) | 18px (112.5%) | 1.75 |
| Titres global | Inter (sans-serif) | variable | 1.2 |
| Body article | Source Sans 3 / Inter | 17px | 1.75 |
| H2 article | Playfair Display | clamp(22px, 5.5vw, 30px) | 1.2 |
| H3 article | Playfair Display | 19px | 1.3 |

### Spacing article

| Token | Valeur |
|-------|--------|
| --section-gap | 56px |
| --paragraph-gap | 24px |
| --heading-margin-top | 48px |
| --heading-margin-bottom | 20px |
| --article-max-width | 680px |
| --article-padding-x | 20px |

### Composants obligatoires (articles)

| Composant | Fichier | Obligatoire |
|-----------|---------|-------------|
| AuthorBox | AuthorBox.astro | Oui (tous articles) |
| HealthDisclaimer | HealthDisclaimer.astro | Oui (tous articles) |
| AffiliateDisclosure | AffiliateDisclosure.astro | Comparatifs seulement |
| FAQ | FAQ.astro | Oui (tous articles) |
| TableOfContents | TableOfContents.astro | Oui (articles > 1000 mots) |
| CtaBanner | CtaBanner.astro | Oui (tous articles) |
| Breadcrumbs | Breadcrumbs.astro | Oui (toutes pages) |
| ComparisonTable | ComparisonTable.tsx | Comparatifs seulement |
| MotExpert | MotExpert.astro | Recommande (1 par article) |

## CHECKS — 20 CRITERES

### Bloc A : Structure HTML (high priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| A1 | HTTP 200 | Toutes pages | high |
| A2 | 1 seul H1 | Pas 0, pas 2+ | high |
| A3 | Hierarchie Hn | Pas de saut (H1→H3 sans H2) | medium |
| A4 | Breadcrumbs present | `.breadcrumbs` ou `nav[aria-label]` | medium |
| A5 | Meta title < 60 chars | Via balise <title> | medium |
| A6 | Meta description < 155 chars | Via <meta name="description"> | medium |

### Bloc B : Composants articles (high priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| B1 | AuthorBox present | Sur /guides/* et /comparatifs/* | high |
| B2 | HealthDisclaimer present | Texte "ne remplace pas" | high |
| B3 | AffiliateDisclosure | Sur /comparatifs/* uniquement | high (si absent) |
| B4 | FAQ section | Au moins 3 questions | medium |
| B5 | CtaBanner / CTA fin article | Lien vers trouver-audioprothesiste | medium |
| B6 | TableOfContents | Sur articles > 1000 mots | low |

### Bloc C : Typographie et lisibilite (medium priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| C1 | Font-size body | >= 16px (article = 17px) | medium |
| C2 | Line-height | >= 1.6 (article = 1.75) | medium |
| C3 | Article max-width | <= 720px (cible 680px) | low |
| C4 | Paragraphes | <= 5 phrases par paragraphe | low |
| C5 | Contraste texte/fond | Ratio >= 4.5:1 (WCAG AA) | medium |

### Bloc D : Images et medias (high priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| D1 | Images cassees | 0 image broken (naturalWidth=0) | high |
| D2 | Alt text | Toutes images ont un alt non-vide | medium |
| D3 | Images .webp | Format webp prefere | low |

### Bloc E : Tableaux et overflow (medium priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| E1 | Tableau overflow desktop | scrollWidth <= parentWidth | medium |
| E2 | Tableau overflow mobile (375px) | Idem en viewport 375px | high |
| E3 | ComparisonTable present | Sur /comparatifs/* | medium |

### Bloc F : Accessibilite seniors (medium priority)

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| F1 | Focus visible | outline sur :focus-visible (3px orange) | medium |
| F2 | Skip to content | .skip-to-content present | low |
| F3 | Reduced motion | @media prefers-reduced-motion respecte | low |
| F4 | Touch target | Boutons/liens >= 44x44px | medium |

### Bloc G : Performance et erreurs

| # | Check | Attendu | Severity |
|---|-------|---------|----------|
| G1 | Console JS errors | 0 erreurs | medium |
| G2 | Reading progress bar | Present sur articles | low |
| G3 | Temps de chargement | < 3s (preview local) | low |

## WORKFLOW

### 1. Build
```bash
npm install && npm run build
npm run preview &
sleep 3
```

### 2. Lister les pages
```bash
find dist -name "index.html" | sed 's|dist||;s|/index.html||' | sort > /tmp/pages.txt
```

### 3. Creer et executer le script Playwright
Creer `scripts/design-check.mjs` qui implemente les 20+ checks ci-dessus.
Lancer en desktop (1280x900) puis mobile (375x812).

### 4. Rapport

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN CHECK — LeGuideAuditif

Pages verifiees : {N}
Desktop OK : {N} | Mobile OK : {N}

High : {N} | Medium : {N} | Low : {N}

BLOC A (Structure)  : {pass}/{total}
BLOC B (Composants) : {pass}/{total}
BLOC C (Typo)       : {pass}/{total}
BLOC D (Images)     : {pass}/{total}
BLOC E (Tableaux)   : {pass}/{total}
BLOC F (A11y)       : {pass}/{total}
BLOC G (Perf)       : {pass}/{total}

Top issues HIGH :
{liste}

→ Corriger ? (oui/ignorer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## AUTO-FIX POSSIBLES

| Issue | Fix auto |
|-------|----------|
| Tableau overflow | Ajouter `overflow-x: auto` sur parent |
| Alt manquant | Generer alt descriptif depuis le contexte |
| Paragraphe trop long | Suggerer un point de coupe |
| HealthDisclaimer absent | Injecter le composant |
| AuthorBox absent | Injecter le composant |

Pour les autres issues → rapport + screenshots, correction manuelle.
