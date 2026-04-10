# LeGuideAuditif.fr — Specs Module Petites Annonces Pro

## Document de specs pour implémentation Claude Code
### Date : 10 avril 2026
### Statut : VALIDÉ — prêt pour développement

---

## 0. CONTEXTE

LeGuideAuditif.fr est un site Astro 6 (SSG) + React 19 + Supabase + Stripe + Vercel.
On ajoute une section "Petites Annonces" destinée aux professionnels de l'audioprothèse (B2B).
Le modèle est freemium : annonce gratuite limitée → options payantes pour plus de visibilité et d'accès aux contacts.

### Stack existante à respecter
- Astro 6.x (output : hybrid pour cette section — les annonces sont dynamiques)
- React 19.x pour les composants interactifs
- Tailwind CSS 4.x
- Supabase SDK v2 (auth + database + storage)
- Stripe 22.x (paiements)
- Vercel (hébergement)
- Node.js >= 22.12.0

### Design system à respecter
- Marine #1B2E4A | Crème #F8F5F0 | Orange #D97B3D
- Inter (sans) + Merriweather (serif)
- Base 18px, line-height 1.75
- Touch targets 44x44px minimum
- Focus visible : outline 3px orange
- JAMAIS d'emoji — Lucide icons uniquement
- Audience pro (audioprothésistes), tutoiement acceptable entre confrères mais vouvoiement par défaut

---

## 1. ARCHITECTURE DES PAGES

### Pages Astro (src/pages/annonces/)

```
annonces/index.astro                    # Hub — listing toutes catégories
annonces/cession/index.astro            # Listing cessions de centres
annonces/emploi/index.astro             # Listing offres emploi
annonces/remplacement/index.astro       # Listing remplacements
annonces/materiel/index.astro           # Listing matériel pro occasion
annonces/[slug].astro                   # Page annonce individuelle (dynamique)
annonces/deposer.astro                  # Formulaire dépôt annonce (auth requise)
annonces/mes-annonces.astro             # Dashboard vendeur (auth requise)
annonces/alertes.astro                  # Gestion alertes acheteur (auth requise)
annonces/premium.astro                  # Page pricing options payantes
```

### IMPORTANT : Output mode — NE PAS CHANGER astro.config.mjs

Le site est en `output: 'static'` avec l'adapter `@astrojs/vercel`.
Ce mode supporte DÉJÀ les pages dynamiques via `export const prerender = false;`.
C'est le pattern utilisé par les API routes existantes (`src/pages/api/checkout.ts`, `webhook.ts`).

Toutes les pages annonces dynamiques DOIVENT avoir `export const prerender = false;` en haut du fichier.
Les pages listing de catégories (index) peuvent aussi être SSR pour afficher le contenu frais.
NE PAS modifier `output` dans astro.config.mjs.

---

## 1.5 PATTERNS DU CODEBASE EXISTANT (RÉFÉRENCE)

Claude Code DOIT respecter ces patterns déjà en place :

### Supabase client
```typescript
// src/lib/supabase.ts — NE PAS MODIFIER
import { supabase } from '../../lib/supabase';          // côté client (anon key)
import { createServerClient } from '../../lib/supabase'; // côté serveur (service_role, bypass RLS)
```

