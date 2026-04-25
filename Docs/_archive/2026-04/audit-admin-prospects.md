# Audit — Admin Prospects LeGuideAuditif.fr

Date : 2026-04-21
Livrable posé par le prompt `claude-code-prompt-admin-prospects.md` (Étape 1).
Findings bruts. Aucune proposition, aucune correction.

Note : le dossier existant est `Docs/` (majuscule) — toutes les specs et PRD du repo y sont. L'audit est donc posé ici plutôt que dans `docs/` (minuscule) pour respecter la convention.

---

## 1.1 Admin actuel

### Pages sous `src/pages/admin/`
Deux fichiers uniquement :

- `src/pages/admin/index.astro` — tableau de bord. Affiche KPI centres (total / revendiqués / premium / claims pending), leads devis, leads fiches PDF, vues fiches, complétude des fiches revendiquées (% par champ : tel, site_web, horaires, a_propos, photo_url, specialites, marques), annonces (actives / expirées / signalements / revenu), profils, liste des 5 derniers claims pending.
- `src/pages/admin/claims.astro` — gestion des revendications. Liste complète des claims `pending` (cards dépliées), liste dépliable des 20 derniers claims `approved` / `rejected`, boutons Approuver / Rejeter / Offrir Premium / Révoquer. JS client inline qui POST vers `/api/admin/*`.

### Auth admin
Mécanisme unique côté pages `/admin/*` : session Supabase via cookies + vérification email hardcodé.

Flow exact (5 lignes) :
1. `src/middleware.ts` lit cookies `sb-access-token` + `sb-refresh-token` sur chaque requête HTML
2. `supabase.auth.setSession({ access_token, refresh_token })` → récupère le user
3. `context.locals.user = user || null`
4. Chaque page admin (`index.astro`, `claims.astro`) fait `if (!user || user.email !== 'franckolivier@leguideauditif.fr') return Astro.redirect('/auth/login/')`
5. Les API admin (`src/pages/api/admin/*.ts`) refont le même contrôle inline avec `createClient(...).auth.setSession(...)` et même test sur `ADMIN_EMAIL`

Constantes :
- `ADMIN_EMAIL = 'franckolivier@leguideauditif.fr'` — dupliqué dans chaque fichier (index.astro, claims.astro, approve-claim.ts, reject-claim.ts, generate-premium-link.ts, upgrade-premium.ts, quick-approve.ts, quick-reject.ts)
- Pas de table `admins`, pas de variable d'env pour la liste des emails admin

Seconde stratégie coexistante (pas utilisée côté pages admin) :
- `src/lib/admin-token.ts` génère des tokens HMAC-SHA256 (clé = `SUPABASE_SERVICE_ROLE_KEY`) pour les actions admin one-click depuis email (ex. approuver un claim depuis un lien dans un email). Hors périmètre du dashboard.

---

## 1.2 Schema Supabase

### Migrations présentes (`supabase/migrations/`)
11 migrations, séquentielles :
- 001 : `centres_auditifs`
- 002 : `leads_downloads`
- 003 : champs ghost + revendication gratuite (ajoutent `photo_url`, `specialites`, `marques`, `claimed`, `claimed_by_name`, `claimed_by_adeli`…)
- 004 : enum `plan` (text + CHECK : `rpps` / `claimed` / `premium`), champ `a_propos`
- 005 : `centre_page_views` + RPC `nearby_claimed_centres` + RPC `centre_view_stats` + colonnes `audio_nom` / `audio_prenom`
- 006 : enum `claim_status` (text + CHECK : `none` / `pending` / `approved` / `rejected`)
- 007 : enrichissement INSEE (date_creation_etablissement, categorie_juridique, tranche_effectifs, code_naf, est_siege, nombre_etablissements, insee_enriched_at…) + vues `v_nouveaux_centres`, `v_centres_independants`
- 008 : documentation prod du système `annonces` + `profiles` + alertes + signalements + paiements + contacts
- 009 : `claim_attributions` (attribution marketing UTM/gclid/referrer/GA client_id)
- 010 : `centre_redirects` (redirects 301 slug→slug pour ré-import FINESS)
- 011 : `enseigne` + `raison_sociale` sur `centres_auditifs`

