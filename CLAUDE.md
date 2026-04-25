# LeGuideAuditif.fr

## Projet
Site independant d'information sante auditive + generation de leads pour audioprothesistes partenaires + espace pro (dashboard, annonces).

- URL prod : https://leguideauditif.fr
- Stack : Astro 6.1 + React 19.2 + Tailwind v4 + Vercel + MDX
- Node : >=22.12.0
- Deployment : Vercel SSR (`@astrojs/vercel`)
- Auteur : Franck-Olivier Chabbat, audioprothesiste DE, 28 ans exp, 3000+ patients

## Stack complete
- **Front** : Astro 6.1, React 19.2, Tailwind v4, astro-icon (Lucide), MDX
- **Backend SaaS** : Supabase (auth + DB + storage), Stripe 22 (paiements), Resend 6 (emails)
- **Carto** : Leaflet 1.9 + react-leaflet 5 (7654 centres)
- **Search** : Pagefind 1.5 (index statique post-build)
- **CMP** : tarteaucitronjs 1.32 (RGPD/CNIL self-hosted)
- **Tracking** : GA4 Measurement Protocol serveur + cookie attribution `lga_attr` 90j
- **Tests** : Playwright (E2E avec seed Supabase)
- **Build assets** : @vercel/og (OG dynamiques), dnd-kit (admin)

## Commandes
```bash
npm install                # Install
npm run dev                # Dev server (Astro)
npm run build              # Build prod : prebuild copy tarteaucitron + astro build + pagefind index
npm run preview            # Preview build
npm run test:e2e           # Tests E2E rapides (sans @full)
npm run test:e2e:full      # Tests E2E complets (incluant Stripe live test mode)
npm run test:e2e:ui        # Playwright UI
npm run test:e2e:seed      # Seed centre test (CP 99999) avant E2E
```

Note : `prebuild` execute `node scripts/copy-tarteaucitron.mjs` (copie le CMP self-hosted depuis node_modules vers public/).
Note build : `astro build && pagefind --site dist/client && cp -r dist/client/pagefind .vercel/output/static/pagefind` — Pagefind doit etre copie dans `.vercel/output/static/` (sinon 404 en prod).

## Architecture (resume)
- `src/pages/` : routes Astro (pages publiques + admin + audioprothesiste-pro + annonces + outils + api)
- `src/content/` : 4 collections MDX (`guides`, `comparatifs`, `catalogue-appareils`, `plateformes`)
- `src/components/` : 30+ composants .astro et .tsx
- `src/layouts/` : 5 layouts (`BaseLayout`, `ArticleLayout`, `GuideLayout`, `ComparatifLayout`, `AudioproLayout`)
- `src/lib/` : 25+ libs (auth, supabase, stripe, attribution, ga4-mp, tasks, tracking, email, etc.)
- `src/middleware.ts` : SSR auth gate (admin + audiopro)
- `scripts/` : ETL RPPS, generation images IA (Gemini Imagen), seed E2E, copy CMP
- `public/` : assets statiques + tarteaucitron (copie au prebuild)

Details complets : voir [.claude/rules/architecture.md](.claude/rules/architecture.md)

## Regles modulaires `.claude/rules/`
Chargees automatiquement selon le contexte (frontmatter `globs:`) :

| Fichier | Scope | Sujet |
|---|---|---|
| `accessibility.md` | global | A11y seniors 65+ (18px, contraste WCAG AA, touch targets) |
| `affiliate.md` | comparatifs/produits | Mention affiliation, `rel="sponsored noopener"`, classe 1+2 |
| `architecture.md` | global | Collections, layouts, libs, agents, hooks Claude Code |
| `auth-supabase.md` | src/middleware + audiopro | 3 methodes auth, cookies SSR, middleware gates |
| `classe1-definition.md` | catalogue | Flag `rac0` canonique, granularite 1 fiche = 1 niveau |
| `no-emoji.md` | global | astro-icon Lucide uniquement, pas d'emoji Unicode |
| `rgpd-tracking.md` | tracking + tarteaucitron | CMP gating, attribution 90j, MP serveur, lga_attr |
| `testing-e2e.md` | tests/ + e2e | Playwright, seed CP 99999, Stripe test mode |
| `ymyl.md` | content/guides + comparatifs | Sources HAS/INSERM, pas de promesse therapeutique, double gate |

## Regles transverses (HARD BLOCK)

### Accents UTF-8
- TOUT contenu francais DOIT porter ses accents complets (e, e, e, a, a, u, u, i, i, o, c) — `é è ê à â ù û î ï ô ç`
- Article sans accents = REJECT par content-evaluator et eeat-compliance
- URLs, slugs, paths de fichiers : SANS accents
- Frontmatter YAML : AVEC accents (sauf champs `url:`)
- Fichiers `.claude/rules/`, skills, configs : SANS accents (convention)