### API Routes Astro
```typescript
// Pattern existant dans src/pages/api/checkout.ts
export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  // ...
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Stripe
```typescript
// Pattern existant
import Stripe from 'stripe';
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15' as Stripe.LatestApiVersion,
});
```

### Dépendances déjà installées (package.json)
- `@supabase/supabase-js` ^2.102.0 ✅
- `stripe` ^22.0.0 ✅
- `react` ^19.2.4 ✅
- `@astrojs/react` ^5.0.3 ✅
- `@astrojs/vercel` ^10.0.4 ✅
- Pas de `resend` (mission séparée)

### Aucune dépendance à ajouter au package.json pour le MVP annonces.

---

### Table : annonces

```sql
CREATE TABLE annonces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- created_at + 30 jours par défaut

  -- Auteur
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  contact_email TEXT NOT NULL,
  contact_tel TEXT, -- optionnel
  contact_nom TEXT NOT NULL,

  -- Contenu
  titre TEXT NOT NULL CHECK (char_length(titre) <= 120),
  description TEXT NOT NULL CHECK (char_length(description) <= 5000),
  -- Gratuit : 500 chars max côté application, pas en DB (premium peut écrire plus)
  slug TEXT UNIQUE NOT NULL,

  -- Catégorie
  categorie TEXT NOT NULL CHECK (categorie IN (
    'cession', 'emploi', 'remplacement', 'materiel'
  )),

  -- Sous-catégorie (dépend de la catégorie)
  sous_categorie TEXT, -- voir ENUM par catégorie ci-dessous

  -- Localisation
  departement TEXT, -- code département (01-976)
  ville TEXT,
  code_postal TEXT,
  region TEXT, -- calculé automatiquement depuis le département

  -- Prix / Rémunération
  prix_min INTEGER, -- en centimes d'euros
  prix_max INTEGER, -- en centimes d'euros
  prix_type TEXT CHECK (prix_type IN (
    'fixe', 'negociable', 'sur_demande', 'gratuit',
    'salaire_annuel', 'salaire_mensuel', 'tjm'
  )),

  -- Médias
  photos TEXT[] DEFAULT '{}', -- URLs Supabase Storage, max 1 gratuit, illimité premium
  photo_count INTEGER GENERATED ALWAYS AS (array_length(photos, 1)) STORED,

  -- Statut
  statut TEXT DEFAULT 'active' CHECK (statut IN (
    'brouillon', 'active', 'expiree', 'supprimee', 'moderee'
  )),

  -- Premium
  is_premium BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- badge "Vérifié par Franck-Olivier"
  boost_until TIMESTAMPTZ, -- si boosté, date de fin du boost
  contacts_unlocked BOOLEAN DEFAULT false, -- a payé pour voir les contacts

  -- Métriques
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0, -- nombre de demandes de contact reçues

  -- SEO
  meta_title TEXT,
  meta_description TEXT
);

-- Index
CREATE INDEX idx_annonces_categorie ON annonces(categorie);
CREATE INDEX idx_annonces_statut ON annonces(statut);
CREATE INDEX idx_annonces_departement ON annonces(departement);
CREATE INDEX idx_annonces_expires_at ON annonces(expires_at);
CREATE INDEX idx_annonces_boost ON annonces(boost_until) WHERE boost_until IS NOT NULL;
CREATE INDEX idx_annonces_user ON annonces(user_id);
CREATE INDEX idx_annonces_slug ON annonces(slug);
```

### Sous-catégories par catégorie

```sql
-- Cession
-- 'fonds_commerce', 'bail_ceder', 'patientele', 'murs'

-- Emploi
-- 'audioprothesiste_cdi', 'audioprothesiste_cdd', 'assistant_audio',
-- 'technicien', 'secretaire_medical', 'stage'

-- Remplacement
-- 'vacances', 'conge_maternite', 'maladie', 'ponctuel', 'longue_duree'

-- Matériel
-- 'cabine_audiometrique', 'audiometre', 'chaine_mesure',
-- 'bac_ultrasons', 'otoscope', 'mobilier', 'informatique', 'autre'
```

### Table : annonces_contacts (demandes de contact)

```sql
CREATE TABLE annonces_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  annonce_id UUID REFERENCES annonces(id) ON DELETE CASCADE NOT NULL,
  
  -- Personne intéressée
  user_id UUID REFERENCES auth.users(id), -- null si pas connecté
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  message TEXT CHECK (char_length(message) <= 1000),
  
  -- Profil
  profil TEXT CHECK (profil IN (
    'audioprothesiste_de', 'etudiant_audio', 'assistant',
    'investisseur', 'enseigne', 'autre'
  )),

  -- Statut (vu par le vendeur ou non)
  lu BOOLEAN DEFAULT false
);

CREATE INDEX idx_contacts_annonce ON annonces_contacts(annonce_id);
```

### Table : annonces_alertes (alertes acheteur)

```sql
CREATE TABLE annonces_alertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Critères
  categorie TEXT NOT NULL,
  sous_categorie TEXT,
  departements TEXT[], -- liste de départements surveillés
  prix_max INTEGER, -- en centimes
  
  -- Fréquence
  frequence TEXT DEFAULT 'hebdo' CHECK (frequence IN ('immediat', 'quotidien', 'hebdo')),
  
  -- Statut
  active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ
);
```

### Table : annonces_paiements (historique achats)

```sql
CREATE TABLE annonces_paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  annonce_id UUID REFERENCES annonces(id) NOT NULL,
  
  -- Stripe
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent TEXT,
  
  -- Produit acheté
  produit TEXT NOT NULL CHECK (produit IN (
    'unlock_contacts',    -- 9€
    'premium',            -- 29€
    'boost_semaine',      -- 9€/semaine
    'alerte_ciblee',      -- 19€
    'pack_cession',       -- 99€
    'pack_cession_accomp' -- 349€
  )),
  
  montant INTEGER NOT NULL, -- en centimes
  statut TEXT DEFAULT 'pending' CHECK (statut IN ('pending', 'paid', 'failed', 'refunded'))
);
```

### RLS (Row Level Security)

```sql
-- Annonces : lecture publique, écriture par le propriétaire
ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Annonces visibles publiquement"
  ON annonces FOR SELECT
  USING (statut = 'active' OR statut = 'expiree');