### Tables présentes
- `centres_auditifs` — annuaire
- `centre_page_views` — compteur vues fiches (append-only)
- `centre_redirects` — redirects 301
- `leads_downloads` — leads fiches PDF
- `leads` — mentionnée dans `admin/index.astro` (queries `.from('leads')`) mais aucune migration trouvée dans `supabase/migrations/` → créée hors repo
- `profiles` — profils utilisateurs annonces (lié à `auth.users`)
- `annonces`, `annonces_contacts`, `annonces_paiements`, `annonces_alertes`, `annonces_signalements` — système petites annonces
- `claim_attributions` — attribution marketing des revendications (append-only)

### Tables `prospects` / `leads` / `contacts` / `partners` / `claims`
- Aucune table `prospects` ou `partners`
- Pas de table `claims` séparée : les revendications sont stockées directement sur `centres_auditifs` via les colonnes `claim_status`, `claimed_by_email`, `claimed_by_name`, `claimed_by_adeli`, `claimed_at`, `plan`
- `leads` (leads devis) = table présente en prod mais pas de migration dans le repo. Colonnes exactes non vérifiables ici — usage constaté : `SELECT COUNT(*)` avec filtre `created_at >= X`
- `leads_downloads` existe (leads fiches PDF) : colonnes `email, nom, prenom, telephone, product_slug, product_name, pdf_url, source, created_at`
- `annonces_contacts` = contacts posés sur annonces (pas CRM)
- `claim_attributions` = attribution marketing, pas CRM : ne stocke que le canal d'acquisition, pas l'historique d'une relation

### Structure table qui stocke les centres (~9 390)
Table `centres_auditifs`. Colonnes clés :
```
id UUID PK
legacy_id TEXT
slug TEXT UNIQUE
nom TEXT, enseigne TEXT, raison_sociale TEXT
adresse TEXT, cp TEXT, ville TEXT, departement TEXT
lat DOUBLE PRECISION, lng DOUBLE PRECISION
siret TEXT, tel TEXT, horaires TEXT, site_web TEXT, email TEXT
finess TEXT
source TEXT DEFAULT 'rpps'
audio_nom TEXT, audio_prenom TEXT
-- Ghost / premium
photo_url TEXT, specialites TEXT[], marques TEXT[], reseaux_sociaux JSONB, a_propos TEXT
-- Plan
plan TEXT CHECK('rpps'|'claimed'|'premium')
-- Claim
claim_status TEXT CHECK('none'|'pending'|'approved'|'rejected')
claimed_by_email TEXT, claimed_by_name TEXT, claimed_by_adeli TEXT, claimed_at TIMESTAMPTZ
claimed BOOLEAN -- legacy
verifie BOOLEAN -- legacy
-- Premium / Stripe
is_premium BOOLEAN, stripe_customer_id TEXT, stripe_subscription_id TEXT
premium_since TIMESTAMPTZ, premium_until TIMESTAMPTZ
-- INSEE
date_creation_etablissement DATE, date_creation_entreprise DATE
etat_administratif TEXT DEFAULT 'A'
categorie_juridique TEXT, tranche_effectifs TEXT, categorie_entreprise TEXT
code_naf TEXT, est_siege BOOLEAN, nombre_etablissements INT, insee_enriched_at TIMESTAMPTZ
-- Timestamps
created_at, updated_at TIMESTAMPTZ
```
Index : `departement`, `cp`, `is_premium` (droppé en 004), `plan`, `claim_status`, `lat/lng`, `stripe_customer_id`, `siret (partial)`, `date_creation_etablissement`, `etat_administratif`, `categorie_juridique`.

