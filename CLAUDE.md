# LeGuideAuditif.fr

## Projet
Site independant d'information sante auditive + generation de leads pour audioprothesistes partenaires.
- URL: https://leguideauditif.fr
- Stack: Astro 6 + React 19 + Tailwind v4 + Vercel + MDX
- Node: >=22.12.0
- Auteur: Franck-Olivier Chabbat, audioprothesiste DE, 28+ ans, 3000+ patients

## Commandes
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npx astro preview`

## Accents UTF-8 (HARD BLOCK)
- TOUT contenu francais DOIT porter ses accents complets (é, è, ê, à, â, ù, û, î, ï, ô, ç)
- Un article sans accents = REJECT automatique par content-evaluator et eeat-compliance
- URLs, slugs et paths de fichiers restent SANS accents
- Le frontmatter YAML des articles DOIT avoir les accents (sauf champs url:)
- Les fichiers de config (.md rules, skills) peuvent rester sans accents

## Regles YMYL (IMPORTANT)
- Contenu sante : double gate obligatoire (content-evaluator >= 70 + eeat-compliance >= 80)
- Toute affirmation medicale DOIT etre sourcee (HAS, INSERM, OMS, PubMed)
- Jamais de promesse therapeutique ("guerir", "eliminer", "100% efficace")
- Disclaimer sante obligatoire sur chaque page contenu
- Sources < 3 ans obligatoire

## Chaine GAN (ordre obligatoire)
```
me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator (>=70)
→ me-eeat-compliance (>=80) → nposts-seo-fixer → nposts-seo-post-publish
```
- Protocole RETRY : evaluateur juge, ne modifie jamais. Max 3 iterations puis escalade humaine.
- Double gate YMYL : JAMAIS bypasser les 2 gates pour du contenu sante.

## MCPs & SEO Data

| MCP | Usage | Cout |
|-----|-------|------|
| **DataForSEO** | SERP, Keywords, OnPage, Labs, Backlinks, AI Optimization (GEO) | ~$0.20/sem |
| **Google Search Console** | Clicks, impressions, CTR — donnees directes | Gratuit |
| **PageSpeed API** | Core Web Vitals mobile (audience seniors) | Gratuit |
| **Notion** | Rapports SEO, tracking articles, pipeline leads | Gratuit |
| **GitHub** | PRs articles, corrections SEO | Gratuit |

DataForSEO remplace SE Ranking (avril 2026). Skills SEO partages avec nposts_website.
GEO Tracker : verifie si leguideauditif.fr est cite par ChatGPT/Perplexity/Gemini
sur les requetes sante auditive (5 prompts trackes hebdo).

## Design system
- Palette: marine (#1B2E4A) | creme (#F8F5F0) | orange (#D97B3D)
- Font: Inter (sans) + Merriweather (serif)
- Base: 18px (accessibilite seniors) | Line-height: 1.75
- Audience: seniors 65+, vouvoiement systematique, Flesch FR 60-80

## Composants reutilisables
- `AuthorBox.astro` — encadre auteur avec credentials DE
- `HealthDisclaimer.astro` — disclaimer sante obligatoire
- `AffiliateDisclosure.astro` — mention affiliation
- `ComparisonTable.tsx` — tableau comparatif produits (React)
- `LeadForm.tsx` — formulaire devis (React)
- `FAQ.astro` — FAQ avec schema.org FAQPage
- `SEOHead.astro` — meta tags supplementaires

## Collections de contenu
- `src/content/guides/` : perte-auditive, appareils-auditifs, acouphenes, prevention, remboursement, vie-quotidienne
- `src/content/comparatifs/` : appareils compares avec fiches produits + liens affilies

## Code style
- TypeScript strict, pas de `any`
- ESM (`import/export`), jamais CommonJS
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Branches: `feat/`, `fix/`, `content/`

## SEO
- Title < 60 chars | Meta description < 155 chars
- Min 2 liens internes par article | Schema.org obligatoire
- Images: alt text obligatoire, format WebP
- Sitemap auto via @astrojs/sitemap

## Auteur
Franck-Olivier, Audioprothesiste DE, 28 ans exp, 18 centres diriges, 3000+ patients adaptes.
Page auteur: /auteur/franck-olivier/
E-E-A-T: Trust pondere x1.75 (YMYL sante)

## Langue
Francais par defaut. Ton direct, professionnel. Toujours lister les actions AVANT de les executer.
