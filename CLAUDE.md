# LeGuideAuditif.fr

## Projet
Site independant d'information sante auditive + generation de leads pour audioprothesistes partenaires.
- URL: https://leguideauditif.fr
- Stack: Astro 6 + React 19 + Tailwind v4 + Vercel + MDX
- Node: >=22.12.0
- Auteur: Franck-Olivier Chabbat, audioprothesiste DE, 25+ ans, 3000+ patients

## Commandes
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npx astro preview`

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
Franck-Olivier, Audioprothesiste DE, 25 ans exp, 18 centres diriges, 3000+ patients adaptes.
Page auteur: /auteur/franck-olivier/
E-E-A-T: Trust pondere x1.75 (YMYL sante)

## Langue
Francais par defaut. Ton direct, professionnel. Toujours lister les actions AVANT de les executer.
