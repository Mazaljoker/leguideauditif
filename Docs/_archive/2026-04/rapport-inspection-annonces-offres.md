# Rapport d'inspection — Systeme Annonces & Offres LeGuideAuditif

**Date** : 2026-04-13
**Auteur** : Inspection automatique (Claude Code)
**Perimetre** : Code source + Supabase prod (`ftinchxyuqpnxilypmyk`)

---

## 1. ANNONCES — Architecture complete

### 1.1 Categories d'annonces

**Ou sont-elles definies ?**
Fichier TypeScript uniquement : `src/types/annonce.ts`
Pas d'enum Supabase (colonne `categorie` est `TEXT` sans contrainte CHECK).
Pas de fichier de config separe.

**4 categories :**

| Valeur | Label | Icone |
|--------|-------|-------|
| `cession` | Cession & Installation | `lucide:building-2` |
| `emploi` | Emploi & Recrutement | `lucide:briefcase` |
| `remplacement` | Remplacement | `lucide:calendar-clock` |
| `materiel` | Materiel professionnel | `lucide:wrench` |

**Sous-categories par categorie :**

- **cession** : `fonds_commerce`, `bail_ceder`, `patientele`, `murs`
- **emploi** : `audioprothesiste_cdi`, `audioprothesiste_cdd`, `assistant_audio`, `technicien`, `secretaire_medical`, `stage`
- **remplacement** : `vacances`, `conge_maternite`, `maladie`, `ponctuel`, `longue_duree`
- **materiel** : `cabine_audiometrique`, `audiometre`, `chaine_mesure`, `bac_ultrasons`, `otoscope`, `mobilier`, `informatique`, `autre`

### 1.2 Flux de creation d'une annonce

```
/annonces/deposer/ (deposer.astro)
  → AuthGuard (verifie connexion)
  → AnnonceForm.tsx (React island, client:load)
    → getUser() via supabase.auth.getUser() (client-side, anon key)
    → getProfile() pour pre-remplir nom/email/tel
    → Upload photo → Supabase Storage bucket "annonces-photos" (public)
      → Resize 1200px + conversion WebP client-side
    → INSERT dans table `annonces` via supabase client (anon key + RLS)
    → Redirect vers /annonces/{slug}/?published=1
```

**Point important** : L'insertion se fait cote client avec la clef `anon` — le RLS autorise l'INSERT si `auth.uid() = user_id`. Pas d'API route intermediaire pour la creation.

### 1.3 Schema de la table `annonces` (Supabase prod)

| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |
| `expires_at` | timestamptz | NO | — |
| `user_id` | uuid | NO | — |
| `contact_email` | text | NO | — |
| `contact_tel` | text | YES | — |
| `contact_nom` | text | NO | — |
| `titre` | text | NO | — |
| `description` | text | NO | — |
| `slug` | text | NO | — |
| `categorie` | text | NO | — |
| `sous_categorie` | text | YES | — |
| `departement` | text | YES | — |
| `ville` | text | YES | — |
| `code_postal` | text | YES | — |
| `region` | text | YES | — |
| `prix_min` | integer | YES | — |
| `prix_max` | integer | YES | — |
| `prix_type` | text | YES | — |
| `photos` | text[] | YES | `'{}'::text[]` |
| `photo_count` | integer | YES | — |
| `statut` | text | YES | `'active'` |
| `is_premium` | boolean | YES | `false` |
| `is_verified` | boolean | YES | `false` |
| `boost_until` | timestamptz | YES | — |
| `contacts_unlocked` | boolean | YES | `false` |
| `views_count` | integer | YES | `0` |
| `contacts_count` | integer | YES | `0` |
| `meta_title` | text | YES | — |
| `meta_description` | text | YES | — |

**Remarque** : Pas de contrainte CHECK sur `categorie`, `statut`, `prix_type`. Les valeurs sont validees uniquement cote TypeScript.

