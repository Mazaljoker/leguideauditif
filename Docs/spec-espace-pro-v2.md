# LGA — Spec Espace Pro v2 (3 dashboards)
## Pour Claude Code en mode plan

**Repository**: `Mazaljoker/leguideauditif`
**Branche cible**: `feat/espace-pro-v2`
**Date**: 23 avril 2026
**Auteur**: Franck-Olivier Chabbat
**Mockups de référence** (source de vérité design):
- `lga-espace-pro-revendicateur.html`
- `lga-espace-pro-v2-mockup.html` (Premium solo)
- `lga-espace-pro-v3-multicentres.html` (Premium réseau)

---

## 0. Mode d'emploi pour Claude Code

**Mode attendu: PLAN puis CODE par phases.**

Avant toute écriture de code:
1. Lire ce fichier en entier
2. Lire `CLAUDE.md` à la racine du repo
3. Explorer la structure existante de `src/` (pages, layouts, components, content)
4. Vérifier la présence de `@supabase/supabase-js` et des clés env
5. Proposer un plan découpé en commits atomiques avec une estimation (durée, risques)
6. **STOP — attendre validation humaine avant d'écrire du code**

Principe: chaque commit doit être autonome, testable, déployable.

---

## 1. Contexte et objectif

### 1.1 Contexte

L'espace pro actuel de LGA affiche un tableau de bord passif (ex: "2 vues 30 jours") qui:
- Crée l'impression d'un produit vide pour un site à J+10
- N'incite à aucune action
- Ne monétise pas (aucun upsell visible)
- Ne gère pas le multi-centres
- Affiche les prix post-signature (faute stratégique)

### 1.2 Objectif

Refondre l'espace pro en **3 états distincts** pilotés par le contexte utilisateur:

| État | Condition | Rôle |
|---|---|---|
| **Revendicateur** | Compte gratuit, 1+ fiche revendiquée, pas d'abonnement | Convertir vers Fondateur ou Premium |
| **Premium solo** | Abonnement Premium ou Fondateur, 1 à 3 fiches | Activer les leviers d'acquisition |
| **Premium réseau** | Abonnement Premium, 4+ fiches ou statut "réseau" | Piloter un parc multi-centres |

**KPI produit**: passer de 0 à 20 fiches Fondateur (Partenaires Fondateurs) en 60 jours via ce dashboard.

### 1.3 Non-goals (explicitement hors scope)