CREATE POLICY "Auteur voit toutes ses annonces"
  ON annonces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Auteur crée ses annonces"
  ON annonces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auteur modifie ses annonces"
  ON annonces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Auteur supprime ses annonces"
  ON annonces FOR DELETE
  USING (auth.uid() = user_id);

-- Contacts : lecture par le propriétaire de l'annonce
ALTER TABLE annonces_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut envoyer un contact"
  ON annonces_contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Propriétaire voit les contacts de ses annonces"
  ON annonces_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM annonces
      WHERE annonces.id = annonces_contacts.annonce_id
      AND annonces.user_id = auth.uid()
    )
  );
```

---

## 3. COMPOSANTS REACT (src/components/annonces/)

### AnnonceForm.tsx — Formulaire de dépôt

Props : `{ categorie?: string }`

Champs :
- `categorie` — select (cession | emploi | remplacement | materiel)
- `sous_categorie` — select dynamique selon catégorie
- `titre` — input text, max 120 chars, compteur visible
- `description` — textarea, max 500 chars gratuit (compteur + message "Passez en Premium pour 5000 caractères"), max 5000 premium
- `departement` — select avec autocomplete (liste des 101 départements)
- `ville` — input text
- `code_postal` — input text, 5 chiffres
- `prix_min` / `prix_max` — input number (optionnel selon catégorie)
- `prix_type` — select
- `photo` — upload 1 photo max (gratuit), drag & drop
- `contact_nom` — input text (pré-rempli depuis le profil)
- `contact_email` — input email (pré-rempli)
- `contact_tel` — input tel (optionnel)

Validation côté client :
- Titre obligatoire, min 10 chars
- Description obligatoire, min 50 chars
- Catégorie obligatoire
- Département obligatoire
- Email valide
- Photo : max 5MB, formats jpg/png/webp

Actions :
- "Publier gratuitement" → crée l'annonce statut 'active'
- "Enregistrer en brouillon" → crée l'annonce statut 'brouillon'

Post-publication : redirect vers `/annonces/[slug]` avec toast "Votre annonce est en ligne !"

### AnnonceCard.tsx — Carte annonce dans les listings

Props : `{ annonce: Annonce }`

Affiche :
- Badge catégorie (couleur par catégorie)
- Badge "Premium" si is_premium (orange)
- Badge "Vérifié" si is_verified (vert)
- Titre (lien vers page annonce)
- Ville + département
- Prix (formaté selon prix_type)
- Date de publication (relatif : "il y a 3 jours")
- Nombre de vues (icône eye + chiffre)
- Miniature photo si disponible
- Sous-catégorie en tag discret

Tri par défaut dans les listings :
1. Annonces boostées (boost_until > now()) en premier
2. Annonces premium ensuite
3. Annonces gratuites par date décroissante

### AnnonceListing.tsx — Listing avec filtres

Props : `{ categorie: string }`

Filtres sidebar :
- Sous-catégorie (checkboxes)
- Département (select multi avec autocomplete)
- Fourchette de prix (range slider)
- "Avec photo uniquement" (toggle)

Pagination : 20 annonces par page, infinite scroll ou pagination classique.

Compteur : "42 annonces dans Cession & Installation"

### AnnonceDetail.tsx — Page annonce complète

Props : `{ annonce: Annonce, contacts: AnnonceContact[], isOwner: boolean }`

**Vue publique (visiteur) :**
- Titre
- Badges (catégorie, premium, vérifié)
- Photos (carousel si premium, 1 photo sinon)
- Description complète
- Infos : ville, département, prix, sous-catégorie, date
- Compteur social : "X personnes ont consulté cette annonce"
- Encart contact :
  - Si premium ET contacts_unlocked : affiche les coordonnées des intéressés
  - Si pas premium : "X personnes intéressées — Débloquez leurs coordonnées pour 9€" [bouton CTA orange]
- Formulaire "Contacter le vendeur" :
  - Nom, email, téléphone (optionnel), message, profil (select)
  - Bouton "Envoyer" → insère dans annonces_contacts + email au vendeur
- Sidebar : annonces similaires (même catégorie + département)
- Disclaimer : "LeGuideAuditif ne participe pas aux transactions entre les parties"

**Vue propriétaire (isOwner = true) :**
- Tout le contenu public
- + Bandeau stats : vues, contacts reçus, taux de contact
- + Liste des contacts reçus :
  - Si contacts_unlocked : nom, email, tél, message, date, profil
  - Si pas contacts_unlocked : nom + initiales email + profil + "Débloquez pour 9€"
- + Boutons action : Modifier | Supprimer | Booster (9€/sem) | Passer Premium (29€) | Envoyer alerte ciblée (19€)
- + Graphique simple : vues par jour (7 derniers jours)

### ContactForm.tsx — Formulaire de contact (visiteur → vendeur)

Props : `{ annonceId: string }`

Champs :
- `nom` — input text, obligatoire
- `email` — input email, obligatoire
- `telephone` — input tel, optionnel
- `message` — textarea, max 1000 chars, optionnel
- `profil` — select (audioprothesiste_de | etudiant_audio | assistant | investisseur | enseigne | autre)

Soumission :
- Insert dans annonces_contacts
- Incrémenter annonces.contacts_count
- Envoyer email au vendeur : "Quelqu'un s'intéresse à votre annonce [titre]"
  - Si contacts_unlocked : inclure les coordonnées complètes
  - Si pas contacts_unlocked : inclure seulement le prénom + "Débloquez les coordonnées pour 9€" [lien]
- Toast : "Votre demande a été envoyée"

### AlerteForm.tsx — Création d'alerte

Props : `{}`

Champs :
- `categorie` — select
- `sous_categorie` — select (optionnel)
- `departements` — select multi
- `prix_max` — input number (optionnel)
- `frequence` — radio (immédiat | quotidien | hebdo)

### DashboardAnnonces.tsx — Tableau de bord vendeur

Props : `{ annonces: Annonce[] }`

Pour chaque annonce :
- Titre (lien)
- Statut (badge couleur : active/expirée/brouillon)
- Vues | Contacts
- Date expiration
- Actions rapides : Modifier | Renouveler | Booster | Supprimer

Résumé global :
- Total annonces actives
- Total vues (toutes annonces)
- Total contacts reçus
- Contacts non lus (badge notification)

---

## 4. COMPOSANTS ASTRO (src/components/annonces/)

### AnnoncesBanner.astro — Banner promotionnel pour la homepage

Texte : "Vous êtes audioprothésiste ? Publiez gratuitement votre annonce : cession, emploi, remplacement, matériel"
CTA : "Déposer une annonce" → /annonces/deposer/
Placement : page d'accueil, entre les sections existantes

### AnnoncesHub.astro — Page hub /annonces/

4 cartes catégories :
1. Cession & Installation — icône lucide:building-2 — "Vendre ou reprendre un centre"
2. Emploi & Recrutement — icône lucide:briefcase — "Recruter ou trouver un poste"
3. Remplacement — icône lucide:calendar-clock — "Trouver ou proposer un remplacement"
4. Matériel professionnel — icône lucide:wrench — "Acheter ou vendre du matériel"

Chaque carte affiche le nombre d'annonces actives dans la catégorie.

En dessous : les 6 dernières annonces toutes catégories confondues.

### AnnoncesSEO.astro — Wrapper SEO pour les pages annonces

Génère :
- Meta title : "[Catégorie] — Petites annonces audioprothésistes | LeGuideAuditif"
- Meta description dynamique selon catégorie et nombre d'annonces
- Schema.org : ItemList pour les listings, Product ou JobPosting pour les annonces individuelles
- Breadcrumbs : Accueil > Annonces > [Catégorie] > [Titre annonce]

---

## 5. AUTHENTIFICATION

### ATTENTION : Supabase Auth est NOUVEAU sur ce projet

Le site actuel n'a PAS d'auth utilisateur. Le flow existant (revendication de fiches)
utilise juste l'email dans les metadata Stripe, sans compte utilisateur.

Pour les annonces, on AJOUTE Supabase Auth. C'est un ajout conséquent.

### Supabase Auth

Utiliser Supabase Auth avec les providers :
- Email + mot de passe (principal)
- Magic link (secondaire, pour les pros qui n'aiment pas les mots de passe)

### Profil utilisateur

Étendre la table `profiles` existante (ou créer si inexistante) :

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT NOT NULL,
  telephone TEXT,
  
  -- Pro
  profil_type TEXT CHECK (profil_type IN (
    'audioprothesiste_de', 'etudiant_audio', 'assistant_audio',
    'enseigne', 'investisseur', 'autre'
  )),
  numero_rpps TEXT, -- si audioprothésiste DE
  centre_nom TEXT,
  centre_ville TEXT,
  centre_departement TEXT
);
```