**Politiques RLS :**
- SELECT : public si `statut = 'active'` OU `statut = 'expiree'` ; ou si `auth.uid() = user_id`
- INSERT : `auth.uid() = user_id`
- UPDATE : `auth.uid() = user_id`
- DELETE : `auth.uid() = user_id`

**Fonctions RPC :**
- `increment_annonce_views(annonce_slug)` — existe en prod
- `increment_annonce_contacts(...)` — existe en prod

### 1.4 Tables annexes

#### `annonces_contacts`
| Colonne | Type | Nullable |
|---------|------|----------|
| `id` | uuid | NO |
| `created_at` | timestamptz | NO |
| `annonce_id` | uuid | NO |
| `user_id` | uuid | YES |
| `nom` | text | NO |
| `email` | text | NO |
| `telephone` | text | YES |
| `message` | text | YES |
| `profil` | text | YES |
| `lu` | boolean | YES |

RLS : INSERT = tout le monde ; SELECT = proprietaire de l'annonce via JOIN.

#### `annonces_alertes`
| Colonne | Type | Nullable |
|---------|------|----------|
| `id` | uuid | NO |
| `created_at` | timestamptz | NO |
| `user_id` | uuid | NO |
| `categorie` | text | NO |
| `sous_categorie` | text | YES |
| `departements` | text[] | YES |
| `prix_max` | integer | YES |
| `frequence` | text | YES |
| `active` | boolean | YES |
| `last_sent_at` | timestamptz | YES |

RLS : CRUD restreint a `auth.uid() = user_id`.

#### `annonces_paiements`
| Colonne | Type | Nullable |
|---------|------|----------|
| `id` | uuid | NO |
| `created_at` | timestamptz | NO |
| `user_id` | uuid | NO |
| `annonce_id` | uuid | NO |
| `stripe_session_id` | text | NO |
| `stripe_payment_intent` | text | YES |
| `produit` | text | NO |
| `montant` | integer | NO |
| `statut` | text | YES |

RLS : INSERT = tout le monde (pour webhook service_role) ; SELECT = `auth.uid() = user_id`.

#### `annonces_signalements`
| Colonne | Type | Nullable |
|---------|------|----------|
| `id` | uuid | NO |
| `created_at` | timestamptz | NO |
| `annonce_id` | uuid | NO |
| `user_id` | uuid | YES |
| `raison` | text | NO |
| `details` | text | YES |

RLS : INSERT = tout le monde ; SELECT = `auth.uid() = user_id`.

#### `profiles`
| Colonne | Type | Nullable |
|---------|------|----------|
| `id` | uuid | NO |
| `created_at` | timestamptz | YES |
| `nom` | text | NO |
| `prenom` | text | YES |
| `email` | text | NO |
| `telephone` | text | YES |
| `profil_type` | text | YES |
| `numero_rpps` | text | YES |
| `centre_nom` | text | YES |
| `centre_ville` | text | YES |
| `centre_departement` | text | YES |

RLS : INSERT/SELECT/UPDATE = `auth.uid() = id`.

### 1.5 Annonces existantes en base

**0 annonces en base.** La table est vide.

### 1.6 Authentification — Liaison user/annonces

- Auth geree par Supabase Auth (email + password, magic link OTP).
- `user_id` dans la table `annonces` = `auth.users.id`.
- Le RLS force `auth.uid() = user_id` pour INSERT/UPDATE/DELETE.
- Client auth : `supabase.auth.getUser()` cote client (anon key).
- Server auth : `Astro.locals.user` pour le SSR (page [slug].astro).

### 1.7 User chabbat.fr@gmail.com

- **Existe dans auth.users** : OUI
- **ID** : `b9e7fc86-7b5c-4acf-b579-0d2101898d6b`
- **Cree le** : 2026-04-12
- **Profil dans `profiles`** : NON (pas de ligne correspondante)

### 1.8 Storage

- Bucket `annonces-photos` : existe, **public** = true.

---

## 2. ANNONCES PREMIUM — Systeme de paiement

### 2.1 Page /annonces/premium/

**Etat : PAGE STATIQUE (vitrine)**