- Pas de responsive mobile en Phase 1 (desktop-first, mobile en Phase 4 séparée)
- Pas de gestion CRM patients (c'est le terrain de Cosium / AudioWizard)
- Pas d'app mobile native
- Pas d'intégration Google Ads API en Phase 1 (statut en base, API en Phase 3)
- Pas de back-office admin LGA (séparé, futur)

---

## 2. Stack et contraintes

### 2.1 Stack (fixé par `CLAUDE.md`)

- **Astro 6.x** (SSG par défaut, `output: 'static'` avec `prerender = false` sur routes espace pro)
- **React 19.x** pour les composants interactifs (switcher multi-centres, tableau centres)
- **Tailwind CSS v4** pour les styles
- **Supabase SDK v2** pour auth + data
- **Vercel** hébergement
- **Node >= 22.12.0**
- **TypeScript strict, ESM uniquement**

### 2.2 Design system (rappel, non-négociable)

```
Palette:
  --marine: #1B2E4A      (texte, titres, header)
  --creme:  #F8F5F0      (fond principal)
  --orange: #D97B3D      (accents, CTA, focus)

Typographie:
  Inter (sans) + Merriweather (serif)
  Base: 18px, line-height 1.75

Accessibilité (seniors 65+):
  Touch targets min 44×44px
  Focus visible: outline 3px orange
  Contraste WCAG AA minimum
  Labels explicites (pas de placeholder-only)

Icônes:
  astro-icon + Iconify set Lucide UNIQUEMENT
  JAMAIS d'emoji Unicode
```

### 2.3 Règles de code (non-négociable)

- TypeScript strict, pas de `any`
- ESM (`import/export`), jamais CommonJS
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Branches `feat/`, `fix/`, `content/`
- Français par défaut dans le contenu et commentaires utilisateur
- Pas de modification de `CLAUDE.md` sans validation

---

## 3. Architecture

### 3.1 Routes Astro à créer

```
src/pages/espace-pro/
├── index.astro          # Point d'entrée unique, route toward bon dashboard
├── dashboard.astro      # Dashboard selon état user (revendicateur | premium | reseau)
├── fiche/
│   ├── index.astro      # Liste des fiches revendiquées
│   └── [slug].astro     # Édition d'une fiche
├── demandes.astro       # Demandes patients reçues
├── abonnement.astro     # Gestion abonnement
└── compte.astro         # Paramètres compte
```

**Note**: toutes les pages `espace-pro/*` requièrent `prerender = false` (SSR authentifié).

### 3.2 Layout

```
src/layouts/EspaceProLayout.astro
```

Responsabilités:
- Vérification session Supabase (redirect `/connexion` sinon)
- Header spécifique espace pro (logo + user chip)
- Injection du store user dans `Astro.locals`
- Container principal + footer léger

### 3.3 Logique d'aiguillage

Le composant `<DashboardRouter />` dans `dashboard.astro` lit le contexte user et rend le bon dashboard:

```ts
function resolveDashboardState(user: User, fiches: FicheRevendiquee[]): DashboardState {
  const activeSubscription = user.subscriptions.find(s => s.status === 'active');

  // Pas de fiche revendiquée → redirect vers onboarding (hors scope)
  if (fiches.length === 0) return 'onboarding';

  // Pas d'abonnement actif → revendicateur
  if (!activeSubscription) return 'revendicateur';

  // Abonnement + multi-centres (4+) ou flag reseau → reseau
  if (fiches.length >= 4 || user.plan_type === 'reseau') return 'reseau';

  // Sinon Premium solo
  return 'premium_solo';
}
```

**Règle**: le "4+ fiches = réseau" est un seuil initial, à paramétrer (config `RESEAU_MIN_FICHES = 4`).

---

## 4. Modèle de données (Supabase)

### 4.1 Tables existantes (à vérifier, ne pas recréer)

- `rpps_audioprothesistes` (7 146 lignes, source RPPS)
- `centres_auditifs` (9 360 lignes, données fusionnées RPPS + codes APE)

### 4.2 Tables à créer

```sql
-- Table des users (si pas déjà gérée par Supabase Auth)
-- auth.users contient id, email, created_at — OK
-- On crée une table profiles étendue

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rpps_number TEXT,            -- N° RPPS de l'audio (vérifié)
  phone TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_type IN ('free', 'premium', 'fondateur', 'reseau')),
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,  -- NULL pour lifetime Fondateur
  fondateur_slot_number INTEGER,  -- 1 à 20, NULL si non-Fondateur
  stripe_customer_id TEXT,
  lemonsqueezy_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.fiches_revendiquees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES public.centres_auditifs(id),
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'manager', 'employee')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,   -- Date de vérification (RPPS match + tel/email)
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  completion_percent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, centre_id)
);

CREATE TABLE public.campagnes_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES public.centres_auditifs(id),
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'setup_pending', 'active', 'paused')),
  landing_url TEXT,
  mcc_manager_id TEXT,          -- Google Ads Manager ID
  client_account_id TEXT,        -- Google Ads Client ID
  monthly_budget_eur DECIMAL(10,2),
  setup_fee_eur DECIMAL(10,2),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.fiche_vues_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres_auditifs(id),
  date DATE NOT NULL,
  vues INTEGER NOT NULL DEFAULT 0,
  demandes INTEGER NOT NULL DEFAULT 0,
  UNIQUE(centre_id, date)
);

CREATE TABLE public.fondateur_slots (
  slot_number INTEGER PRIMARY KEY CHECK (slot_number BETWEEN 1 AND 20),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  testimonial_url TEXT,
  case_study_authorized BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed des 20 slots
INSERT INTO public.fondateur_slots (slot_number)
SELECT generate_series(1, 20);
```

### 4.3 Policies RLS

**Principe**: un user ne voit que ses propres données. Admin LGA a accès total.

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_revendiquees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campagnes_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users read own fiches"
  ON public.fiches_revendiquees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own campagnes"
  ON public.campagnes_ads FOR SELECT
  USING (auth.uid() = user_id);
```

### 4.4 Migrations

Chaque changement de schéma doit passer par une migration Supabase nommée:
```
supabase/migrations/20260423_espace_pro_v2_init.sql
```

**Ne jamais modifier directement la base en prod.**

---

## 5. Composants à créer

### 5.1 Layout et structure

```
src/layouts/EspaceProLayout.astro
src/components/espace-pro/
├── Header.astro                    # Header spécifique (logo + user chip + plan pill)
├── UserChip.tsx                    # Avatar + nom + plan badge
├── Footer.astro                    # Footer minimal espace pro
├── QuickAccess.astro               # Liens rapides en bas
└── DashboardRouter.tsx             # Aiguillage selon user state
```

### 5.2 Dashboard Revendicateur

```
src/components/espace-pro/revendicateur/
├── DashboardRevendicateur.tsx      # Orchestrateur
├── WelcomeBanner.tsx               # "Bienvenue, votre fiche est revendiquée"
├── CompletudeTodo.tsx              # Progress + liste de tâches
├── KPIsGratuit.tsx                 # 2 KPIs + 1 locked
├── UpsellFondateur.tsx             # Card upsell Fondateur avec scarcity
├── UpsellPremium.tsx               # Card upsell Premium standard
└── LeviersTeaser.tsx               # 3 leviers grisés avec cadenas
```

### 5.3 Dashboard Premium solo

```
src/components/espace-pro/premium/
├── DashboardPremium.tsx            # Orchestrateur
├── ActionPrioritaire.tsx           # Alerte contextuelle orange
├── KPIsZone.tsx                    # 3 KPIs (potentiel, ranking, activité)
├── LeviersActifs.tsx               # 3 cartes leviers avec statut + CTA
└── GestionFiche.tsx                # Complétude + avis Google
```

### 5.4 Dashboard Réseau

```
src/components/espace-pro/reseau/
├── DashboardReseau.tsx             # Orchestrateur
├── CentreSwitcher.tsx              # Switcher vue réseau / par centre
├── KPIsReseau.tsx                  # KPIs agrégés 3 zones
├── CentresTable.tsx                # Tableau des N centres
└── LeviersReseau.tsx               # Leviers avec compteur "X/N centres actifs"
```

### 5.5 Composants partagés

```
src/components/espace-pro/shared/
├── KPICard.tsx                     # Card KPI générique (label, value, desc, footer)
├── KPICardLocked.tsx               # Variante locked avec cadenas Premium
├── LeverCard.tsx                   # Card levier (barre couleur, num, title, body, CTA)
├── UpsellCard.tsx                  # Card upsell (badge, title, price, features, CTA)
├── ScarcityBar.tsx                 # Barre scarcity Fondateur (14/20 slots)
├── StatusPill.tsx                  # Pill de statut (active, pending, inactive)
├── CompletudeBar.tsx               # Progress bar + pourcentage
└── SectionHeader.tsx               # Header de section (title + sub + action optionnelle)
```

**Règle**: tous les composants shared sont typés strict, props documentées avec JSDoc, storybook-compatible (même si pas de Storybook, structure prête).

---

## 6. Types TypeScript (référence)

```ts
// src/types/espace-pro.ts

export type PlanType = 'free' | 'premium' | 'fondateur' | 'reseau';

export type DashboardState =
  | 'onboarding'
  | 'revendicateur'
  | 'premium_solo'
  | 'reseau';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  rpps_number: string | null;
  phone: string | null;
  plan_type: PlanType;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  fondateur_slot_number: number | null;
}