### Règles d'accès

- Consulter les annonces : **pas d'auth requise**
- Contacter un vendeur : **pas d'auth requise** (formulaire simple)
- Déposer une annonce : **auth requise** (email + profil)
- Gérer ses annonces : **auth requise** (propriétaire uniquement)
- Créer une alerte : **auth requise**
- Acheter une option payante : **auth requise** (Stripe Checkout)

---

## 6. PAIEMENTS STRIPE

### Produits à créer dans Stripe

| Produit | Price ID (à créer) | Montant | Type |
|---------|-------------------|---------|------|
| Débloquer contacts | price_unlock_contacts | 9,00€ | one_time |
| Annonce Premium | price_premium | 29,00€ | one_time |
| Boost 1 semaine | price_boost_semaine | 9,00€ | one_time |
| Alerte ciblée | price_alerte_ciblee | 19,00€ | one_time |
| Pack Cession Standard | price_pack_cession | 99,00€ | one_time |
| Pack Cession Accompagné | price_pack_cession_accomp | 349,00€ | one_time |

### Flow de paiement

Le site a DÉJÀ un flow Stripe fonctionnel :
- `src/pages/api/checkout.ts` — crée les sessions Checkout (fiches premium centres)
- `src/pages/api/webhook.ts` — reçoit les webhooks (checkout.session.completed, subscription.deleted, invoice.payment_failed)
- Pattern : `createServerClient()` pour les opérations DB dans le webhook