### YMYL Sante
- Double gate obligatoire : content-evaluator >= 70 ET eeat-compliance >= 80
- Toute affirmation medicale sourcee (HAS, INSERM, OMS, PubMed)
- Sources < 3 ans (sinon mentionner "a date de publication")
- Disclaimer sante (HealthDisclaimer.astro) + AuthorBox.astro obligatoires
- Detail : [.claude/rules/ymyl.md](.claude/rules/ymyl.md)

### Production
- LGA est en prod (pas de MVP). Chaque feature doit etre finie : pas de stub, pas de TODO laisse, UX polie.
- Aucune modification destructive sans confirmation explicite (git reset --hard, force push, drop tables, etc.)
- Hooks PreToolUse bloquent : `--no-verify`, edition `.env`, secrets hardcodes (voir `.claude/hooks/`)

## Chaine GAN — Contenu editorial (obligatoire)
```
me-affiliate-writer
  -> nposts-seo-humanizer
  -> nposts-content-evaluator (>=70)
  -> me-eeat-compliance (>=80)
  -> nposts-seo-fixer
  -> nposts-seo-post-publish
```

Catalogue produits :
```
me-product-researcher
  -> me-product-writer
  -> me-product-evaluator (>=80)
  -> nposts-seo-humanizer
  -> me-eeat-compliance (>=80)
```

Snippets SEO (title/meta/H1) :
```
me-gsc-ingestor -> me-query-mapper -> me-title-auditor
  -> me-title-writer -> me-snippet-evaluator (>=70) -> me-eeat-snippet-check
  -> me-snippet-fixer -> me-snippet-monitor
```

Regle commune : evaluateurs ne modifient JAMAIS, max 3 retries puis escalade humaine.
JAMAIS bypasser les 2 gates YMYL.

## Subagents project (`.claude/agents/`)
- `astro-developer` — composants Astro/React et pages
- `content-pipeline` — orchestre la chaine GAN
- `eeat-reviewer` — verifie E-E-A-T et YMYL avant publication
- `seo-auditor` — audit technique SEO + Schema.org

## Hooks Claude Code (`.claude/hooks/`)
- **PreToolUse** : `block-no-verify` (Bash), `suggest-compact` (Edit/Write), `block-env-edit` (Edit/Write/MultiEdit)
- **PostToolUse** : `auto-format` (Edit/Write, 15s), `file-size-warn`, `block-any-type` (TS strict)
- **Stop** : `stop-build-check` (60s), `session-end-memory` (10s), `check-harness-coherence`

## MCPs & SEO Data

| MCP | Usage | Cout |
|---|---|---|
| **DataForSEO** | SERP, Keywords, OnPage, Labs, Backlinks, AI Optimization | ~$0.20/sem |
| **Google Search Console** | Clicks, impressions, CTR | Gratuit |
| **Notion** | Rapports SEO, tracking articles, pipeline leads | Gratuit |
| **GitHub** | PRs articles, corrections SEO | Gratuit |
| **Supabase** | Lecture/ecriture DB (centres, leads, claims) | Self |

DataForSEO remplace SE Ranking depuis avril 2026. Skills SEO partages avec nposts_website.
GEO Tracker : verifie si leguideauditif.fr est cite par ChatGPT/Perplexity/Gemini (5 prompts hebdo).

## Design system
- Palette : marine `#1B2E4A` | creme `#F8F5F0` | orange `#D97B3D`
- Font : Inter (sans) + Merriweather (serif)
- Base : 18px (accessibilite seniors) | line-height 1.75
- Audience : seniors 65+, vouvoiement systematique, Flesch FR 60-80

## Code style
- TypeScript strict, `any` interdit (hook `block-any-type` post-edit)
- ESM (`import/export`), pas de CommonJS
- Conventional commits : `feat:`, `fix:`, `docs:`, `chore:`, `content:`
- Branches : `feat/`, `fix/`, `content/`, `chore/`

## SEO
- Title < 60 chars | Meta description < 155 chars
- Min 2 liens internes par article | Schema.org obligatoire
- Images : alt text obligatoire, format WebP
- Sitemap auto via `@astrojs/sitemap` + sitemaps custom (`sitemap-centres.xml.ts`, `sitemap-pages-locales.xml.ts`)
- Pagefind : index statique genere au build, JS UMD global `window.PagefindUI`

## Auteur
Franck-Olivier Chabbat, Audioprothesiste DE, 28 ans exp (Amplifon, Audika, 18 centres Afflelou, 5 ans Auzen.com), 3000+ patients.
- Page auteur : `/auteur/franck-olivier/`
- E-E-A-T : Trust pondere x1.75 (YMYL sante)
- Ne vend plus depuis 2025 (rester factuel sur le passe, pas de faux terrain)

## Langue
Francais par defaut. Ton direct, professionnel. Toujours lister les actions AVANT de les executer.