export interface FicheRevendiquee {
  id: string;
  user_id: string;
  centre_id: string;
  role: 'owner' | 'manager' | 'employee';
  verification_status: 'pending' | 'verified' | 'rejected';
  completion_percent: number;
  centre?: CentreAuditif;
}

export interface CentreAuditif {
  id: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string | null;
  site_web: string | null;
}

export interface CampagneAds {
  id: string;
  centre_id: string;
  status: 'inactive' | 'setup_pending' | 'active' | 'paused';
  landing_url: string | null;
  monthly_budget_eur: number | null;
  activated_at: string | null;
}

export interface KPIValue {
  label: string;
  value: string | number;
  unit?: string;
  desc: string;
  footer?: string;
  footerType?: 'positive' | 'action' | 'muted';
  locked?: boolean;
}
```

---

## 7. Règles métier critiques

### 7.1 Aucun prix dans l'espace pro post-signature

**Règle absolue**: dès que `plan_type !== 'free'`, AUCUN prix n'est affiché dans le dashboard.
- Les leviers non activés affichent "Statut: Non activé" + CTA "En discuter avec mon conseiller"
- Les prix sont visibles uniquement pour l'état `revendicateur` (upsell) et sur les pages publiques de vente.

### 7.2 Fondateur: scarcity réelle

- Compteur `fondateur_slots` en base: 20 slots fixes
- Affichage "X / 20 slots restants" basé sur `COUNT(*) WHERE confirmed_at IS NOT NULL`
- Si 20 slots confirmés: masquer la card Fondateur, ne laisser que Premium
- Ne JAMAIS mentir sur les slots. Pas de countdown fake.

### 7.3 Données lockées pour le gratuit

Revendicateur ne peut PAS voir:
- Position ranking zone
- Patients potentiels dans la zone
- Accès aux leviers Ads / Leads / nPosts

Revendicateur PEUT voir:
- Vues 30j de sa fiche
- Demandes patients reçues (si >0)
- Avis Google de son centre
- Complétude de sa fiche

### 7.4 Multi-centres

- `fiches_revendiquees.length >= 4` → état `reseau`
- Sinon Premium solo
- Le user peut forcer le passage à `reseau` via `plan_type = 'reseau'` (admin)

### 7.5 Action prioritaire dynamique

L'alerte orange en haut doit être contextuelle. Priorités (top-down):
1. Setup Ads incomplet (Premium) → "X de vos Y centres n'ont pas leurs landing pages livrées"
2. Complétude fiche < 80% (Revendicateur) → "Complétez votre fiche pour apparaître plus haut"
3. Ads activée mais budget mensuel non reçu → "Votre campagne Google Ads n'a pas de budget ce mois"
4. 0 demande reçue depuis 30j (Premium avec Ads actives) → "Votre campagne ne génère pas de demandes, discutons-en"
5. Si aucune des précédentes: pas d'alerte (masquer le composant, pas de fausse alerte)

---

## 8. Phases d'implémentation

### Phase 1 — Structure + dummy data (3-5 jours)

**Livrable**: les 3 dashboards navigables avec données mock, identiques aux mockups HTML.

Tasks:
1. Migration Supabase (schémas seulement, pas de données)
2. `EspaceProLayout.astro` + header
3. Route `/espace-pro/dashboard` + `DashboardRouter`
4. Composants shared (`KPICard`, `LeverCard`, etc.)
5. Dashboard Revendicateur complet avec data mock
6. Dashboard Premium solo complet avec data mock
7. Dashboard Réseau complet avec data mock
8. Toggle de preview pour basculer entre les 3 états (dev mode only)

**Validation**: comparaison visuelle pixel-proche avec les 3 HTML mockups.

### Phase 2 — Auth + data (5-7 jours)

**Livrable**: dashboards branchés sur Supabase avec le vrai user connecté.

Tasks:
1. Intégration Supabase Auth (magic link ou email/password)
2. Page `/connexion` + `/inscription`
3. Middleware auth sur `/espace-pro/*`
4. Seed des slots Fondateur
5. Logique d'aiguillage `resolveDashboardState`
6. Fetch des données réelles (profiles, fiches, campagnes)
7. Page `/espace-pro/fiche/[id]` pour éditer une fiche
8. Calcul de complétude automatique (trigger DB ou côté app)

**Validation**: parcours complet d'un audio qui s'inscrit, revendique sa fiche, voit son dashboard gratuit.

### Phase 3 — Leviers et paiement (5-10 jours, hors scope de cette spec)

Tasks à cadrer séparément:
- Intégration LemonSqueezy pour abonnements
- Workflow de setup Ads (questionnaire + demande humaine + mise en place)
- Branchement Google Ads API pour lecture stats campagnes
- Workflow leads (form → email → tracking)
- nPosts link/intégration

### Phase 4 — Mobile responsive

Séparée, traitée plus tard. Priorité: audios en RDV consultent leur dashboard sur téléphone.

---

## 9. Seed / données de démo (Phase 1)

Créer un fichier de seed qui permet de basculer rapidement entre les 3 états:

```sql
-- supabase/seed/demo-revendicateur.sql
-- User gratuit avec 1 fiche revendiquée à 50% de complétude

-- supabase/seed/demo-premium-solo.sql
-- User Premium avec 1 fiche complète à 89%, 1 campagne active

-- supabase/seed/demo-reseau.sql
-- User Premium réseau (Anthony) avec 3 fiches, 1 campagne active, 2 en setup
```

Chaque seed inclut:
- 1 profile
- N fiches_revendiquees liées à des centres_auditifs existants
- Données mock fiches_vues_daily sur 30 jours
- Campagnes dans les statuts décrits

---

## 10. Accessibilité (non-négociable)

Rappel des règles du CLAUDE.md appliquées à l'espace pro:

- Base font-size 18px (112.5% en global.css)
- Line-height minimum 1.75
- Touch targets 44×44px minimum sur tous les CTAs
- Focus visible: outline 3px orange (déjà défini)
- Skip-to-content en début de page
- Alt text obligatoire sur toutes les images
- aria-label sur sections `nav`, `aside`, `main`
- Labels explicites sur tous les champs (pas de placeholder-only)
- `prefers-reduced-motion` respecté sur les transitions
- Contraste WCAG AA minimum (marine sur crème OK, orange sur blanc à vérifier pour les petits textes)

---

## 11. Tests et critères de validation

### 11.1 Tests à prévoir (Phase 2+)

- Test d'aiguillage `resolveDashboardState` pour chaque combinaison de plan / nb fiches
- Test RLS Supabase: user A ne voit pas les données de user B
- Test RLS: admin voit tout
- Test migration rollback (chaque migration up a son down)

### 11.2 Critères de PR mergeable

Chaque PR doit:
- [ ] Passer `npm run build` sans erreur
- [ ] Passer les tests (quand Phase 2+)
- [ ] Contenir un changelog clair (conventional commits)
- [ ] Inclure screenshots desktop des changements visuels
- [ ] Respecter le design system (marine/crème/orange, Inter, 18px base)
- [ ] Pas d'emoji Unicode, uniquement astro-icon/Lucide
- [ ] Pas de `any` en TypeScript
- [ ] Pas de secret en dur (tout via env)

---

## 12. Risques identifiés

| Risque | Mitigation |
|---|---|
| SSR sur Vercel coûteux si trop de pages authentifiées | Limiter SSR aux routes `/espace-pro/*`, rest en SSG |
| Cache des KPIs agrégés sur gros réseau (100+ centres) | Phase 3: ajouter table `metrics_cache` rafraîchie quotidiennement |
| Slots Fondateur: risque de race condition à la réservation | Transaction SQL + UNIQUE constraint + lock row |
| Confusion entre "plan_type=reseau" et "fiches >=4" | Convention: `plan_type` gagne toujours si explicitement set |
| Mockups HTML pas tout à fait alignés avec Tailwind v4 | Audit des classes dans les mockups avant Phase 1 |

---

## 13. Questions ouvertes pour validation Franck-Olivier

Avant Phase 1, trancher:
1. **Magic link ou email/password** pour l'auth ? (reco: magic link, moins de friction audios seniors)
2. **Seuil multi-centres**: 4 fiches OK ou 3 ? (Anthony = 3 centres, bascule nécessaire)
3. **Nommage de route**: `/espace-pro` ou `/pro` ou `/audios` ? (reco: `/espace-pro`)
4. **Plan "Fondateur" en base**: distinct de "premium" ou flag sur "premium" ? (reco: distinct pour analytics)
5. **Gestion des fiches avec rôles différents** (owner vs employee d'un enseigne) prévue Phase 1 ou 2 ?

---

## 14. Fichiers annexes à charger

Claude Code doit avoir accès à:
- `lga-espace-pro-revendicateur.html` (mockup)
- `lga-espace-pro-v2-mockup.html` (mockup Premium solo)
- `lga-espace-pro-v3-multicentres.html` (mockup réseau)
- `CLAUDE.md` du repo (règles projet)
- `leguideauditif-projet-claude-desktop.md` (contexte étendu)

---

## 15. Convention de commit pour cette feature

```
feat(espace-pro): setup base layout and routing
feat(espace-pro/revendicateur): add welcome banner component
feat(espace-pro/premium): add KPIs zone component
feat(espace-pro/reseau): add centres table with drill-down
chore(supabase): migration v2 espace pro schemas
fix(espace-pro): accessibility contrast on orange CTAs
```

Branche racine: `feat/espace-pro-v2`
Sous-branches par phase: `feat/espace-pro-v2-phase1`, etc.

---

**FIN DE SPEC — Claude Code: démarrer par le plan, attendre validation avant tout code.**