Pour les annonces, on ÉTEND le webhook existant :
- Ajouter un champ `type` dans les metadata Stripe : `{ type: 'annonce', annonce_id, user_id, produit }`
- Dans le switch `checkout.session.completed` du webhook, checker `metadata.type === 'annonce'` pour router vers la logique annonces
- Créer un nouveau endpoint `src/pages/api/annonces-checkout.ts` pour la création de session (séparé du checkout centres)

1. User clique "Booster pour 9€" sur son annonce
2. POST /api/annonces-checkout
   → body: { annonce_id, produit: 'boost_semaine' }
3. Serveur crée Stripe Checkout Session avec metadata.type = 'annonce'
   - `line_items` : le produit correspondant
   - `metadata` : `{ annonce_id, user_id, produit }`
   - `success_url` : `/annonces/[slug]?payment=success`
   - `cancel_url` : `/annonces/[slug]?payment=cancel`
3. Redirect vers Stripe Checkout
4. Webhook Stripe `checkout.session.completed` :
   - Insert dans annonces_paiements (statut: 'paid')
   - Mettre à jour l'annonce selon le produit :
     - unlock_contacts → `contacts_unlocked = true`
     - premium → `is_premium = true`
     - boost_semaine → `boost_until = now() + 7 days`
     - alerte_ciblee → déclencher l'envoi email aux inscrits de la zone
     - pack_cession → premium + unlock + boost 4 semaines
     - pack_cession_accomp → pack_cession + flag pour action manuelle Franck-Olivier

### API Routes (src/pages/api/)

```
# EXISTANT — ne pas modifier
api/checkout.ts              # Checkout fiches centres premium
api/webhook.ts               # Webhook Stripe — À ÉTENDRE (pas remplacer)
api/claim.ts                 # Revendication de fiches
api/download-lead.ts         # Téléchargement leads

# NOUVEAU — à créer
api/annonces-checkout.ts     # POST — crée session Stripe pour options annonces
```

Le webhook.ts existant doit être ÉTENDU pour gérer les paiements annonces.
Pattern : dans le case `checkout.session.completed`, vérifier `metadata.type` :
- Si `metadata.type === 'annonce'` → logique annonces
- Sinon → logique existante (centres premium)

---

## 7. EMAILS AUTOMATIQUES