### Structure qui stocke les revendications (~62 `plan claimed`)
Stockées **dans `centres_auditifs`** via les colonnes :
- `claim_status` (`pending` / `approved` / `rejected` / `none`)
- `plan` (`rpps` / `claimed` / `premium`)
- `claimed_by_email`, `claimed_by_name`, `claimed_by_adeli` (ADELI/SIRET), `claimed_at`

Pas de table join, pas d'historique des demandes. Si un centre est re-revendiqué après rejet, les champs sont écrasés. L'historique marketing (pas éditorial) est conservé dans `claim_attributions`.

### Enums / types personnalisés réutilisables
Aucun vrai `CREATE TYPE ... AS ENUM`. Tous les enums sont `TEXT + CHECK CONSTRAINT` :
- `plan` : `'rpps' | 'claimed' | 'premium'`
- `claim_status` : `'none' | 'pending' | 'approved' | 'rejected'`
- `profil_type` (sur `profiles`) : `'audioprothesiste_de' | 'etudiant_audio' | 'assistant_audio' | 'enseigne' | 'investisseur' | 'autre'`
- `source` (sur `centres_auditifs`) : libre, valeurs observées : `'rpps'`, `'finess'`

### RLS
Activé sur **toutes les tables applicatives**. Politiques présentes :

| Table | Policies |
|---|---|
| `centres_auditifs` | SELECT public `USING (true)`. Pas de policy INSERT/UPDATE/DELETE → écriture via `service_role` uniquement (bypass RLS). |
| `centre_page_views` | SELECT public, INSERT anon `WITH CHECK (true)`. |
| `centre_redirects` | SELECT public, écriture `service_role` only. |
| `leads_downloads` | RLS ON, aucune policy → tout bloqué sauf `service_role`. |
| `profiles` | SELECT / INSERT / UPDATE `auth.uid() = id` (propriétaire). |
| `annonces` | SELECT public si `statut IN ('active','expiree')`, SELECT / INSERT / UPDATE / DELETE si `auth.uid() = user_id`. |
| `annonces_contacts` | INSERT public, SELECT si propriétaire de l'annonce liée. |
| `annonces_paiements` | SELECT `auth.uid() = user_id`, INSERT public (commentaire : via service_role). |
| `annonces_alertes` | SELECT / INSERT / UPDATE / DELETE `auth.uid() = user_id`. |
| `annonces_signalements` | INSERT public, SELECT `auth.uid() = user_id`. |
| `claim_attributions` | RLS ON, **aucune policy** → tout bloqué sauf `service_role`. |

---

## 1.3 Composants UI réutilisables

### Répertoires
- `src/components/admin/` → **n'existe pas**
- `src/components/ui/` → **n'existe pas**