Fichier : `src/pages/annonces/premium.astro`

La page affiche les options et packs avec leurs prix, mais **aucun bouton n'est connecte a Stripe**. Les cartes d'options ne contiennent pas de bouton d'achat — uniquement des descriptions. Les CTA en bas renvoient vers `/annonces/deposer/` et `/annonces/mes-annonces/`.

Le paiement premium se fait **depuis la page detail d'une annonce** (`AnnonceDetail.tsx`), pas depuis la page /premium/.

### 2.2 Stripe — Configuration et etat

**Stripe est configure et fonctionnel pour les annonces.**

Clefs dans `.env` (prod, `sk_live_`) :

| Variable | Valeur | Usage |
|----------|--------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_51MDk...` | Clef API live |
| `STRIPE_WEBHOOK_SECRET` | `whsec_MdIv...` | Webhook signature |
| `STRIPE_PRICE_UNLOCK_CONTACTS` | `price_1TKaiN...` | Debloquer contacts — 9 EUR |
| `STRIPE_PRICE_PREMIUM_ANNONCE` | `price_1TKaiO...` | Annonce Premium — 29 EUR |
| `STRIPE_PRICE_BOOST_SEMAINE` | `price_1TKaiP...` | Boost 1 semaine — 9 EUR |
| `STRIPE_PRICE_ALERTE_CIBLEE` | `price_1TKaiP...` | Alerte ciblee — 19 EUR |
| `STRIPE_PRICE_PACK_CESSION` | `price_1TKaiQ...` | Pack Cession Standard — 99 EUR |
| `STRIPE_PRICE_PACK_CESSION_ACCOMP` | `price_1TKaiR...` | Pack Cession Accompagne — 349 EUR |

**Les 6 produits ont ete crees sur Stripe** via le script `scripts/create-stripe-annonces-products.mjs`.

### 2.3 Flux de paiement annonces

```
AnnonceDetail.tsx (bouton "Passer Premium", "Booster", etc.)
  → POST /api/annonces-checkout
    → Verifie user_id = proprietaire de l'annonce
    → Cree une Stripe Checkout Session (mode: 'payment')
    → Metadata: { type: 'annonce', annonce_id, user_id, produit }
    → Redirect vers Stripe Checkout
  → Stripe webhook → POST /api/webhook
    → Si metadata.type === 'annonce' :
      → INSERT dans annonces_paiements
      → UPDATE annonce selon produit (is_premium, boost_until, contacts_unlocked, etc.)
