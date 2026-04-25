# Architecture LeGuideAuditif

## Collections de contenu (`src/content/`)

| Collection | Pattern | Usage |
|---|---|---|
| `guides/` | `**/*.{md,mdx}` | Articles informationnels (perte-auditive, appareils-auditifs, acouphenes, prevention, remboursement, vie-quotidienne, audioprothesiste, marques) |
| `comparatifs/` | `**/*.{md,mdx}` | Comparatifs produits (appareils-auditifs, protections-auditives, accessoires, aides-ecoute) |
| `catalogue-appareils/` | `**/*.json` | Fiches produits structurees (cf. classe1-definition.md pour les flags) |
| `plateformes/` | `**/*.{md,mdx}` | Pages plateformes (audifon, lyric, etc.) |

Loader : `glob({ pattern, base })` (Astro 6) — pas l'ancien `defineCollection({ type: 'content' })`.

Schemas valides dans [src/content.config.ts](../../src/content.config.ts).

## Layouts (`src/layouts/`)

| Layout | Usage |
|---|---|
| `BaseLayout.astro` | Layout parent (header, footer, skip-to-content, meta SEO) |
| `ArticleLayout.astro` | Articles non-pillar |
| `GuideLayout.astro` | Guides pillar et standard (TOC, AuthorBox, HealthDisclaimer) |
| `ComparatifLayout.astro` | Comparatifs avec ComparisonTable + LeadForm |
| `AudioproLayout.astro` | Espace pro (sidebar nav + auth gate) |

## Composants cles (`src/components/`)

**Editorial obligatoire YMYL** :
- `AuthorBox.astro` — encadre auteur DE
- `HealthDisclaimer.astro` — disclaimer sante
- `AffiliateDisclosure.astro` — mention affiliation
- `Breadcrumbs.astro` — fil d'ariane (schema.org BreadcrumbList)

**Conversion** :
- `LeadForm.tsx` — formulaire devis (React)
- `LocalAnnuaireCTA.astro` — CTA recherche centre
- `NewsletterCapture.astro` / `NewsletterForm.tsx`
- `CtaBanner.astro` / `ComparatifBanner.astro`

**Contenu structure** :
- `ComparisonTable.tsx` — tableau comparatif produits
- `FAQ.astro` (+ `FaqPreview.astro`) — schema.org FAQPage
- `TableOfContents.astro` — TOC anchors
- `QuickAnswer.astro` — encart Featured Snippet (frontmatter `quickAnswer:`)
- `MotExpert.astro` — definition glossaire inline
- `EditorialIntro.astro` — intro auteur

**Outils interactifs** :
- `AudiogramAnalyzer.tsx` — analyse audiogramme PDF
- `AudiogramSimulator.tsx` — simulateur perte
- `AudioMap.tsx` — carte 7654 centres (Leaflet)
- `MiniMap.tsx` — preview carte

**Meta/SEO** :
- `SEOHead.astro` — meta tags + JSON-LD
- `Hero.astro` — hero section
- `BrandLogo.astro` — logos marques
- `StatsSection.astro` — stats homepage

## Libs (`src/lib/`)

**Auth & Admin** :
- `auth.ts` — helpers Supabase
- `admin-guard.ts` / `admin-token.ts` / `adminNav.ts` / `fetchAdmin.ts` — middleware admin
- `audiopro-lifecycle.ts` / `audiopro-signup.ts` / `audiopro.ts` / `audiopro-mock.ts` — espace pro

**Tracking** :
- `attribution.ts` — cookie `lga_attr` 90j (cf. rgpd-tracking.md)
- `ga4-mp.ts` — GA4 Measurement Protocol serveur
- `tracking.ts` / `track.ts` — events client

**Business** :
- `stripe.ts` — checkout, webhooks, portail
- `email.ts` — Resend wrappers
- `tasks.ts` — file de taches (admin)
- `prospects.ts` — CRM prospects audiopro
- `contactsImport.ts` — import contacts
- `calendly.ts` — book a call

**Data** :
- `supabase.ts` — client public
- `catalogue-utils.ts` — helpers fiches produits (`isClasse1()`, etc.)
- `departements.ts` — referentiel
- `actualites-templates.ts` — templates actu audiopro
- `schema-helpers.ts` — JSON-LD generators

**UI** :
- `useToast.ts` — hook toast notifications

## Pages (`src/pages/`)

**Public** :
- `index.astro`, `a-propos.astro`, `contact.astro`, `faq.astro`, `glossaire.astro`
- `cgu.astro`, `mentions-legales.astro`, `politique-confidentialite.astro`, `politique-editoriale.astro`
- `404.astro`

**Editorial** :
- `guides/`, `comparatifs/`, `catalogue/`, `etudes/`, `auteur/`

**Annuaire & Centres** :
- `audioprothesiste/`, `centre/`, `trouver-audioprothesiste/`, `revendiquer/`, `revendiquer-gratuit/`

**Espace pro** :
- `audioprothesiste-pro/` (10 pages : abonnement, actualites, annonces, bienvenue, cas-patients, compte, fiche, leads, mes-appareils, index)
- `connexion-pro.astro`, `auth/`

**Admin** :
- `admin/` — dashboard interne (gere par middleware + admin-guard)

**Marketplace** :
- `annonces/` — petites annonces B2B
- `offres/` — offres reservees
- `devis/` — funnel devis

**Outils** :
- `outils/` — audiogramme, simulateur, etc.

**API** :
- `api/checkout.ts`, `api/annonces-checkout.ts`, `api/webhook.ts` (Stripe)
- `api/centre-update.ts`, `api/claim.ts`, `api/download-lead.ts`
- `api/og/` — OG images dynamiques (`@vercel/og`)
- `api/admin/`, `api/audiopro/`, `api/auth/`

**Sitemaps** :
- `sitemap-centres.xml.ts`, `sitemap-pages-locales.xml.ts`

## Subagents project (`.claude/agents/`)
- `astro-developer` — composants Astro/React et pages
- `content-pipeline` — orchestre la chaine GAN
- `eeat-reviewer` — verifie E-E-A-T et YMYL
- `seo-auditor` — audit technique SEO + Schema.org

## Hooks Claude Code (`.claude/hooks/`)

| Phase | Hook | Matcher | Effet |
|---|---|---|---|
| PreToolUse | `block-no-verify.sh` | Bash | Bloque `--no-verify` (commits/push) |
| PreToolUse | `block-env-edit.sh` | Edit/Write/MultiEdit | Bloque ecriture `.env*`, secrets, `.pem`, `.key` |
| PreToolUse | `suggest-compact.sh` | Edit/Write | Suggere /compact si contexte > seuil |
| PostToolUse | `auto-format.sh` | Edit/Write | Prettier/eslint sur fichier modifie (15s) |
| PostToolUse | `block-any-type.sh` | Edit/Write/MultiEdit | Bloque introduction de `any` (TS strict) |
| PostToolUse | `file-size-warn.sh` | Edit/Write/MultiEdit | Warn si fichier > N lignes |
| Stop | `stop-build-check.sh` | * | `npm run build` avant fin de session (60s) |
| Stop | `session-end-memory.sh` | * | Snapshot memoire persistante (10s) |
| Stop | `check-harness-coherence.sh` | * | Verifie coherence settings.json |

Settings : [.claude/settings.json](../../.claude/settings.json).