### Composants existants (hors admin)
Inventaire :
- Racine : `Header.astro`, `Footer.astro`, `SEOHead.astro`, `HealthDisclaimer.astro`, `AffiliateDisclosure.astro`, `AuthorBox.astro`, `LocalAnnuaireCTA.astro`, `Hero.astro`, `CtaBanner.astro`, `EditorialIntro.astro`, `QuickAnswer.astro`, `StatsSection.astro`, `Temoignages.astro`, `TrustBar.astro`, `NewsletterCapture.astro`, `DerniersArticles.astro`, `FAQ.astro`, `FaqPreview.astro`, `ParcoursUtilisateur.astro`, `ZoomSanteSection.astro`, `GuideCard.astro`, `Breadcrumbs.astro`, `TableOfContents.astro`, `ComparatifBanner.astro`, `ComparisonTable.tsx`, `LeadForm.tsx`, `NewsletterForm.tsx`, `AudiogramSimulator.tsx`, `AudiogramAnalyzer.tsx`, `AudioMap.tsx`, `MiniMap.tsx`, `VideoExpert.astro`, `MotExpert.astro`, `BrandLogo.astro`
- `article/` : `ArticleHeader.astro`, `ArticleCTA.astro`, `Callout.astro`, `ProductCard.astro`, `ReadingProgress.astro`, `SectionDivider.astro`, `SectionHeading.astro`, `StatHighlight.astro`, `TableOfContents.astro`
- `auth/` : `LoginForm.tsx`, `RegisterForm.tsx`, `ProfileForm.tsx`, `AuthGuard.tsx`
- `catalogue/` : `Breadcrumbs.astro`, `HealthDisclaimer.astro`, `LeadCTA.astro`, `PriceDisclaimer.astro`, `ProductSpecs.astro`, `ProductCard.astro`, `ExpertOpinion.astro`, `DownloadGate.tsx`, `ProductGallery.tsx`, `QuizAuditif.tsx`, `ComparatorTool.tsx`, `CatalogueGrid.tsx`
- `centre/` : `CentreAlertBanner.astro`, `CentreBrands.astro`, `CentreClaimCTA.astro`, `CentreCompetitors.astro`, `CentreCompleteness.astro`, `CentreHeader.astro`, `CentreInfoGrid.astro`, `CentreMap.astro`, `CentreSpecialties.astro`, `CentreStats.astro`, `CentreUpgradeCard.astro`
- `annonces/` : `AlerteForm.tsx`, `AnnonceCard.tsx`, `AnnonceDetail.tsx`, `AnnonceForm.tsx`, `AnnonceListing.tsx`, `AnnoncesBanner.astro`, `ContactForm.tsx`, `DashboardAnnonces.tsx`, `SignalementButton.tsx`
- `etudes/` : `CiterEtude.tsx`, `DepartementCard.tsx`, `DepartementRanking.tsx`, `DesertAuditifsMap.tsx`, `DesertsAuditifsIsland.tsx`, `DownloadLeadMagnet.tsx`, `RegionExport.tsx`

### Primitives Card / Badge / Button / Input / Select / Textarea / Modal / DataTable / Stat / Chip
**Aucune primitive générique nommée comme telle.** Chaque composant construit ses propres styles Tailwind inline, classe par classe. Quelques patterns récurrents visibles dans `admin/*.astro` :
- **Card** : `rounded-xl border border-gris-clair bg-blanc p-5` (stats) ou `p-6` (cards de contenu)
- **Badge / Chip** : `rounded-full bg-[#FAEEDA] px-2 py-0.5 text-xs font-medium text-[#854F0B]` (ambre pending) / `bg-[#E1F5EE] text-[#0F6E56]` (vert approved) / `bg-[#FCEBEB] text-[#A32D2D]` (rouge rejected) / `bg-[#E6F1FB] text-[#0C447C]` (bleu info)
- **Button primary** : `rounded-lg bg-marine px-4 py-2.5 text-sm font-medium text-blanc font-sans hover:bg-marine-light`, `style="min-height: 44px"` (accessibilité seniors)
- **Button approve** : `bg-[#0F6E56] hover:bg-[#0A5843]`
- **Button reject** : `bg-blanc border border-[#A32D2D] text-[#A32D2D] hover:bg-[#FCEBEB]`
- **Stat tile** : card + icône 10x10 rounded-lg sur fond de couleur + label + chiffre 2xl bold

### Libs UI installées dans `package.json`
Aucune : pas de `shadcn-ui`, pas de `@radix-ui/*`, pas de `@headlessui/*`, pas de `tailwindui`. Tailwind v4 utilisé directement.

