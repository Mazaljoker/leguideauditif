# PRD — Pipeline Email Revendicateurs → Premium

**Projet** : LeGuideAuditif.fr
**Auteur** : Franck-Olivier Chabbat
**Date** : 24 avril 2026
**Version** : v1.1 (validé — toutes décisions tranchées)
**Statut** : ✅ Validé — prêt pour la rédaction des specs Phase 1

---

## 1. Contexte et problème

LeGuideAuditif.fr a été lancé le 14 avril 2026 avec ~9 390 centres issus du RPPS et de l'INSEE/SIRENE. À J+9, ~43 audioprothésistes ont déjà cliqué sur "Revendiquer ma fiche" — fonctionnalité qui nourrit le programme Partenaires Fondateurs (20 places, Premium à vie offerte). Le funnel commercial actuel est :

```
Fiche RPPS brute (plan='rpps')
        │
        ▼
Revendication (claim_status='pending')
  → email claim-confirmation au revendicateur
  → email admin à Franck-Olivier (liens one-click approve/reject)
        │
        ▼
Validation (claim_status='approved', plan='claimed')
  → email claim-approved avec magic link espace pro
        │
        ▼
┌───────────────── GAP ─────────────────┐
│ Rien de systématique entre ces deux   │
│ étapes. La conversion repose à 100%   │
│ sur le suivi commercial à la main.    │
└───────────────────────────────────────┘
        │
        ▼
Premium (plan='premium', Stripe actif)
  → email payment-confirmation
```

**Quatre problèmes concrets :**

1. **Gap nurture** : rien ne pousse un revendicateur vers le Premium ni vers la complétion de sa fiche après l'approbation.
2. **Stock dormant** : 43 revendicateurs déjà passés dans le funnel — aucun moyen de les recontacter de façon propre et scalable aujourd'hui.
3. **Risque de collision commerciale** : un drip naïf enverrait des mails génériques à Anthony (en closing pre-Premium) ou Piotr (Zoom prévu), les grillant.
4. **Entité floue** : le claim est aujourd'hui attaché au centre, pas au professionnel. Un audio avec 3 centres apparaît 3 fois. Ingérable à l'échelle.

**Rappel positionnement** : LeGuideAuditif est un réseau confraternel animé par un pair DE. Le ton des mails doit refléter ça — jamais marketing agressif, jamais sous la forme d'un SaaS froid.

---

## 2. Objectifs et KPIs

### Objectifs

| Dimension | Objectif |
|---|---|
| **Business** | Convertir le stock de revendicateurs en Premium ou en clients Ads managées |
| **Produit** | Augmenter le taux de complétude des fiches pour renforcer la proposition de valeur du site |
| **Opérationnel** | Zéro email automatique envoyé à un prospect suivi à la main par Franck-Olivier |
| **Activation espace pro** | Mener les revendicateurs à utiliser `/audioprothesiste-pro/fiche` de façon récurrente |

### KPIs cibles à 90 jours