### MISSION SÉPARÉE : Resend n'est pas encore installé

L'intégration Resend fera l'objet d'une mission dédiée qui couvrira
TOUS les besoins email du site (leads, fiches centres, annonces, alertes).

Pour le MVP annonces (Phase 1-3), les emails passent par le mail natif Supabase Auth
(confirmation email, magic link) + les notifications basiques Supabase.

Les emails marketing automatisés (J+3, J+7, J+14, J+25) seront implémentés
APRÈS l'installation de Resend.

### Emails prévus (à implémenter avec Resend — Phase 4)

| Trigger | Destinataire | Objet | Contenu |
|---------|-------------|-------|---------|
| Nouvelle annonce publiée | Auteur | "Votre annonce est en ligne" | Lien vers l'annonce + rappel durée 30j |
| Nouveau contact reçu | Auteur annonce | "Quelqu'un s'intéresse à votre annonce" | Prénom intéressé + profil. Si unlock: coordonnées. Sinon: CTA débloquer 9€ |
| J+3 après publication | Auteur annonce | "Votre annonce a reçu X vues" | Stats + CTA premium si pas encore premium |
| J+7 après publication | Auteur annonce | "X personnes intéressées" | Stats + CTA premium/boost |
| J+14 après publication | Auteur annonce | "X audioprothésistes n'ont pas vu votre annonce" | CTA alerte ciblée 19€ |
| J+25 après publication | Auteur annonce | "Votre annonce expire dans 5 jours" | CTA renouveler ou booster |
| Annonce expirée | Auteur annonce | "Votre annonce a expiré" | CTA republier + stats finales |
| Alerte nouvelle annonce | Abonnés alerte | "X nouvelles annonces correspondent" | Liste des nouvelles annonces + liens |

### Emails automatiques — Supabase Edge Functions

Créer des Edge Functions scheduled (cron) :

```
functions/annonces-stats-j3/     # Cron quotidien, filtre annonces créées il y a 3j
functions/annonces-stats-j7/     # Cron quotidien, filtre annonces créées il y a 7j
functions/annonces-upsell-j14/   # Cron quotidien, filtre annonces créées il y a 14j
functions/annonces-expiration/   # Cron quotidien, expire les annonces > 30j
functions/annonces-alertes/      # Cron quotidien, envoie les alertes hebdo
```

---

## 8. SEO

### URLs et meta

| Page | URL | Title | Meta description |
|------|-----|-------|-----------------|
| Hub | /annonces/ | Petites annonces audioprothésistes | Annonces cession, emploi, remplacement et matériel pour audioprothésistes. Publiez gratuitement. |
| Cession | /annonces/cession/ | Cession de centres audioprothèse | Centres à vendre, fonds de commerce, baux à céder. Trouvez votre opportunité. |
| Emploi | /annonces/emploi/ | Offres d'emploi audioprothésiste | CDI, CDD, assistants. Publiez ou consultez les offres. |
| Remplacement | /annonces/remplacement/ | Remplacement audioprothésiste | Missions ponctuelles, intérim, congés. Trouvez un remplaçant. |
| Matériel | /annonces/materiel/ | Matériel audioprothèse occasion | Cabines, audiomètres, chaînes de mesure d'occasion. |
| Annonce | /annonces/[slug] | [Titre annonce] | [Description tronquée 155 chars] |

### Schema.org

**Page listing (cession, emploi, remplacement, matériel) :**
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Cession de centres audioprothèse",
  "numberOfItems": 42,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://leguideauditif.fr/annonces/cession-centre-la-rochelle"
    }
  ]
}
```

**Annonce individuelle emploi :**
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Audioprothésiste CDI — Paris 12",
  "datePosted": "2026-04-10",
  "validThrough": "2026-05-10",
  "employmentType": "FULL_TIME",
  "jobLocation": { "@type": "Place", "address": { "addressLocality": "Paris" } }
}
```

**Annonce individuelle matériel / cession :**
```json
{
  "@context": "https://schema.org",
  "@type": "Offer",
  "name": "Cabine audiométrique Boët 3000",
  "price": "3500",
  "priceCurrency": "EUR",
  "availability": "https://schema.org/InStock"
}
```

### Sitemap
Ajouter les pages annonces au sitemap Astro.
Les annonces individuelles actives doivent être incluses avec `lastmod` = updated_at.