```

### 2.4 Implementation back des features premium

| Feature | Etat | Detail |
|---------|------|--------|
| Debloquer contacts (`unlock_contacts`) | **IMPLEMENTE** | Webhook met `contacts_unlocked = true` |
| Annonce Premium (`premium`) | **IMPLEMENTE** | Webhook met `is_premium = true` |
| Boost semaine (`boost_semaine`) | **IMPLEMENTE** | Webhook met `boost_until = now + 7 jours` |
| Alerte ciblee (`alerte_ciblee`) | **NON IMPLEMENTE** | Webhook fait un `console.log` + commentaire "sera envoyee quand Resend sera installe" |
| Pack Cession Standard | **IMPLEMENTE** | Combine premium + contacts + boost 28j |
| Pack Cession Accompagne | **PARTIELLEMENT** | Combine tout + `is_verified = true` + `console.log` pour action manuelle Franck-Olivier |

### 2.5 Ce qui manque cote premium annonces

- **Alerte ciblee** : Resend n'est pas installe. L'achat est accepte (paiement enregistre) mais l'email n'est jamais envoye.
- **Envoi d'alertes periodiques** (`annonces_alertes`) : La table existe, le formulaire de creation d'alertes existe (`AlerteForm.tsx`), mais **aucun cron/worker n'envoie les emails**. `last_sent_at` n'est jamais mis a jour.
- **Affichage differencie Premium** : Le code du listing (`AnnonceListing.tsx`) ne trie PAS par `is_premium` ou `boost_until`. Les annonces boostees ne remontent pas en premier.
- **Page /annonces/premium/** : Les boutons d'achat sont absents — la page est purement informative.
- **0 paiements en base** : La table `annonces_paiements` est vide (coherent avec 0 annonces).

---

## 3. OFFRES — Fiches audioprothesistes

### 3.1 Page /offres/

**Etat : PAGE STATIQUE (vitrine)**

Fichier : `src/pages/offres/index.astro`

C'est une page de presentation avec 3 offres :
- **Fiche gratuite** (0 EUR/mois) — CTA : `/trouver-audioprothesiste/`
- **Premium** (29 EUR/mois ou 290 EUR/an) — CTA : `/trouver-audioprothesiste/`
- **Serenite** (sur devis) — CTA : `/contact/`

### 3.2 Bouton "Passer en Premium"

Le bouton "Passer en Premium" pointe vers `/trouver-audioprothesiste/` — c'est la carte/annuaire des centres. Il ne declenche **aucun flux de paiement**. Le user doit d'abord trouver son centre sur la carte, puis le revendiquer via le systeme de claim existant (qui lui passe par Stripe via `/api/checkout`).

**Le flux reel est :**
```
/offres/ → CTA "Passer en Premium" → /trouver-audioprothesiste/
→ Trouver son centre → Page fiche centre → Bouton "Revendiquer"
→ /revendiquer/?centre={slug} → Formulaire claim
→ POST /api/checkout → Stripe Checkout (mode: subscription)
→ Webhook → UPDATE centres_auditifs SET plan = 'premium'
```

### 3.3 Stripe pour l'abonnement fiche Premium 29 EUR/mois

**IMPLEMENTE** via un systeme distinct des annonces :

| Variable | Valeur | Usage |
|----------|--------|-------|
| `STRIPE_PRICE_ID` | `price_1TJw7S...` | Abonnement mensuel 29 EUR |
| `STRIPE_PRICE_ID_ANNUAL` | `price_1TJw9E...` | Abonnement annuel 290 EUR |

API route : `src/pages/api/checkout.ts` (mode: `subscription`).
Webhook : `src/pages/api/webhook.ts` — gere `checkout.session.completed` (passage en premium) et `customer.subscription.deleted` (retour a `claimed`).

### 3.4 Table Supabase pour les abonnements fiches

**Pas de table dediee `subscriptions`**. Les donnees d'abonnement sont stockees directement dans `centres_auditifs` :
- `stripe_customer_id` : ID client Stripe
- `stripe_subscription_id` : ID abonnement Stripe
- `plan` : `rpps` → `claimed` → `premium`
- `is_premium` : boolean
- `premium_since` / `premium_until` : timestamps
- `claimed_by_email` : email du professionnel

### 3.5 Systeme de "leads routes"

**NON IMPLEMENTE.** La page `/offres/` mentionne "Leads patients routes directement vers votre centre" comme feature Premium, mais :
- Aucun code de routage de leads n'existe
- Le formulaire de contact patient (sur la fiche centre) envoie a tous les centres de la meme maniere
- Pas de logique de priorite Premium dans le routage des demandes de devis

### 3.6 Badge "Centre verifie"

**PARTIELLEMENT IMPLEMENTE.**
- Le champ `is_premium` dans `centres_auditifs` est mis a `true` lors du paiement Stripe
- Le champ `plan` passe a `premium`
- Cote front, la fiche centre affiche probablement un badge si `is_premium = true` (via le composant de la page centre)
- Mais la page `/offres/` mentionne un badge "Centre verifie par un DE" qui implique une verification humaine — cette verification n'existe pas de maniere automatisee

---

## 4. FICHIERS CONCERNES

### Pages annonces
| Fichier | Role |
|---------|------|
| `src/pages/annonces/index.astro` | Listing principal + categories + 6 dernieres |
| `src/pages/annonces/deposer.astro` | Formulaire de depot (AuthGuard) |
| `src/pages/annonces/[slug].astro` | Detail annonce (SSR) + vues incrementees |
| `src/pages/annonces/premium.astro` | Page vitrine options premium |
| `src/pages/annonces/mes-annonces.astro` | Dashboard proprietaire (AuthGuard) |
| `src/pages/annonces/alertes.astro` | Gestion alertes (AuthGuard) |
| `src/pages/annonces/cession/index.astro` | Listing categorie cession |
| `src/pages/annonces/emploi/index.astro` | Listing categorie emploi |
| `src/pages/annonces/remplacement/index.astro` | Listing categorie remplacement |
| `src/pages/annonces/materiel/index.astro` | Listing categorie materiel |

### Page offres
| Fichier | Role |
|---------|------|
| `src/pages/offres/index.astro` | Page vitrine 3 formules (statique) |

### Composants annonces
| Fichier | Role |
|---------|------|
| `src/components/annonces/AnnonceForm.tsx` | Formulaire creation (React) |
| `src/components/annonces/AnnonceDetail.tsx` | Detail + boutons Stripe premium (React) |
| `src/components/annonces/AnnonceCard.tsx` | Carte annonce listing (React) |
| `src/components/annonces/AnnonceListing.tsx` | Liste filtrable + pagination (React) |
| `src/components/annonces/DashboardAnnonces.tsx` | Dashboard mes-annonces (React) |
| `src/components/annonces/AlerteForm.tsx` | CRUD alertes (React) |
| `src/components/annonces/ContactForm.tsx` | Formulaire contact visiteur (React) |
| `src/components/annonces/SignalementButton.tsx` | Signalement abusif (React) |
| `src/components/annonces/AnnoncesBanner.astro` | Banner CTA "Deposer une annonce" |

### API routes
| Fichier | Role |
|---------|------|
| `src/pages/api/annonces-checkout.ts` | Checkout Stripe annonces (6 produits) |
| `src/pages/api/checkout.ts` | Checkout Stripe centres (abonnement Premium) |
| `src/pages/api/webhook.ts` | Webhook Stripe unifie (annonces + centres) |

### Types et lib
| Fichier | Role |
|---------|------|
| `src/types/annonce.ts` | Types TS complets + constantes categories/departements |
| `src/lib/supabase.ts` | Client Supabase (anon + server) |
| `src/lib/auth.ts` | Helpers auth + profil + generateSlug |

### Scripts
| Fichier | Role |
|---------|------|
| `scripts/create-stripe-annonces-products.mjs` | Creation one-shot des 6 produits Stripe |

### Migrations Supabase
| Fichier | Contenu pertinent |
|---------|-------------------|
| `supabase/migrations/001_centres_auditifs.sql` | Table centres (Stripe fields, claim fields) |
| `supabase/migrations/003_ghost_fields.sql` | Ajout claimed, champs ghost pattern |
| `supabase/migrations/004_plan_enum.sql` | Champ `plan` (rpps/claimed/premium) |

**Note** : Aucune migration pour les tables `annonces`, `annonces_contacts`, `annonces_paiements`, `annonces_alertes`, `annonces_signalements`, `profiles`. Ces tables existent en prod mais ont ete creees manuellement ou via un outil non versionne. **Pas de fichier de migration dans le repo.**

### Docs
| Fichier | Role |
|---------|------|
| `Docs/specs-petites-annonces-lga.md` | Spec originale annonces |
| `Docs/spec-annonces-services-lga.md` | Spec annonces + services |

---

## 5. INCOHERENCES DETECTEES

### 5.1 Critiques

1. **Pas de migration SQL pour les tables annonces** — Les 5 tables (`annonces`, `annonces_contacts`, `annonces_paiements`, `annonces_alertes`, `annonces_signalements`) et `profiles` existent en prod mais aucun fichier de migration n'est dans le repo. Impossible de reconstruire la base depuis les migrations.

2. **Alerte ciblee facturee mais non delivree** — Le paiement de 19 EUR pour l'alerte ciblee est encaisse par Stripe, enregistre en base, mais l'email n'est jamais envoye. Le commentaire dans le webhook dit "sera envoyee quand Resend sera installe".

3. **Profil manquant pour chabbat.fr@gmail.com** — Le user existe dans `auth.users` mais n'a pas de ligne dans `profiles`. Le formulaire AnnonceForm va planter silencieusement au pre-remplissage (retourne null, pas d'erreur mais champs vides).

### 5.2 Importantes

4. **Pas de tri par boost/premium dans les listings** — Les annonces boostees (`boost_until > now()`) ou premium ne remontent pas en priorite dans `AnnonceListing.tsx`. Le tri est uniquement par `created_at DESC`.

5. **Page /annonces/premium/ deconnectee** — La page decrit les options et prix mais ne contient aucun bouton de paiement. Le paiement n'est possible que depuis la page detail d'une annonce (et seulement si le user est proprietaire). Un visiteur de /premium/ ne peut rien acheter.

6. **Page /offres/ CTA trompeur** — Le bouton "Passer en Premium" (29 EUR/mois pour fiches centres) redirige vers `/trouver-audioprothesiste/` au lieu de lancer un flux d'abonnement direct. Le parcours utilisateur est long : trouver son centre → cliquer → revendiquer.

7. **Pas de CHECK constraints en base** — `categorie`, `statut`, `prix_type` sont des `TEXT` sans contrainte. Un INSERT direct pourrait inserer des valeurs invalides.

8. **`import.meta.env` pour Stripe keys dans annonces-checkout.ts** — Les variables `STRIPE_PRICE_*` sont lues via `import.meta.env` qui est inline au build. Si les variables ne sont pas presentes au build Vercel, les price IDs seront `undefined`.

### 5.3 Mineures

9. **Schema.org dans [slug].astro** — Le schema `Offer` est utilise pour les annonces non-emploi, ce qui n'est pas semantiquement correct pour des annonces de type cession ou remplacement.

10. **Incertitude contacts_unlocked** — La logique d'affichage des contacts dans `AnnonceDetail.tsx` depend de `contacts_unlocked`, mais la condition d'affichage n'a pas ete entierement verifiee (le fichier est long).

11. **Photo unique** — Le formulaire ne supporte qu'une seule photo (`photo-1.webp`), alors que le type TS `photos: string[]` et la page premium promettent "Photos illimitees".

12. **`photo_count` jamais renseigne** — La colonne existe mais n'est jamais ecrite par AnnonceForm.tsx.

13. **Deux systemes de paiement separes** — Les annonces utilisent `mode: 'payment'` (one-shot) via `/api/annonces-checkout`, les centres utilisent `mode: 'subscription'` (recurrent) via `/api/checkout`. Le webhook unifie gere les deux mais avec une logique de routing fragile basee sur `metadata.type`.

---

## Resume synthetique

| Element | Etat |
|---------|------|
| Tables Supabase annonces (5) | **Creees en prod, pas de migration dans le repo** |
| Types TypeScript annonces | **Complet et coherent avec la base** |
| Formulaire de depot | **Implemente (client-side)** |
| Listing par categorie | **Implemente** |
| Page detail annonce | **Implemente + SSR** |
| Dashboard mes-annonces | **Implemente** |
| Systeme de contacts | **Implemente** |
| Systeme d'alertes | **Formulaire OK, envoi d'emails NON implemente** |
| Systeme de signalement | **Implemente** |
| Stripe 6 produits annonces | **Crees et configures (live)** |
| Checkout annonces | **Implemente** |
| Webhook annonces | **Implemente (sauf alerte ciblee)** |
| Page /annonces/premium/ | **Page vitrine, pas de bouton d'achat** |
| Page /offres/ | **Page vitrine statique** |
| Stripe abonnement centres | **Implemente (29 EUR/mois, 290 EUR/an)** |
| Leads routes | **Non implemente** |
| Badge centre verifie | **Champ en base, affichage basique** |
| Annonces en base | **0** |
| Paiements en base | **0** |
| User chabbat.fr@gmail.com | **Existe (ID: b9e7fc86...), pas de profil** |