| KPI | Baseline (aujourd'hui) | Cible 90j |
|---|---|---|
| % complétude moyenne des fiches revendiquées | À mesurer | +30 pts |
| Taux d'ouverture drip (moyenne) | — | ≥ 45% |
| Taux de clic magic link espace pro | — | ≥ 15% |
| Taux de conversion `approuve` → `premium` | 0% mesuré | ≥ 8% |
| Taux de désabonnement | — | < 2% |
| Emails automatiques envoyés en collision (erreur) | — | 0 |

### Non-objectifs (hors scope V1)

- Relance des fiches `plan='rpps'` non encore revendiquées (autre problème, autre funnel)
- Séquence "winback" pour les churned (après 30j annulation) — prévu v2
- A/B testing sur les templates (on pose la base propre d'abord)
- Segmentation par solo vs groupement (le mail Ads gère la distinction via son contenu)

---

## 3. Deux pipelines découplés

**Principe structurant du PRD** : on sépare deux notions qui ont été confondues jusqu'ici.

### Pipeline automatique (machine) — le lifecycle de l'audio

Suit l'état d'activité d'un audioprothésiste sur la plateforme. Se calcule automatiquement, sans intervention humaine. Ne sert qu'à piloter le drip email et les métriques.

```
revendique → approuve → active → engage → premium → churned
```

### Pipeline commercial (humain) — le CRM prospects existant

Reste inchangé. Suit ce que **Franck-Olivier travaille activement à la main** (DM, call, Zoom, proposition commerciale).

```
prospect → contacte → rdv → proposition → signe | perdu
```

### Articulation

- Un audio peut être **uniquement** dans le pipeline automatique (= 40 des 43 revendicateurs actuels)
- Un audio peut être **dans les deux en parallèle** (= Anthony, Piotr) — dans ce cas **le pipeline commercial prend le dessus** et coupe le drip automatique
- Bouton "Promouvoir en prospect CRM" dans `/admin/claims` pour basculer manuellement un revendicateur du pipeline auto vers le CRM commercial

### Bénéfices

1. Le kanban `/admin/prospects` reste réservé aux deals actifs — pas pollué par les 43 dormants
2. Le drip auto traite le volume — Franck-Olivier traite la qualité
3. Règle de collision triviale (cf. §6)
4. Historique clair : on voit qui a basculé quand et pourquoi

---

## 4. Modèle de données

### 4.1 Nouvelles tables

#### `audiopro_lifecycle`

Entité de premier rang représentant un professionnel, identifiée par son email.

```sql
CREATE TABLE audiopro_lifecycle (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext UNIQUE NOT NULL,
  nom              text,
  prenom           text,
  adeli            text,
  rpps             text,                          -- clé secondaire si renseigné

  lifecycle_stage  text NOT NULL DEFAULT 'revendique'
                   CHECK (lifecycle_stage IN
                     ('revendique','approuve','active','engage','premium','churned')),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),

  first_claim_at   timestamptz,
  last_login_at    timestamptz,

  email_unsubscribed_at   timestamptz,
  email_preferences_token uuid DEFAULT gen_random_uuid(),

  prospect_id      uuid REFERENCES prospects(id) ON DELETE SET NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audiopro_lifecycle_stage ON audiopro_lifecycle(lifecycle_stage);
CREATE INDEX idx_audiopro_lifecycle_stage_changed ON audiopro_lifecycle(stage_changed_at);
CREATE INDEX idx_audiopro_lifecycle_rpps ON audiopro_lifecycle(rpps) WHERE rpps IS NOT NULL;
CREATE INDEX idx_audiopro_lifecycle_prospect ON audiopro_lifecycle(prospect_id) WHERE prospect_id IS NOT NULL;
```

**Règles** :
- `email` = identifiant canonique (clé primaire logique). UPSERT par email à chaque nouveau claim.
- `rpps` = clé secondaire — renseignée si le champ `adeli` du formulaire claim matche un RPPS 11 chiffres.
- `lifecycle_stage` = état courant. `stage_changed_at` = date de la dernière transition (permet de calculer "depuis combien de temps").

#### `audiopro_centres`

Table de liaison N-N. Un audio peut avoir plusieurs centres revendiqués.

```sql
CREATE TABLE audiopro_centres (
  audiopro_id uuid NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  centre_id   uuid NOT NULL REFERENCES centres_auditifs(id) ON DELETE CASCADE,
  linked_via  text NOT NULL CHECK (linked_via IN ('claim','manual')),
  linked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (audiopro_id, centre_id)
);

CREATE INDEX idx_audiopro_centres_centre ON audiopro_centres(centre_id);
```

#### `audiopro_lifecycle_events`

Historique append-only des transitions de stage. Permet les rapports "délai moyen approuve→engage".

```sql
CREATE TABLE audiopro_lifecycle_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id uuid NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  from_stage  text,
  to_stage    text NOT NULL,
  reason      text,                              -- 'claim_submitted', 'claim_approved', 'first_login', 'email_clicked', 'stripe_paid', 'stripe_cancelled', 'manual_override'
  metadata    jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audiopro_events_audiopro ON audiopro_lifecycle_events(audiopro_id, occurred_at);
```

Déclenché par trigger PostgreSQL à chaque UPDATE de `audiopro_lifecycle.lifecycle_stage` OU manuellement depuis les APIs.

#### `email_events`

Journal append-only de tous les emails envoyés (transactionnels + nurture + manuels).

```sql
CREATE TABLE email_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id       uuid REFERENCES audiopro_lifecycle(id) ON DELETE SET NULL,
  centre_slug       text,                        -- pour les mails transactionnels centre-scoped
  recipient_email   citext NOT NULL,
  template_key      text NOT NULL,               -- cf. §7 pour la liste
  resend_message_id text,                        -- retourné par Resend API
  sent_at           timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  opened_at         timestamptz,
  clicked_at        timestamptz,
  bounced_at        timestamptz,
  complaint_at      timestamptz,                 -- signalement spam
  trigger           text NOT NULL,               -- 'cron' | 'manual_admin' | 'transactional' | 'webhook_stripe'
  metadata          jsonb,                       -- { clicked_url, ... }
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_audiopro ON email_events(audiopro_id, sent_at);
CREATE INDEX idx_email_events_template ON email_events(template_key, sent_at);
CREATE INDEX idx_email_events_resend_id ON email_events(resend_message_id) WHERE resend_message_id IS NOT NULL;
```

### 4.2 Modifications des tables existantes

#### `centres_auditifs` — aucun changement

Le claim reste attaché au centre (colonnes `claimed_by_email`, `claimed_at`, etc.). On ne bouge pas la data existante, on l'enrichit via les nouvelles tables.

#### `prospects` — aucun changement

Le CRM commercial reste exactement comme aujourd'hui. Les fonctions `buildStats`, `classifyNextAction`, etc. continuent de fonctionner.

### 4.3 Migration des 43 revendicateurs existants

Script SQL one-shot déployé avec la migration Supabase :

```sql
-- Créer une ligne audiopro_lifecycle par email unique
INSERT INTO audiopro_lifecycle (email, nom, prenom, adeli, rpps, lifecycle_stage, stage_changed_at, first_claim_at)
SELECT DISTINCT ON (claimed_by_email)
  claimed_by_email,
  split_part(claimed_by_name, ' ', 2) AS nom,       -- heuristique "prenom nom"
  split_part(claimed_by_name, ' ', 1) AS prenom,
  claimed_by_adeli,
  rpps,
  CASE
    WHEN plan = 'premium' THEN 'premium'
    WHEN claim_status = 'approved' THEN 'approuve'
    WHEN claim_status = 'pending' THEN 'revendique'
    ELSE 'revendique'
  END,
  claimed_at,
  claimed_at
FROM centres_auditifs
WHERE claimed_by_email IS NOT NULL
ORDER BY claimed_by_email, claimed_at ASC;

-- Lier chaque centre à son audiopro
INSERT INTO audiopro_centres (audiopro_id, centre_id, linked_via, linked_at)
SELECT a.id, c.id, 'claim', c.claimed_at
FROM centres_auditifs c
JOIN audiopro_lifecycle a ON a.email = c.claimed_by_email
WHERE c.claimed_by_email IS NOT NULL;

-- Backfill lifecycle_events avec la transition initiale
INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, occurred_at)
SELECT id, NULL, lifecycle_stage, 'migration_initiale', stage_changed_at
FROM audiopro_lifecycle;
```

**Règle** : la heuristique `split_part` sur `claimed_by_name` est imparfaite (Jean Dupont vs Marie Curie-Skłodowska). Franck-Olivier pourra corriger manuellement depuis `/admin/claims` après migration.

---

## 5. Lifecycle audio — transitions et triggers

### 5.1 Les 6 stages

| Stage | Définition | Trigger d'entrée |
|---|---|---|
| `revendique` | A soumis ≥ 1 formulaire claim | POST `/api/claim` succès |
| `approuve` | ≥ 1 claim `approved` | Admin clique "Approuver" |
| `active` | ≥ 1 centre ≥ 60% complet OU 1er login espace pro | Recalcul cron + log login |
| `engage` | A cliqué ≥ 1 mail nurture OU 2e login | Webhook Resend + log login |
| `premium` | ≥ 1 centre `plan='premium'` | Webhook Stripe `checkout.session.completed` |
| `churned` | A été `premium`, abonnement annulé | Webhook Stripe `customer.subscription.deleted` |

### 5.2 Règles de transition

- **Progression normale** : `revendique → approuve → active → engage → premium`
- **Saut autorisé** : on peut sauter des étapes (ex. `approuve → premium` direct si l'audio paye tout de suite)
- **Régression** : uniquement `premium → churned`. Pas de régression auto ailleurs. Un audio `engage` qui ne se connecte plus pendant 30j reste `engage`.
- **Manual override** : Franck-Olivier peut forcer un stage depuis `/admin/claims` (avec raison tracée dans `audiopro_lifecycle_events`).

### 5.3 SQL de recalcul (cron quotidien)

Fonction PostgreSQL `recompute_audiopro_lifecycle()` exécutée par le cron chaque jour avant le drip :

```sql
CREATE OR REPLACE FUNCTION recompute_audiopro_lifecycle() RETURNS void AS $$
BEGIN
  -- Passe à 'premium' si un centre lié est premium
  UPDATE audiopro_lifecycle a
  SET lifecycle_stage = 'premium', stage_changed_at = now()
  FROM audiopro_centres ac
  JOIN centres_auditifs c ON c.id = ac.centre_id
  WHERE ac.audiopro_id = a.id
    AND c.plan = 'premium'
    AND a.lifecycle_stage NOT IN ('premium', 'churned');

  -- Passe à 'active' si complétude moyenne >= 60% OU login détecté
  -- (la complétude est calculée via COMPLETENESS_FIELDS existant)
  UPDATE audiopro_lifecycle a
  SET lifecycle_stage = 'active', stage_changed_at = now()
  WHERE a.lifecycle_stage = 'approuve'
    AND (
      EXISTS (
        SELECT 1 FROM audiopro_centres ac
        JOIN centres_auditifs c ON c.id = ac.centre_id
        WHERE ac.audiopro_id = a.id
          AND completeness_pct(c) >= 60
      )
      OR a.last_login_at IS NOT NULL
    );

  -- (Les transitions revendique→approuve et active→engage sont event-driven,
  --  pas batch — voir §8)
END;
$$ LANGUAGE plpgsql;
```

La fonction `completeness_pct(centre)` est un helper PostgreSQL qui réutilise la logique de `COMPLETENESS_FIELDS` (cf. `src/types/prospect.ts`).

---

## 6. Règles de collision CRM

Un audio est considéré **"touché à la main"** (→ **skip drip automatique**) si **au moins une** des conditions suivantes est vraie :

### Condition 1 — Prospect commercial actif

```sql
EXISTS (
  SELECT 1 FROM prospects p
  WHERE p.id = audiopro.prospect_id
    AND p.status IN ('contacte', 'rdv', 'proposition')
)
```

### Condition 2 — Interaction humaine récente (< 14j)

```sql
EXISTS (
  SELECT 1 FROM interactions i
  WHERE i.prospect_id = audiopro.prospect_id
    AND i.kind IN ('dm', 'call', 'meeting', 'note', 'transcript_meet', 'transcript_call')
    AND i.occurred_at >= now() - interval '14 days'
)
```

**Note** : les `kind='email'` sont exclus car c'est le drip lui-même qui en crée. Sinon le premier mail envoyé bloquerait le suivant.

### Condition 3 — Tâche CRM ouverte

```sql
EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.owner_type = 'prospect'
    AND t.owner_id = audiopro.prospect_id
    AND t.status = 'open'
)
```

### Condition 4 — Désabonnement

```sql
audiopro.email_unsubscribed_at IS NOT NULL
```

### Logique globale

```
Envoi drip autorisé si:
  AUCUNE des conditions 1, 2, 3, 4 n'est vraie
```

**Les 3 premières ne s'appliquent que si `audiopro.prospect_id IS NOT NULL`**. Un audio qui n'a pas été promu en prospect commercial n'a pas de collision possible à ce niveau.

### Bypass manuel

Le bouton "Relancer [template]" dans `/admin/claims` bypasse **toutes** les règles de collision sauf la condition 4 (désabonnement). C'est une décision humaine délibérée de Franck-Olivier.

### Traçage automatique dans `interactions`

Chaque mail automatique (drip ou manuel) envoyé à un audio ayant un `prospect_id` non null crée une ligne dans `interactions` :

```sql
INSERT INTO interactions (prospect_id, kind, content, occurred_at)
VALUES (
  audiopro.prospect_id,
  'email',
  'Email nurture envoyé : ' || template_key,
  now()
);
```

Comme ça, la timeline de la fiche prospect dans `/admin/prospects` reste à jour sans action manuelle.

---

## 7. Séquence drip — 6 templates

### 7.1 Vue d'ensemble

| # | Template key | Trigger (stage + ancienneté) | Stop condition | CTA unique |
|---|---|---|---|---|
| 1 | `nurture_01_premiers_patients` | `approuve` depuis ≥ 3j | déjà envoyé | Magic link espace pro |
| 2 | `fiche_incomplete_relance` | `approuve`/`active` depuis ≥ 10j ET ≥ 1 centre < 80% | complétude 100% ou déjà envoyé dans les 30j | Magic link `/audioprothesiste-pro/fiche` |
| 3 | `nurture_02_offre_fondateurs` | `approuve`/`active`/`engage` depuis ≥ 7j ET `fondateurs_actif=true` | `fondateurs_actif=false` ou déjà envoyé | Réserver Zoom 20 min |
| 4 | `nurture_03_cas_concret` | 14j après `approuve` OU entrée `engage` | déjà envoyé | Lire l'étude de cas |
| 5 | `nurture_04_slots_restants` | 21j après `approuve` ET `fondateurs_actif=true` ET `slots_restants ≤ 5` | slots=0 ou déjà envoyé | Candidater |
| 6 | `nurture_05_ads_ou_sortie` | 45j après `approuve` ET `stage ≠ premium` | déjà envoyé | Parler Ads / Rester gratuit |

### 7.2 Stop globaux (s'appliquent à toute la séquence)

Avant d'envoyer **n'importe quel** mail nurture, vérifier :
- Règles de collision CRM (§6) — toutes passent
- `email_unsubscribed_at IS NULL`
- `lifecycle_stage NOT IN ('premium', 'churned')` — un premium actuel ne reçoit plus de nurture
- Ce template n'a jamais été envoyé à cet audiopro (sauf `fiche_incomplete_relance` qui peut se renvoyer après 30j)

### 7.3 Flag fondateurs

Variable globale stockée en base dans une table `feature_flags` :

```sql
CREATE TABLE feature_flags (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feature_flags VALUES ('fondateurs_drip_enabled', 'true'::jsonb);
INSERT INTO feature_flags VALUES ('fondateurs_slots_max', '20'::jsonb);
```

Franck-Olivier peut désactiver le drip Fondateurs à tout moment via `/admin` (interface dédiée ou SQL direct) sans redeploy.

Le calcul `slots_restants` utilise `buildStats().fondateurSlotsUsed` existant :

```sql
SELECT 20 - COUNT(*) FROM prospects WHERE is_fondateur = true AND status = 'signe';
```

### 7.4 Détail de chaque template

#### Template 1 — `nurture_01_premiers_patients`

**Objet** : "Vos premiers patients sur LeGuideAuditif — quelques repères"

**Angle** : confraternel, pédagogique. Pas de vente. Juste "voilà comment ça marche maintenant que votre fiche est en ligne".

**Structure** :
- Bref rappel ("Votre fiche est validée et visible sur l'annuaire.")
- 2-3 repères simples ("Les patients vous trouvent via la carte du département et via la recherche par ville. Voilà ce qui fait la différence : photo, horaires, spécialités.")
- Prévisualisation complétude actuelle des centres de l'audio
- CTA unique : "Compléter mes fiches" → `/audioprothesiste-pro/fiche`
- Signature Franck-Olivier DE

#### Template 2 — `fiche_incomplete_relance`

**Objet** : "Il manque [N champ(s)] sur [votre fiche | vos N fiches]"

**Angle** : factuel, pas moralisateur. "Voilà précisément ce qu'il manque, voilà le lien pour compléter."

**Structure** :
- Liste détaillée des champs vides par centre :
  ```
  Audika Paris 11e (85% complet)
  Il manque : horaires d'ouverture

  Audika Paris 15e (40% complet)
  Il manque : téléphone, photo, spécialités, marques
  ```
- Stat interne : "Les fiches complètes reçoivent en moyenne 3× plus de demandes de contact."
- CTA unique : lien magic vers `/audioprothesiste-pro/fiche?centre=[slug]` pour ouvrir directement le centre le plus incomplet
- Peut être renvoyé après 30j si la complétude n'a pas bougé

#### Template 3 — `nurture_02_offre_fondateurs`

**Objet** : "Programme Partenaires Fondateurs — [X] places restantes"

**Angle** : offre claire, pair à pair, rareté réelle. Pas de fausse urgence.

**Structure** :
- Contexte ("Je lance 20 places Fondateurs pour les premiers audioprothésistes qui rejoignent le réseau.")
- Ce que Franck-Olivier donne (Premium à vie offerte)
- Ce qu'il attend en retour (feedback sur la plateforme, témoignage vidéo si OK)
- Slots restants dynamiques (`20 - signé`)
- CTA unique : lien Cal.com / calendrier Zoom 20 min
- Signature Franck-Olivier avec mention "DE, 28 ans de métier"

#### Template 4 — `nurture_03_cas_concret`

**Objet** : "Comment [Prénom 1er adopteur] a structuré sa présence sur LeGuideAuditif"

**Angle** : preuve sociale terrain, sans promesse chiffrée.

**Structure** :
- Courte étude de cas (200-300 mots max) : qui, contexte, ce qu'il a mis en place, ce que ça a changé **qualitativement** (pas de chiffres de leads garantis — cf. §10.2)
- Lien vers l'article blog complet sur leguideauditif.fr
- CTA unique : "Lire l'étude de cas complète"
- Pas de push Premium direct ici, juste de l'inspiration

#### Template 5 — `nurture_04_slots_restants`

**Objet** : "Plus que [X] places Fondateurs"

**Angle** : rappel factuel, ne part qu'à ceux qui n'ont pas encore candidaté.

**Structure** :
- "Il reste [X] places sur 20 dans le programme Fondateurs."
- Mini-récap des avantages (3 lignes max)
- CTA unique : "Candidater en 5 min"
- Ne part que si `slots_restants ≤ 5` (sinon trop tôt)

#### Template 6 — `nurture_05_ads_ou_sortie`

**Objet** : "Vous voulez des RDV patients ou vous restez en vitrine ?"

**Angle** : direct, honnête, pas rancunier. Deux options explicites.

**Structure** :
- "Cela fait 45 jours que vous êtes validé. Deux scénarios :"
- Option A — "Vous voulez des RDV concrets : on peut lancer des campagnes Ads ciblées sur votre zone. Setup 300€ + 20% du budget pub (vous payez Google/Meta directement, je gère la tech et le suivi)."
- Option B — "Vous préférez rester en fiche gratuite : aucun souci, vous restez référencé."
- CTA double : "Discuter d'une campagne" / "Je reste en gratuit" (les deux sont des liens qui posent une réponse en base ou déclenchent un mail à Franck-Olivier)

### 7.5 Template supplémentaire — `premium_welcome`

**Envoyé quand** : un audio passe à `lifecycle_stage='premium'` (webhook Stripe).

**Coupe toute la séquence nurture** (mais on laisse les transactionnels passer).

**Contenu** :
- Remerciement bref
- Rappel des bénéfices Premium activés (badge "Centre vérifié", affichage prioritaire, leads exclusifs)
- Lien espace pro avec checklist d'activation
- Contact direct Franck-Olivier pour onboarding

---

## 8. Flow technique

### 8.1 Endpoints à créer

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/resend-webhook` | POST | Réception des events Resend (delivered, opened, clicked, bounced, complaint) |
| `/api/cron/email-drip` | POST | Cron Vercel quotidien — lit `audiopro_lifecycle`, calcule éligibilité, envoie |
| `/api/admin/relance-email` | POST | Déclenché par le bouton dropdown dans `/admin/claims` |
| `/api/admin/promote-to-prospect` | POST | Bouton "Promouvoir en prospect" |
| `/email-preferences` | GET (page) | Page publique de gestion du consentement (token-based) |
| `/api/email-preferences` | POST | Update du consentement |

### 8.2 Modifications des endpoints existants

- **`/api/claim` (POST)** — après le succès actuel, ajouter :
  1. UPSERT sur `audiopro_lifecycle` (par email)
  2. INSERT sur `audiopro_centres` (lien centre ↔ audiopro)
  3. INSERT sur `audiopro_lifecycle_events` (transition `→ revendique`)
  4. Envoi de `claim-confirmation` passe par `email_events` (ajout d'une ligne systématique)

- **`/api/admin/quick-approve` (GET)** — après l'update existant :
  1. UPDATE `audiopro_lifecycle SET lifecycle_stage='approuve'` si pas déjà plus avancé
  2. INSERT `audiopro_lifecycle_events` (`approuve`)
  3. `claim-approved` loggé dans `email_events`

- **`/api/webhook` (POST)** — Stripe :
  1. Sur `checkout.session.completed` : UPDATE `audiopro_lifecycle SET lifecycle_stage='premium'`
  2. Sur `customer.subscription.deleted` : UPDATE `audiopro_lifecycle SET lifecycle_stage='churned'`
  3. Déclenche `premium_welcome` (loggé dans `email_events`)

- **`/auth/callback-pro`** — après authentification Supabase :
  1. UPDATE `audiopro_lifecycle SET last_login_at = now()`
  2. Si `last_login_at` est le 1er → recompute éventuel vers `active`
  3. Si c'est le 2e login distinct (ou clic sur un mail nurture déjà loggé) → transition vers `engage`

### 8.3 Cron Vercel

Fichier `vercel.json`, ajout de la section `crons` :

```json
{
  "crons": [
    {
      "path": "/api/cron/email-drip",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Exécution quotidienne à **7h UTC** (= 9h Paris en été, 8h en hiver). À caler selon les tests.

**Ordre d'exécution du cron** :

1. Appeler `recompute_audiopro_lifecycle()` (passe batch `approuve→active`, `* → premium`)
2. Pour chaque template (dans l'ordre du §7.1) :
   - Query SQL : audios éligibles (stage + ancienneté + pas déjà envoyé + pas collision + pas unsub)
   - Pour chaque audio éligible :
     - Générer le HTML du template (avec données dynamiques : centres, complétude, slots restants)
     - Envoyer via Resend
     - INSERT `email_events`
     - Si `prospect_id IS NOT NULL` → INSERT `interactions`
3. Log de synthèse en fin de run (nombre envoyé par template, erreurs)

**Limite anti-abus** : max 1 mail nurture par audio par run. Si par malchance un audio coche 2 templates, on prend le plus prioritaire (l'ordre du §7.1).

### 8.4 Webhook Resend

Endpoint `/api/resend-webhook` reçoit les events signés (secret partagé). Types traités :

| Event Resend | Action |
|---|---|
| `email.sent` | Ignoré (déjà loggé à l'envoi) |
| `email.delivered` | UPDATE `email_events SET delivered_at = now()` |
| `email.opened` | UPDATE `email_events SET opened_at = now()` (premier open seulement) |
| `email.clicked` | UPDATE `email_events SET clicked_at = now(), metadata = {...url}`. Si c'est un template nurture → transition `active → engage` |
| `email.bounced` | UPDATE `email_events SET bounced_at = now()`. Si bounce permanent → marquer `audiopro` pour exclure |
| `email.complained` | UPDATE `email_events SET complaint_at = now()` + force `email_unsubscribed_at = now()` |

---

## 9. Espace pro — magic link et ancrages

### 9.1 Réutilisation de l'existant

Aucune création de page. On pointe vers ce qui existe déjà :

| Mail | URL cible |
|---|---|
| `nurture_01_premiers_patients` | `/audioprothesiste-pro/` (dashboard) |
| `fiche_incomplete_relance` | `/audioprothesiste-pro/fiche?centre=[slug]` |
| `nurture_02_offre_fondateurs` | Cal.com ou Zoom direct (pas l'espace pro) |
| `nurture_03_cas_concret` | Article blog sur leguideauditif.fr |
| `nurture_04_slots_restants` | Page `/offres/` section Fondateurs |
| `nurture_05_ads_ou_sortie` | Formulaire léger ad-hoc ou Cal.com |
| `premium_welcome` | `/audioprothesiste-pro/bienvenue` |

### 9.2 Magic link

Le magic link Supabase est déjà câblé (`/auth/callback-pro`). Les emails nurture incluent un lien du type :

```
https://leguideauditif.fr/auth/login?email=[encoded]&next=[destination_url]
```

Le flux :
1. L'audio clique → arrive sur `/auth/login` avec email pré-rempli
2. Supabase envoie un OTP
3. Validation → `/auth/callback-pro` → redirect vers `next`

**Note** : si l'audio est déjà connecté (session active), le magic link skip l'OTP.

### 9.3 Ancrage précis dans la fiche

Le paramètre `?centre=[slug]` dans `/audioprothesiste-pro/fiche` ouvre directement le bon centre. Si plusieurs centres sont incomplets, on ouvre **celui avec le score le plus bas**.

Paramètre supplémentaire optionnel `?section=contacts|photo|specialites` pour scroller directement à la section manquante (si implémentable sans refonte significative de `fiche.astro` — sinon on laisse sans ancrage en v1).

---

## 10. Console admin — évolutions `/admin/claims`

### 10.1 Refonte de la liste principale

**Colonnes affichées** (ordre) :

| Colonne | Source | Tri possible |
|---|---|---|
| Date claim | `claimed_at` le plus récent parmi les centres de l'audio | ✓ |
| Audio (nom + prénom) | `audiopro_lifecycle.nom + prenom` | ✓ |
| Email | `audiopro_lifecycle.email` | |
| Nb centres | `COUNT(audiopro_centres)` | ✓ |
| Statut claims | Compteur "2 approved / 1 pending" | |
| **Lifecycle stage** | `audiopro_lifecycle.lifecycle_stage` avec badge coloré | ✓ |
| **Complétude moyenne** | Moyenne de `completeness_pct` sur les centres de l'audio (%) | ✓ |
| **Dernier email envoyé** | Dernière ligne de `email_events` : template + date + statut | ✓ |
| **Nb emails envoyés (30j)** | `COUNT(email_events)` derniers 30j | |
| **Prospect CRM** | Badge "En pipeline ({status})" si `prospect_id IS NOT NULL` | |
| **Actions** | Menu contextuel (cf. 10.3) | |

**Filtres** en haut de liste :
- Par lifecycle stage
- Par présence/absence prospect commercial
- Par complétude (< 50% / 50-80% / > 80%)
- Par dernier mail envoyé (< 7j / 7-30j / > 30j / jamais)
- Recherche texte (nom, email, centre)

### 10.2 Fiche détaillée audio

Clic sur une ligne → panel latéral ou page `/admin/claims/[audiopro_id]` avec :

**Bloc 1 — Identité**
- Nom, prénom, email, téléphone (s'il a été renseigné)
- ADELI, RPPS (si détecté)
- Lifecycle stage actuel + date de transition
- Historique des transitions (depuis `audiopro_lifecycle_events`)

**Bloc 2 — Centres liés**
- Liste des centres avec : nom, ville, complétude %, plan (rpps/claimed/premium), statut claim
- Pour chaque centre, lien vers la fiche publique et vers l'édition admin

**Bloc 3 — Timeline emails**
- Toutes les lignes `email_events` pour cet audio
- Colonnes : date, template, trigger (cron/manual/transactional), delivered, opened, clicked, bounced
- Visualisation frise chronologique

**Bloc 4 — Prospect CRM (si lié)**
- Status, next_action, mrr_potentiel
- Timeline complète des `interactions`
- Lien vers la fiche `/admin/prospects/[id]`

**Bloc 5 — Attribution**
- Depuis `claim_attributions` : UTM, gclid, fbclid, landing page
- Pour chaque centre revendiqué

**Bloc 6 — Actions (footer sticky)**
Cf. 10.3.

### 10.3 Menu d'actions sur une fiche audio

Dropdown avec les actions suivantes :

| Action | Déclenche |
|---|---|
| **Renvoyer un email** (dropdown 6 templates) | POST `/api/admin/relance-email` avec `template_key` choisi — bypasse collision sauf unsubscribe |
| **Promouvoir en prospect CRM** | POST `/api/admin/promote-to-prospect` — crée ligne `prospects` avec données pré-remplies, lie via `prospect_id`, redirect vers `/admin/prospects/[id]` |
| **Forcer un lifecycle stage** | Manuel override avec raison tracée |
| **Marquer désabonné** | SET `email_unsubscribed_at = now()` manuellement |
| **Fusionner avec un autre audiopro** | Si doublon détecté (rare mais possible) |
| **Voir fiche publique** | Ouvre la fiche la plus complète dans un nouvel onglet |

### 10.4 Bouton "Relancer" — détail du dropdown

Les 6 choix disponibles :

1. Complétude (`fiche_incomplete_relance`)
2. Premiers patients (`nurture_01_premiers_patients`)
3. Offre Fondateurs (`nurture_02_offre_fondateurs`) — grisé si `fondateurs_drip_enabled=false`
4. Cas concret (`nurture_03_cas_concret`)
5. Slots restants (`nurture_04_slots_restants`) — grisé si slots > 5
6. Ads ou sortie (`nurture_05_ads_ou_sortie`)

Modale de confirmation avant envoi (pour éviter les clics accidentels).

---

## 11. Tuile admin `/admin/index`

Nouvelle tuile "Drip email" ajoutée au dashboard existant :

```
┌─────────────────────────────────────┐
│  Drip email                         │
│                                      │
│  42 envoyés (7 derniers jours)      │
│  Taux ouverture : 48%               │
│  Taux clic : 12%                    │
│  1 désabonnement                    │
│  0 bounces permanents               │
│                                      │
│  [Voir détails] → /admin/emails     │
└─────────────────────────────────────┘
```

**Page `/admin/emails`** (optionnelle v1, peut passer en v2) : graphiques hebdo par template + liste des bounces.

---

## 12. Unsubscribe et RGPD

### 12.1 Page `/email-preferences`

Accessible via lien token-based dans le footer de tous les mails nurture :

```
https://leguideauditif.fr/email-preferences?token=[uuid]
```

Le token correspond à `audiopro_lifecycle.email_preferences_token` (UUID généré à la création). Pas d'auth requise (classique pour unsub).

**Contenu de la page** :

- Option 1 (par défaut) : **Je ne veux plus recevoir les emails d'information mais je garde les emails transactionnels** (confirmations, factures, etc.) → SET `email_unsubscribed_at = now()`
- Option 2 : **Je me désabonne de tout** → en plus, set flag `hard_unsubscribe` qui bloque aussi les transactionnels (rare mais légalement requis)

### 12.2 Distinction nurture / transactionnel

| Type | Exemples | Impact unsub soft |
|---|---|---|
| **Transactionnel** | claim-confirmation, claim-approved, payment-confirmation, subscription-cancelled | Toujours envoyés |
| **Nurture automatique** | Les 6 templates du §7 | Bloqué si unsub soft |
| **Manuel admin** | Relance envoyée par Franck depuis `/admin/claims` | Bloqué si unsub soft (Franck voit l'info dans la fiche) |

### 12.3 Conformité

- Lien unsub obligatoire dans footer de tous les mails nurture
- Stockage du consentement avec timestamp dans `audiopro_lifecycle.email_unsubscribed_at`
- Historique dans `audiopro_lifecycle_events` (`reason='email_unsubscribed'`)
- Cohérent avec la politique de confidentialité existante (`/politique-confidentialite`)

---

## 13. Rollout en 3 phases

### Phase 1 — Foundation + traitement manuel des 43 (J+1 à J+5)

**Objectif** : poser la data + débloquer le traitement manuel des 43 revendicateurs actuels tout de suite.

**Livrables** :
1. Migration Supabase : tables `audiopro_lifecycle`, `audiopro_centres`, `audiopro_lifecycle_events`, `email_events`, `feature_flags`
2. Script de migration des 43 existants (§4.3)
3. Modification de `/api/claim` pour populer les nouvelles tables
4. Modification de `/api/admin/quick-approve` et `/api/webhook` (Stripe) pour maintenir `audiopro_lifecycle`
5. Refonte de `/admin/claims` avec :
   - Nouvelles colonnes (lifecycle, complétude, dernier mail)
   - Fiche détail audio (10.2)
   - Bouton dropdown "Relancer email" (10.3)
   - Bouton "Promouvoir en prospect CRM"
6. Endpoint `/api/admin/relance-email`
7. Endpoint `/api/admin/promote-to-prospect`
8. Template `fiche_incomplete_relance` opérationnel (utilisable depuis le bouton manuel)
9. Log automatique dans `email_events` + `interactions`

**Livrable métier** : Franck-Olivier peut traiter les 43 revendicateurs à la main depuis `/admin/claims` en choisissant le bon template par audio.

**Pas encore livré en Phase 1** : cron, webhook Resend, autres templates, page unsubscribe.

### Phase 2 — Automatisation drip (J+6 à J+15)

**Objectif** : mettre en place le drip automatique complet.

**Livrables** :
1. Les 5 autres templates : `nurture_01` à `nurture_05`
2. Template `premium_welcome`
3. Endpoint `/api/resend-webhook` + gestion des events
4. Endpoint `/api/cron/email-drip` avec toutes les règles de §6 et §7
5. Fonction PostgreSQL `recompute_audiopro_lifecycle()` et helper `completeness_pct`
6. Modifications `/auth/callback-pro` (last_login_at, transition active/engage)
7. Configuration `vercel.json` cron
8. Page `/email-preferences` + endpoint associé
9. Tests manuels : envoi à une adresse test avec chaque template

**Livrable métier** : le drip tourne tous les matins à 9h (heure Paris), sans intervention humaine, avec traçage complet.

### Phase 3 — Métriques et polish (J+16 à J+20)

**Objectif** : visibilité et fine-tuning.

**Livrables** :
1. Tuile "Drip email" sur `/admin/index` (§11)
2. Page `/admin/emails` avec graphiques hebdo par template (optionnel — peut attendre v2)
3. Export CSV des events email pour analyse externe
4. Documentation courte pour Franck-Olivier (comment modifier un template, comment désactiver un stage, comment lire les métriques)
5. Tests E2E Playwright minimum : POST /api/claim → ligne audiopro créée, stage='revendique'

**Livrable métier** : Franck voit d'un coup d'œil la santé de son pipeline email sans creuser dans Supabase.

### Dépendances et ordre strict

```
Phase 1 ──(nouvelles tables + bouton manuel)──▶ Phase 2 ──(cron)──▶ Phase 3 (métriques)
```

La Phase 1 est indispensable avant toute la suite — pas de Phase 2 sans les tables et la migration des 43.

---

## 14. Risques et décisions ouvertes

### 14.1 Risques identifiés et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Mail nurture envoyé à un prospect suivi à la main | Élevée sans mitigation | Très élevé (grille la relation) | 4 conditions de collision (§6) + flag unsub + log dans interactions pour visibilité |
| Doublons audiopro (emails différents, même personne) | Moyenne | Moyen | Bouton "Fusionner" dans fiche admin (10.3) — v1 manuel, v2 auto si RPPS matche |
| Bounce permanent sur email valide | Faible | Faible | Webhook Resend → exclusion auto après 1 bounce permanent |
| Template Fondateurs envoyé quand 0 slot | Faible | Moyen (contradiction visible) | Vérif `slots_restants > 0` dans la query ET feature flag `fondateurs_drip_enabled` |
| Cron Vercel ne tourne pas (incident) | Faible | Moyen | Alerte manuelle côté Franck-Olivier : si `email_events` count du jour = 0, c'est suspect |
| Migration des 43 échoue sur split_part noms | Certaine sur quelques cas | Faible | Correction manuelle via `/admin/claims` après migration |
| Audio qui revient après churn et reçoit `nurture_01` | Faible | Moyen (maladroit) | `churned` exclu explicitement dans les triggers drip |
| Cas Anthony-like : a déjà un prospect actif mais aussi une fiche incomplète | Moyenne | Faible (on manque une relance légitime) | Accepter en v1 : le commercial prime. Franck peut renvoyer manuellement si besoin. |

### 14.2 Décisions déjà prises

**Architecture & data :**
- ✅ École B : pipelines découplés (lifecycle machine + CRM humain)
- ✅ Entité canonique = audio (pas centre), identifié par email
- ✅ RPPS = clé secondaire si renseigné
- ✅ Historique des transitions (table `audiopro_lifecycle_events`)
- ✅ 3 phases, Phase 1 livre le bouton manuel en priorité

**Admin & interactions :**
- ✅ Dropdown 6 templates dans le bouton relance
- ✅ Promotion manuelle en prospect CRM
- ✅ Page `/admin/emails` livrée en Phase 3 (pas reportée v2)

**Contenus & règles :**
- ✅ Mail Ads universel (pas de gate sur `nb_centres ≥ 2`)
- ✅ Flag `fondateurs_drip_enabled` pour retirer le template quand le programme est terminé
- ✅ Unsubscribe soft par défaut (garde les transactionnels)
- ✅ **Contenu des 6 templates produit via le skill `nposts-social-humanizer` ou équivalent — indispensable. Pas de copy directement rédigé par Claude sans passage par le pipeline de voix Franck-Olivier.**

**Cron & logique d'envoi :**
- ✅ **Cron quotidien à 9h Paris** (`schedule: "0 7 * * *"` UTC été ; note : en hiver ça devient 8h Paris — acceptable)
- ✅ **1 mail nurture max par cron par audio** — si plusieurs templates matchent, on prend le plus prioritaire selon l'ordre §7.1
- ✅ **Ancrage `?section=X` dans `fiche.astro`** : à évaluer en Phase 2. Si implémentable sans refonte de `fiche.astro`, on le fait. Sinon on livre sans ancrage, l'audio arrive sur sa fiche complète.
- ✅ **Pas de reset de séquence** si l'audio revendique un nouveau centre 6 mois plus tard. Il reste dans son stage courant. Les relances long terme passeront par la **newsletter v2** (hors scope V1).

### 14.3 Décisions à prendre pendant l'exécution

Aucune décision structurelle ouverte. Les seules choses à valider pendant l'exécution sont :
- Les maquettes exactes des 6 templates (copy final humanizé) — validation par Franck-Olivier avant déploiement
- Les libellés exacts des badges et messages admin (ergonomie mineure)
- L'ordre exact des colonnes dans la liste refondue `/admin/claims` (ergonomie)

### 14.4 Hors scope V1 — à reconsidérer en v2

- Séquence winback pour les `churned`
- **Newsletter périodique** (mensuelle ou trimestrielle) adressée aux revendicateurs inactifs depuis > 6 mois — canal de relance long terme qui remplace l'idée d'un reset de séquence
- Segmentation fine solo vs groupement dans les templates
- A/B testing des objets et contenus
- Intégration Google Analytics / Vercel Analytics sur les clics email
- Export automatique vers Notion d'un résumé hebdo
- Templates de relance pour les fiches `plan='rpps'` jamais revendiquées (autre projet)

---

## Annexes

### Annexe A — Liste des tables Supabase impactées

**Nouvelles** :
- `audiopro_lifecycle`
- `audiopro_centres`
- `audiopro_lifecycle_events`
- `email_events`
- `feature_flags`

**Modifiées** : aucune (la data existante reste intacte, on enrichit via nouvelles tables)

**Lues** :
- `centres_auditifs` (calcul complétude, liaison via `audiopro_centres`)
- `prospects` (collision CRM)
- `interactions` (collision + écriture automatique)
- `tasks` (collision)
- `claim_attributions` (fiche détaillée admin)

### Annexe B — Liste des nouveaux endpoints

- `POST /api/resend-webhook`
- `POST /api/cron/email-drip`
- `POST /api/admin/relance-email`
- `POST /api/admin/promote-to-prospect`
- `GET /email-preferences`
- `POST /api/email-preferences`

### Annexe C — Liste des endpoints existants à modifier

- `POST /api/claim` (populer audiopro + log email_events)
- `GET /api/admin/quick-approve` (transition lifecycle)
- `GET /api/admin/quick-reject` (log si besoin)
- `POST /api/webhook` (Stripe : transitions premium/churned + premium_welcome)
- `/auth/callback-pro` (last_login_at + transition active/engage)

### Annexe D — Liste des templates email

**Nouveaux** :
- `nurture_01_premiers_patients`
- `fiche_incomplete_relance`
- `nurture_02_offre_fondateurs`
- `nurture_03_cas_concret`
- `nurture_04_slots_restants`
- `nurture_05_ads_ou_sortie`
- `premium_welcome`

**Existants inchangés** :
- `claim-confirmation`
- `claim-approved`
- `claim-admin-notification`
- `payment-confirmation`
- `payment-admin-notification`
- `subscription-cancelled`

---

**Fin du PRD v1.1 — validé.**

Prochaine étape : rédaction des specs détaillées Phase 1 (SQL complet, structure des endpoints, pseudocode, contrats TypeScript) → prompt Claude Code pour exécution.