### Liens internes
- Depuis chaque guide de la catégorie `audioprothesiste/` → lien vers la catégorie d'annonces pertinente
- Depuis la page "trouver-audioprothesiste" → lien vers annonces/cession
- Depuis le footer → lien "Petites annonces pro" dans la section navigation

---

## 9. SUPABASE STORAGE

### Bucket : annonces-photos

```
annonces-photos/
  [annonce_id]/
    photo-1.webp
    photo-2.webp
    ...
```

### Règles
- Upload max : 5 MB par photo
- Formats acceptés : image/jpeg, image/png, image/webp
- Conversion automatique en WebP côté client avant upload (utiliser canvas API)
- Redimensionner à max 1200px de large avant upload
- Accès public en lecture (les photos sont visibles par tous)
- Écriture réservée au propriétaire de l'annonce

```sql
CREATE POLICY "Photos publiques en lecture"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'annonces-photos');

CREATE POLICY "Upload par propriétaire"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'annonces-photos'
    AND auth.uid() IS NOT NULL
  );
```

---

## 10. SÉCURITÉ & MODÉRATION

### Anti-spam
- Rate limiting : max 3 annonces par jour par utilisateur
- Max 10 demandes de contact par jour par IP
- Honeypot field dans les formulaires (champ invisible, si rempli = spam)
- Vérification email obligatoire avant publication

### Modération
- Pas de modération manuelle au lancement (auto-publication)
- Bouton "Signaler" sur chaque annonce → insert dans table `signalements`
- Si une annonce reçoit 3 signalements → statut 'moderee' automatiquement + email à Franck-Olivier
- Mots interdits dans titre/description : liste noire basique (injures, liens externes suspects)

### RGPD
- Consentement explicite au dépôt d'annonce ("J'accepte que mes coordonnées soient partagées avec les personnes intéressées")
- Droit de suppression : supprimer annonce = supprimer contacts associés + photos
- Pas de tracking tiers sur les pages annonces (Vercel Analytics uniquement, déjà en place)
- Mention dans la politique de confidentialité existante

---

## 11. FLOW TECHNIQUE COMPLET

### Dépôt d'annonce

```
1. User navigue vers /annonces/deposer/
2. Si pas connecté → redirect /auth/login?redirect=/annonces/deposer
3. Si pas de profil complété → formulaire profil rapide (nom, email, type)
4. Formulaire AnnonceForm.tsx
5. Validation côté client
6. Upload photo vers Supabase Storage (si fournie)
7. Insert dans table annonces via Supabase client
8. Génération du slug : slugify(titre) + 6 chars random
9. Redirect vers /annonces/[slug]
10. Envoi email "Votre annonce est en ligne"
11. Cron J+3 : email stats
```

### Consultation d'annonce

```
1. User navigue vers /annonces/[slug]
2. Fetch annonce depuis Supabase (server-side pour SEO)
3. Incrémenter views_count (via RPC pour éviter race condition)
4. Rendu SSR de la page
5. Si user connecté ET propriétaire → afficher vue propriétaire
6. Sinon → afficher vue publique
```

### Paiement

```
1. User clique "Passer en Premium — 29€"
2. POST /api/stripe/create-checkout
   → body: { annonce_id, produit: 'premium' }
3. Serveur crée Stripe Checkout Session
4. Redirect vers Stripe
5. Paiement OK → Stripe envoie webhook
6. POST /api/stripe/webhook
   → Vérifie signature
   → Insert paiement
   → Update annonce (is_premium = true)
7. User revient sur /annonces/[slug]?payment=success
8. Toast "Votre annonce est maintenant Premium !"
```

---

## 12. PRIORITÉS D'IMPLÉMENTATION

### Phase 1 — MVP (semaine 1-2)
- [ ] Schema Supabase (tables + RLS + storage)
- [ ] Astro config hybrid mode
- [ ] Auth Supabase (login/register/profil)
- [ ] AnnonceForm.tsx (dépôt)
- [ ] AnnonceListing.tsx (listing avec filtres basiques)
- [ ] AnnonceDetail.tsx (page annonce, vue publique)
- [ ] AnnonceCard.tsx
- [ ] Pages Astro (hub + 4 catégories + [slug] + deposer)
- [ ] Upload photo Supabase Storage
- [ ] ContactForm.tsx (formulaire de contact visiteur)
- [ ] SEO basique (meta, breadcrumbs, schema.org)

