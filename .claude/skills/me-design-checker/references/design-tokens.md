# Design Tokens — LeGuideAuditif

Valeurs de reference extraites de `src/styles/global.css` et `src/styles/article-tokens.css`.

## Couleurs globales (global.css @theme)

| Token | Hex | Usage |
|-------|-----|-------|
| --color-marine | #1B2E4A | Titres, header, texte principal |
| --color-marine-light | #2a4268 | Hover marine |
| --color-creme | #F8F5F0 | Background body |
| --color-orange | #D97B3D | CTA, liens, accents |
| --color-orange-hover | #c46a2e | Hover CTA |
| --color-gris-texte | #4a5568 | Texte secondaire |
| --color-gris-clair | #e8e4df | Bordures |

## Couleurs article (article-tokens.css)

| Token | Hex |
|-------|-----|
| --article-bg | #FAFAF7 |
| --article-text | #2D2A26 |
| --article-text-light | #6B6560 |
| --article-accent | #C66A32 |
| --article-navy | #1B3A5C |
| --article-border | #E8E4DF |
| --article-sommaire-bg | #F5F3EF |

## Typographie

| Contexte | Font | Taille | Line-height |
|----------|------|--------|-------------|
| Body global | Merriweather (serif) | 18px (112.5%) | 1.75 |
| Titres global | Inter (sans-serif) | variable | 1.2 |
| Body article | Source Sans 3 | 17px | 1.75 |
| H2 article | Playfair Display | clamp(22px, 5.5vw, 30px) | 1.2 |
| H3 article | Playfair Display | 19px | 1.3 |

## Spacing article

| Token | Valeur |
|-------|--------|
| --section-gap | 56px |
| --paragraph-gap | 24px |
| --heading-margin-top | 48px |
| --heading-margin-bottom | 20px |
| --article-max-width | 680px |
| --article-padding-x | 20px |

## Composants obligatoires

| Composant | Fichier | Pages |
|-----------|---------|-------|
| AuthorBox | AuthorBox.astro | Tous articles |
| HealthDisclaimer | HealthDisclaimer.astro | Tous articles |
| AffiliateDisclosure | AffiliateDisclosure.astro | Comparatifs |
| FAQ | FAQ.astro | Tous articles |
| TableOfContents | TableOfContents.astro | Articles > 1000 mots |
| CtaBanner | CtaBanner.astro | Tous articles |
| Breadcrumbs | Breadcrumbs.astro | Toutes pages |
| ComparisonTable | ComparisonTable.tsx | Comparatifs |
| MotExpert | MotExpert.astro | Recommande |
| ReadingProgress | (dans article-tokens.css) | Articles |

## Accessibilite

| Element | Valeur |
|---------|--------|
| Focus visible | 3px solid orange |
| Skip to content | .skip-to-content |
| Reduced motion | @media prefers-reduced-motion |
| Touch target min | 44x44px |
| Font-size minimum | 16px |