### Icônes
Conformes à la règle CLAUDE.md :
- `astro-icon` (1.1.5) + `@iconify-json/lucide` (1.2.101)
- Usage : `import { Icon } from 'astro-icon/components'` puis `<Icon name="lucide:shield-check" class="w-4 h-4" />`
- SVG inline pour les composants React (pas vu d'import Lucide React, mais tracé confirmé via components React qui déclarent leurs SVG manuellement)
- Aucun emoji Unicode dans le code.

---

## 1.4 Stack data & API

### API routes présentes (`src/pages/api/`)
14 fichiers :

| Route | Rôle |
|---|---|
| `admin/approve-claim.ts` | POST — valide une revendication (vérif session admin + service_role write) |
| `admin/reject-claim.ts` | POST — rejette ou révoque (retour ghost) |
| `admin/quick-approve.ts` | POST — approbation one-click depuis email (token HMAC) |
| `admin/quick-reject.ts` | POST — rejet one-click depuis email (token HMAC) |
| `admin/generate-premium-link.ts` | POST — génère lien magic premium pour un slug |
| `admin/upgrade-premium.ts` | POST — active le plan premium (gift admin) |
| `checkout.ts` | POST — crée session Stripe premium centre |
| `annonces-checkout.ts` | POST — crée session Stripe annonces |
| `webhook.ts` | POST — webhook Stripe (paiements confirmés) |
| `download-lead.ts` | POST — enregistre lead fiche PDF + sert le PDF |
| `page-view.ts` | POST — compteur vues fiches (anon insert) |
| `centre-update.ts` | POST — update infos d'un centre revendiqué par son owner |
| `og/silo.ts` | GET — image OG dynamique via `@vercel/og` |
| `claim.ts` | POST — soumission de revendication (crée `claim_attributions` + update `centres_auditifs`) |

### Client Supabase
Utilisé **des deux côtés** :

- **Client (browser)** : `src/lib/supabase.ts` exporte `export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)`. Utilisé directement dans les composants React (`LoginForm.tsx`, `DashboardAnnonces.tsx`…) via `src/lib/auth.ts` (wrappers `signUp`, `signIn`, `signInWithMagicLink`, `signOut`, `getUser`, `getSession`, `getProfile`, `upsertProfile`).
- **Serveur (API + pages SSR)** : `createServerClient()` qui instancie `createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` → bypass RLS. Utilisé dans toutes les `/api/**` + les pages admin en `prerender = false`.

Pages admin en SSR : `export const prerender = false` activé sur `admin/index.astro` et `admin/claims.astro`.

### Variables d'env Supabase
Fichier `.env` présent (pas de `.env.example` dans le repo).
- `PUBLIC_SUPABASE_URL` — exposée au client
- `PUBLIC_SUPABASE_ANON_KEY` — exposée au client
- `SUPABASE_SERVICE_ROLE_KEY` — serveur uniquement

Autres env : `STRIPE_*` (8 variables), `RESEND_API_KEY`, `ADMIN_SECRET`, `GEMINI_API_KEY`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`.

### Pattern de mutations
Quasi-systématiquement **via endpoints serveur** pour toute action sensible :
1. API route reçoit POST JSON
2. Vérifie session Supabase via cookies (`sb-access-token` + `sb-refresh-token`)
3. Vérifie email = ADMIN_EMAIL (pour actions admin) ou ownership (pour user-scoped)
4. Instancie `createServerClient()` (service_role) pour l'écriture
5. Répond JSON `{ success: true }` ou `{ error: '...' }`

Exceptions (mutations depuis le client SDK avec anon key) : les actions user-scoped soumises à RLS (profils, annonces CRUD, alertes). Ex. `upsertProfile`, `supabase.from('annonces').insert(...)` directement dans les composants React `annonces/*`.

---

## 1.5 Conventions du repo (10 bullets)

1. Stack : Astro 6.1.4 + React 19.2.4 + Tailwind 4.2.2 + MDX 5.0.3 + adapter Vercel (`@astrojs/vercel` 10.0.4), Node ≥ 22.12.0.
2. Output mode Astro : `output: 'static'` avec `adapter: vercel()` → mode hybride, SSR opt-in via `export const prerender = false` sur chaque page dynamique (admin, auth, annonces, checkout).
3. Locale unique : `i18n: { defaultLocale: 'fr', locales: ['fr'] }`. Français partout, vouvoiement seniors 65+.
4. TypeScript strict : `extends: "astro/tsconfigs/strict"` + JSX React classic (`jsx: "react-jsx"`).
5. Design system : marine `#1B2E4A`, crème `#F8F5F0`, orange `#D97B3D`, Inter (sans) + Merriweather (serif), base 18px, line-height 1.75, touch targets 44x44.
6. YMYL double gate obligatoire : content-evaluator ≥ 70 + eeat-compliance ≥ 80 avant toute publication de contenu santé. Sources < 3 ans, pas de promesse thérapeutique, `HealthDisclaimer.astro` obligatoire.
7. No-emoji policy (HARD BLOCK) : pas de caractère emoji Unicode dans le code. Icônes uniquement via `astro-icon` + Lucide.
8. Accents UTF-8 (HARD BLOCK) : tout contenu français DOIT porter ses accents complets ; URLs et slugs restent sans accents.
9. Conventional commits : `feat:`, `fix:`, `docs:`, `chore:`. Branches `feat/`, `fix/`, `content/`. Branche courante : `feat/catalogue-seo-boost`.
10. Pas d'`AGENTS.md` au root. Règles projet dans `CLAUDE.md` + `.claude/rules/accessibility.md` + `.claude/rules/affiliate.md` + `.claude/rules/no-emoji.md` + `.claude/rules/ymyl.md`.

### Commandes `package.json`
- `dev` : `astro dev`
- `build` : `astro build && npx pagefind --site dist/client && cp -r dist/client/pagefind .vercel/output/static/pagefind` (Pagefind pour recherche site)
- `preview` : `astro preview`
- `astro` : `astro`
- `test:e2e:seed` : `node scripts/seed-test-centre.mjs`
- `test:e2e` : `npm run test:e2e:seed && playwright test --grep-invert=@full`
- `test:e2e:full` : `npm run test:e2e:seed && playwright test`
- `test:e2e:ui` : `npm run test:e2e:seed && playwright test --ui`
- `prebuild` / `predev` : `node scripts/copy-tarteaucitron.mjs` (CMP RGPD self-hosted)

**Pas de commande `migrate`** — les migrations SQL sont appliquées manuellement (via Supabase MCP ou dashboard).

---

## 1.6 Dépendances pertinentes

Extrait `package.json` :

### Drag & drop
- `dnd-kit` : **absent**
- `react-beautiful-dnd` : **absent**
- `framer-motion` : **absent**

Aucune lib de drag & drop installée.

### Validation
- `zod` : **absent**
- `react-hook-form` : **absent**
- `yup`, `joi`, `valibot` : **absent**

Aucune lib de validation installée. Les formulaires existants (`LoginForm.tsx`, `AnnonceForm.tsx`, `AuthorBox.astro`…) valident en JS inline (`if (!email) { setError(...) }`).

### Dates
- `date-fns` : **absent**
- `dayjs` : **absent**
- `luxon`, `moment` : **absent**

Manipulation de dates via `Date` natif + `toLocaleDateString('fr-FR', { ... })` + `new Date(Date.now() - X * 86400000)` pour les périodes (vu dans `admin/index.astro`).

### Dépendances notables présentes
- `@astrojs/mdx` 5.0.3, `@astrojs/react` 5.0.3, `@astrojs/sitemap` 3.7.2, `@astrojs/vercel` 10.0.4
- `@iconify-json/lucide` 1.2.101, `astro-icon` 1.1.5
- `@supabase/supabase-js` 2.102.0
- `@tailwindcss/vite` 4.2.2, `tailwindcss` 4.2.2
- `leaflet` 1.9.4, `react-leaflet` 5.0.0 (cartes)
- `stripe` 22.0.0, `resend` 6.10.0
- `@vercel/og` 0.11.1 (images OG dynamiques)
- `tarteaucitronjs` 1.32.0 (CMP RGPD)
- `react` 19.2.4, `react-dom` 19.2.4
- devDeps : `@playwright/test` 1.59.1, `dotenv` 17.4.2, `pagefind` 1.5.0

### Dépendances bloquées ou overrides
- `"overrides": { "vite": "^7" }` — force Vite 7

---

## Fin de l'audit

Aucune proposition formulée. Les implications (quelle lib de drag & drop ajouter, comment factoriser les primitives Card/Badge, quelle table créer pour les prospects, etc.) sont à arbitrer dans le PRD de l'Étape 2.