### Phase 2 — Dashboard vendeur (semaine 3)
- [ ] DashboardAnnonces.tsx (mes annonces + stats)
- [ ] Vue propriétaire dans AnnonceDetail
- [ ] Compteurs (vues, contacts)
- [ ] Gestion statut (renouveler, supprimer)

### Phase 3 — Monétisation (semaine 4)
- [ ] Stripe integration (create-checkout + webhook)
- [ ] Débloquer contacts (9€)
- [ ] Annonce Premium (29€)
- [ ] Boost (9€/semaine)
- [ ] Pack Cession (99€ et 349€)
- [ ] Page pricing /annonces/premium

### Phase 4 — Engagement (semaine 5-6)
- [ ] Emails automatiques (J+3, J+7, J+14, J+25, expiration)
- [ ] Alertes acheteur (création + envoi cron)
- [ ] Alerte ciblée payante (19€)
- [ ] Modération (signalement + auto-modération)
- [ ] Liens internes depuis les guides existants

---

## 13. FICHIERS À MODIFIER (EXISTANTS)

| Fichier | Modification |
|---------|-------------|
| `src/pages/api/webhook.ts` | ÉTENDRE le switch checkout.session.completed pour router annonces vs centres (checker metadata.type) |
| `src/components/Header.astro` | Ajouter lien "Annonces" dans la navigation |
| `src/components/Footer.astro` | Ajouter lien "Petites annonces pro" |
| `src/pages/index.astro` | Ajouter AnnoncesBanner.astro |
| `src/pages/politique-confidentialite.astro` | Section RGPD annonces |

### NE PAS TOUCHER
- `astro.config.mjs` (ne PAS passer en hybrid, le mode static + prerender false fonctionne déjà)
- `src/pages/api/checkout.ts` (c'est le checkout des fiches centres, ne pas mélanger)
- `src/pages/api/claim.ts` (revendication fiches centres)
- `src/pages/api/download-lead.ts` (leads patients)
- `src/lib/supabase.ts` (déjà correct avec client + serverClient)
- Les pages guides, comparatifs, catalogue existantes
- Le design system (couleurs, typos, icônes)
- Les composants YMYL (AuthorBox, HealthDisclaimer)
- Le pipeline GAN de contenu

---

## 14. VARIABLES D'ENVIRONNEMENT

```env
# Supabase — DÉJÀ EN PLACE
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe — DÉJÀ EN PLACE (ajouter les Price IDs annonces)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# À AJOUTER pour les annonces :
STRIPE_PRICE_UNLOCK_CONTACTS=      # 9€ one_time
STRIPE_PRICE_PREMIUM_ANNONCE=       # 29€ one_time
STRIPE_PRICE_BOOST_SEMAINE=         # 9€ one_time
STRIPE_PRICE_ALERTE_CIBLEE=         # 19€ one_time
STRIPE_PRICE_PACK_CESSION=          # 99€ one_time
STRIPE_PRICE_PACK_CESSION_ACCOMP=   # 349€ one_time

# Resend — À INSTALLER DANS UNE MISSION SÉPARÉE
# RESEND_API_KEY=
# EMAIL_FROM=annonces@leguideauditif.fr
```

### Produits Stripe à créer manuellement dans le Dashboard Stripe

Créer 6 produits one_time dans Stripe Dashboard AVANT le développement :
1. "Débloquer contacts annonce" — 9,00€
2. "Annonce Premium" — 29,00€
3. "Boost annonce 1 semaine" — 9,00€
4. "Alerte ciblée annonce" — 19,00€
5. "Pack Cession Standard" — 99,00€
6. "Pack Cession Accompagné" — 349,00€

Reporter les Price IDs dans les variables d'environnement ci-dessus.

---

## 15. TESTS MANUELS PRE-LANCEMENT

- [ ] Déposer une annonce dans chaque catégorie (4 tests)
- [ ] Vérifier que l'annonce apparaît dans le listing correct
- [ ] Vérifier le slug unique
- [ ] Upload photo + vérification affichage
- [ ] Formulaire de contact → email reçu par le vendeur
- [ ] Paiement Stripe test mode → vérifier mise à jour annonce
- [ ] Expiration d'annonce (simuler avec date passée)
- [ ] Signalement → vérifier auto-modération à 3 signalements
- [ ] SEO : vérifier schema.org avec Rich Results Test
- [ ] Mobile : vérifier responsive sur toutes les pages annonces
- [ ] Accessibilité : vérifier focus visible, labels, contraste

---

*Specs validées le 10 avril 2026 — Prêtes pour implémentation Claude Code*
