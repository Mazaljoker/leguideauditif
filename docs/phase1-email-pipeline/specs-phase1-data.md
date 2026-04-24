# Specs Phase 1 — Data Layer

**Projet** : LeGuideAuditif.fr — Pipeline Email Revendicateurs
**Fichier** : `specs-phase1-data.md`
**Document parent** : `prd-email-pipeline-revendicateurs.md` v1.1
**Version** : v1.0
**Statut** : Prêt pour exécution Claude Code

---

## Vue d'ensemble

Ce document spécifie intégralement la couche data de la Phase 1 :

1. 5 nouvelles tables Supabase
2. 2 fonctions PostgreSQL
3. 1 script de migration one-shot pour les 43 revendicateurs existants
4. 1 nouveau fichier de types TypeScript
5. Politiques RLS

**Ordre d'exécution critique** : DDL → indexes → fonctions → RLS → migration one-shot. Le script de migration fait appel à `completeness_pct()` donc la fonction doit exister avant.

**Numérotation des migrations** : lire `supabase/migrations/` pour identifier le dernier numéro utilisé (format `NNN_description.sql`). Nommer les nouveaux fichiers à la suite. Convention proposée :

- `NNN+1_audiopro_lifecycle_tables.sql`
- `NNN+2_audiopro_completeness_fn.sql`
- `NNN+3_audiopro_rls.sql`
- `NNN+4_audiopro_migration_existing_claims.sql`

Les 4 fichiers doivent être committés dans le même commit avec message `feat(data): audiopro lifecycle tables + migration des 43 revendicateurs`.

---

## 1. DDL des nouvelles tables

### 1.1 `audiopro_lifecycle`

Fichier : `supabase/migrations/NNN_audiopro_lifecycle_tables.sql`

```sql
-- =====================================================================
-- audiopro_lifecycle — entité canonique du revendicateur (par email)
-- =====================================================================

-- Extensions requises (si pas déjà activées ailleurs)
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- pour gen_random_uuid()

CREATE TABLE audiopro_lifecycle (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext UNIQUE NOT NULL,
  nom              text,
  prenom           text,
  adeli            text,
  rpps             text,

  lifecycle_stage  text NOT NULL DEFAULT 'revendique'
                   CHECK (lifecycle_stage IN
                     ('revendique','approuve','active','engage','premium','churned')),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),

  first_claim_at   timestamptz,
  last_login_at    timestamptz,

  email_unsubscribed_at   timestamptz,
  email_preferences_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  prospect_id      uuid REFERENCES prospects(id) ON DELETE SET NULL,

  -- Marqueur bounce permanent (issu du webhook Resend)
  hard_bounced_at  timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audiopro_lifecycle IS
  'Entité canonique d''un audioprothésiste revendicateur, identifiée par email.';
COMMENT ON COLUMN audiopro_lifecycle.email IS
  'Clé logique primaire. UPSERT par email à chaque nouveau claim.';
COMMENT ON COLUMN audiopro_lifecycle.lifecycle_stage IS
  'Stage machine automatique — séparé du pipeline commercial (prospects.status).';
COMMENT ON COLUMN audiopro_lifecycle.prospect_id IS
  'FK vers prospects si l''audio a été promu en prospect commercial. NULL sinon.';
COMMENT ON COLUMN audiopro_lifecycle.email_preferences_token IS
  'Token public pour la page /email-preferences (pas d''auth requise pour unsub).';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Si le trigger helper existe déjà dans le projet, on skip. Sinon on crée.
-- À valider en regardant si set_updated_at_timestamp existe déjà.

CREATE TRIGGER trg_audiopro_lifecycle_updated_at
  BEFORE UPDATE ON audiopro_lifecycle
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Indexes
CREATE INDEX idx_audiopro_lifecycle_stage
  ON audiopro_lifecycle(lifecycle_stage);

CREATE INDEX idx_audiopro_lifecycle_stage_changed
  ON audiopro_lifecycle(stage_changed_at);

CREATE INDEX idx_audiopro_lifecycle_rpps
  ON audiopro_lifecycle(rpps)
  WHERE rpps IS NOT NULL;

CREATE INDEX idx_audiopro_lifecycle_prospect
  ON audiopro_lifecycle(prospect_id)
  WHERE prospect_id IS NOT NULL;

CREATE INDEX idx_audiopro_lifecycle_unsubscribed
  ON audiopro_lifecycle(email_unsubscribed_at)
  WHERE email_unsubscribed_at IS NOT NULL;
```

### 1.2 `audiopro_centres`

```sql
-- =====================================================================
-- audiopro_centres — liaison N-N audio ↔ centres
-- =====================================================================

CREATE TABLE audiopro_centres (
  audiopro_id uuid NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  centre_id   uuid NOT NULL REFERENCES centres_auditifs(id) ON DELETE CASCADE,
  linked_via  text NOT NULL CHECK (linked_via IN ('claim','manual')),
  linked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (audiopro_id, centre_id)
);

COMMENT ON TABLE audiopro_centres IS
  'Liaison N-N : un audio peut revendiquer plusieurs centres (ex: Anthony = 3 centres).';

CREATE INDEX idx_audiopro_centres_centre
  ON audiopro_centres(centre_id);
```

### 1.3 `audiopro_lifecycle_events`

```sql
-- =====================================================================
-- audiopro_lifecycle_events — historique append-only des transitions
-- =====================================================================

CREATE TABLE audiopro_lifecycle_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id uuid NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  from_stage  text,
  to_stage    text NOT NULL,
  reason      text,
  metadata    jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audiopro_lifecycle_events IS
  'Historique des transitions de lifecycle_stage. Append-only. Alimenté par trigger + API.';
COMMENT ON COLUMN audiopro_lifecycle_events.reason IS
  'Raison métier : claim_submitted, claim_approved, first_login, email_clicked, stripe_paid, stripe_cancelled, manual_override, migration_initiale.';

CREATE INDEX idx_audiopro_events_audiopro
  ON audiopro_lifecycle_events(audiopro_id, occurred_at DESC);

CREATE INDEX idx_audiopro_events_reason
  ON audiopro_lifecycle_events(reason);
```

### 1.4 `email_events`

```sql
-- =====================================================================
-- email_events — journal append-only de tous les emails envoyés
-- =====================================================================

CREATE TABLE email_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id       uuid REFERENCES audiopro_lifecycle(id) ON DELETE SET NULL,
  centre_slug       text,
  recipient_email   citext NOT NULL,
  template_key      text NOT NULL,
  resend_message_id text,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  opened_at         timestamptz,
  clicked_at        timestamptz,
  bounced_at        timestamptz,
  complaint_at      timestamptz,
  trigger           text NOT NULL
                    CHECK (trigger IN ('cron','manual_admin','transactional','webhook_stripe')),
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_events IS
  'Journal de tous les emails envoyés (transactionnels + nurture + manuels). Append-only, pas d''update SAUF sur les champs opened_at/clicked_at/bounced_at via webhook Resend.';
COMMENT ON COLUMN email_events.template_key IS
  'Identifiant du template. Liste en v1 : claim_confirmation, claim_approved, claim_rejected, payment_confirmation, subscription_cancelled, nurture_01_premiers_patients, fiche_incomplete_relance, nurture_02_offre_fondateurs, nurture_03_cas_concret, nurture_04_slots_restants, nurture_05_ads_ou_sortie, premium_welcome.';

CREATE INDEX idx_email_events_audiopro
  ON email_events(audiopro_id, sent_at DESC);

CREATE INDEX idx_email_events_template
  ON email_events(template_key, sent_at DESC);

CREATE INDEX idx_email_events_resend_id
  ON email_events(resend_message_id)
  WHERE resend_message_id IS NOT NULL;

CREATE INDEX idx_email_events_recipient
  ON email_events(recipient_email, sent_at DESC);
```

### 1.5 `feature_flags`

```sql
-- =====================================================================
-- feature_flags — flags de configuration globale (drip, slots, etc.)
-- =====================================================================

CREATE TABLE feature_flags (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE feature_flags IS
  'Flags runtime modifiables sans redeploy (ex: activer/désactiver le drip Fondateurs).';

-- Valeurs initiales
INSERT INTO feature_flags (key, value) VALUES
  ('fondateurs_drip_enabled', 'true'::jsonb),
  ('fondateurs_slots_max',    '20'::jsonb),
  ('email_drip_enabled',      'true'::jsonb);

-- Trigger updated_at (réutilise la fonction définie plus haut)
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
```

---

## 2. Fonctions PostgreSQL

Fichier : `supabase/migrations/NNN+1_audiopro_completeness_fn.sql`

### 2.1 `completeness_pct(centre_id uuid) → integer`

Calcule le pourcentage de complétude d'une fiche centre selon les champs pondérés de `COMPLETENESS_FIELDS` (cf. `src/types/prospect.ts`).

**Règle** : chaque champ pèse 1/7. Renvoie un entier entre 0 et 100.

```sql
CREATE OR REPLACE FUNCTION completeness_pct(p_centre_id uuid) RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_centre centres_auditifs%ROWTYPE;
BEGIN
  SELECT * INTO v_centre FROM centres_auditifs WHERE id = p_centre_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_centre.tel         IS NOT NULL AND v_centre.tel         != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.site_web    IS NOT NULL AND v_centre.site_web    != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.a_propos    IS NOT NULL AND v_centre.a_propos    != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.photo_url   IS NOT NULL AND v_centre.photo_url   != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.email       IS NOT NULL AND v_centre.email       != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.specialites IS NOT NULL AND array_length(v_centre.specialites, 1) > 0 THEN v_count := v_count + 1; END IF;
  IF v_centre.marques     IS NOT NULL AND array_length(v_centre.marques, 1) > 0     THEN v_count := v_count + 1; END IF;

  RETURN ROUND(v_count * 100.0 / 7);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION completeness_pct(uuid) IS
  'Complétude d''une fiche centre sur 7 champs pondérés égaux (COMPLETENESS_FIELDS).';
```

**Note importante pour Claude Code** : vérifier que les noms de colonnes (`tel`, `site_web`, `a_propos`, `photo_url`, `email`, `specialites`, `marques`) correspondent exactement à la table `centres_auditifs`. En cas d'écart, aligner avec la vérité du schéma.

### 2.2 `audiopro_missing_fields(audiopro_id uuid) → table`

Renvoie, pour chaque centre lié à l'audio, la liste des champs manquants. Utilisé par le template `fiche_incomplete_relance`.

```sql
CREATE OR REPLACE FUNCTION audiopro_missing_fields(p_audiopro_id uuid)
RETURNS TABLE (
  centre_id          uuid,
  centre_slug        text,
  centre_nom         text,
  completeness_pct   integer,
  missing_fields     text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    c.nom,
    completeness_pct(c.id),
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.tel         IS NULL OR c.tel         = '' THEN 'tel'         END,
      CASE WHEN c.site_web    IS NULL OR c.site_web    = '' THEN 'site_web'    END,
      CASE WHEN c.a_propos    IS NULL OR c.a_propos    = '' THEN 'a_propos'    END,
      CASE WHEN c.photo_url   IS NULL OR c.photo_url   = '' THEN 'photo_url'   END,
      CASE WHEN c.email       IS NULL OR c.email       = '' THEN 'email'       END,
      CASE WHEN c.specialites IS NULL OR array_length(c.specialites, 1) IS NULL THEN 'specialites' END,
      CASE WHEN c.marques     IS NULL OR array_length(c.marques, 1) IS NULL     THEN 'marques'     END
    ], NULL)
  FROM audiopro_centres ac
  JOIN centres_auditifs c ON c.id = ac.centre_id
  WHERE ac.audiopro_id = p_audiopro_id
  ORDER BY completeness_pct(c.id) ASC;  -- centre le moins complet en premier
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION audiopro_missing_fields(uuid) IS
  'Liste des champs manquants par centre pour un audio. Ordre : centre le moins complet en premier (cible de l''ancrage magic link).';
```

### 2.3 `recompute_audiopro_lifecycle() → void`

Appelée par le cron quotidien **avant** le drip. Recalcule les transitions batch (`approuve → active`, `* → premium`).

Les transitions event-driven (`revendique → approuve`, `active → engage`, `* → churned`) sont faites directement dans les endpoints concernés — pas ici.

```sql
CREATE OR REPLACE FUNCTION recompute_audiopro_lifecycle() RETURNS void AS $$
DECLARE
  v_audiopro RECORD;
  v_max_completeness integer;
BEGIN
  -- Transition * → premium (si au moins un centre lié est premium)
  FOR v_audiopro IN
    SELECT a.id, a.lifecycle_stage
    FROM audiopro_lifecycle a
    WHERE a.lifecycle_stage NOT IN ('premium', 'churned')
      AND EXISTS (
        SELECT 1 FROM audiopro_centres ac
        JOIN centres_auditifs c ON c.id = ac.centre_id
        WHERE ac.audiopro_id = a.id
          AND c.plan = 'premium'
      )
  LOOP
    UPDATE audiopro_lifecycle
    SET lifecycle_stage = 'premium', stage_changed_at = now()
    WHERE id = v_audiopro.id;

    INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason)
    VALUES (v_audiopro.id, v_audiopro.lifecycle_stage, 'premium', 'stripe_paid_batch');
  END LOOP;

  -- Transition approuve → active (si ≥ 1 centre >= 60% complet OU last_login_at set)
  FOR v_audiopro IN
    SELECT a.id, a.last_login_at
    FROM audiopro_lifecycle a
    WHERE a.lifecycle_stage = 'approuve'
  LOOP
    SELECT COALESCE(MAX(completeness_pct(ac.centre_id)), 0)
    INTO v_max_completeness
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = v_audiopro.id;

    IF v_max_completeness >= 60 OR v_audiopro.last_login_at IS NOT NULL THEN
      UPDATE audiopro_lifecycle
      SET lifecycle_stage = 'active', stage_changed_at = now()
      WHERE id = v_audiopro.id;

      INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, metadata)
      VALUES (
        v_audiopro.id, 'approuve', 'active',
        CASE
          WHEN v_audiopro.last_login_at IS NOT NULL THEN 'first_login_detected'
          ELSE 'completeness_threshold_reached'
        END,
        jsonb_build_object('max_completeness_pct', v_max_completeness)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_audiopro_lifecycle() IS
  'Recalcule les transitions batch de lifecycle_stage. Appelée par le cron avant le drip.';
```

---

## 3. Politiques RLS

Fichier : `supabase/migrations/NNN+2_audiopro_rls.sql`

Comportement attendu en Phase 1 :

- **Écriture** : uniquement via `service_role` (endpoints serveur Astro utilisent `createServerClient` avec service role key)
- **Lecture publique** : aucune. Ces tables sont 100% internes.
- **Lecture audio authentifié (espace pro)** : reportée à Phase 2 (quand on câble l'espace pro avec `last_login_at`)

```sql
-- Activer RLS sur les 4 tables sensibles + feature_flags
ALTER TABLE audiopro_lifecycle         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiopro_centres           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiopro_lifecycle_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags              ENABLE ROW LEVEL SECURITY;

-- Pas de policy "public" → par défaut tout est bloqué pour anon et authenticated.
-- Le service_role bypass automatiquement RLS.

-- NOTE Phase 2 : ajouter une policy sur audiopro_lifecycle permettant à
-- l'audio authentifié de lire SA propre ligne (via auth.email()) et sur
-- audiopro_centres pour lire les liens de SES centres.
```

---

## 4. Migration des 43 revendicateurs existants

Fichier : `supabase/migrations/NNN+3_audiopro_migration_existing_claims.sql`

**Règle critique** : ce script est **idempotent** (peut être rejoué sans tout casser) grâce aux `ON CONFLICT` sur les clés primaires.

```sql
-- =====================================================================
-- Migration one-shot : les revendicateurs existants → audiopro_lifecycle
-- =====================================================================

-- Étape 1 : créer une ligne audiopro_lifecycle par email unique
INSERT INTO audiopro_lifecycle (
  email, nom, prenom, adeli, rpps,
  lifecycle_stage, stage_changed_at, first_claim_at, created_at, updated_at
)
SELECT DISTINCT ON (LOWER(claimed_by_email))
  LOWER(claimed_by_email) AS email,
  -- Heuristique nom/prénom : on split sur le premier espace
  -- "Jean Dupont" → prenom="Jean", nom="Dupont"
  -- "Marie Curie-Skłodowska" → prenom="Marie", nom="Curie-Skłodowska"
  -- Franck-Olivier corrigera les cas tordus manuellement via /admin/claims.
  CASE
    WHEN position(' ' IN claimed_by_name) > 0
    THEN substring(claimed_by_name FROM position(' ' IN claimed_by_name) + 1)
    ELSE NULL
  END AS nom,
  CASE
    WHEN position(' ' IN claimed_by_name) > 0
    THEN substring(claimed_by_name FROM 1 FOR position(' ' IN claimed_by_name) - 1)
    ELSE claimed_by_name
  END AS prenom,
  claimed_by_adeli AS adeli,
  -- RPPS : si claimed_by_adeli matche 11 chiffres, on le prend aussi comme RPPS
  CASE WHEN claimed_by_adeli ~ '^\d{11}$' THEN claimed_by_adeli ELSE rpps END AS rpps,
  CASE
    WHEN plan = 'premium' THEN 'premium'
    WHEN claim_status = 'approved' THEN 'approuve'
    WHEN claim_status = 'pending' THEN 'revendique'
    WHEN claim_status = 'rejected' THEN 'revendique'  -- rejeté reste en revendique pour trace
    ELSE 'revendique'
  END AS lifecycle_stage,
  COALESCE(claimed_at, now()) AS stage_changed_at,
  claimed_at AS first_claim_at,
  COALESCE(claimed_at, now()) AS created_at,
  COALESCE(claimed_at, now()) AS updated_at
FROM centres_auditifs
WHERE claimed_by_email IS NOT NULL
  AND TRIM(claimed_by_email) != ''
ORDER BY LOWER(claimed_by_email), claimed_at ASC
ON CONFLICT (email) DO NOTHING;  -- idempotent

-- Étape 2 : lier chaque centre à son audiopro
INSERT INTO audiopro_centres (audiopro_id, centre_id, linked_via, linked_at)
SELECT
  a.id,
  c.id,
  'claim',
  COALESCE(c.claimed_at, now())
FROM centres_auditifs c
JOIN audiopro_lifecycle a ON a.email = LOWER(c.claimed_by_email)
WHERE c.claimed_by_email IS NOT NULL
  AND TRIM(c.claimed_by_email) != ''
ON CONFLICT (audiopro_id, centre_id) DO NOTHING;  -- idempotent

-- Étape 3 : backfill des transitions initiales dans lifecycle_events
INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, occurred_at)
SELECT
  id,
  NULL,
  lifecycle_stage,
  'migration_initiale',
  stage_changed_at
FROM audiopro_lifecycle
WHERE NOT EXISTS (
  SELECT 1 FROM audiopro_lifecycle_events e
  WHERE e.audiopro_id = audiopro_lifecycle.id
    AND e.reason = 'migration_initiale'
);

-- Étape 4 : si le centre est déjà premium, ajouter une transition → premium
-- (car l'étape 1 a pu le mettre en "approuve" avant de voir qu'il était premium)
INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, occurred_at)
SELECT DISTINCT
  a.id,
  'approuve',
  'premium',
  'migration_premium_detected',
  COALESCE(c.premium_since, c.claimed_at, now())
FROM audiopro_lifecycle a
JOIN audiopro_centres ac ON ac.audiopro_id = a.id
JOIN centres_auditifs c ON c.id = ac.centre_id
WHERE c.plan = 'premium'
  AND a.lifecycle_stage = 'premium'
  AND NOT EXISTS (
    SELECT 1 FROM audiopro_lifecycle_events e
    WHERE e.audiopro_id = a.id
      AND e.reason = 'migration_premium_detected'
  );

-- Étape 5 : rapport en fin de script pour vérification
DO $$
DECLARE
  v_audiopros_count integer;
  v_centres_linked  integer;
  v_by_stage        jsonb;
BEGIN
  SELECT COUNT(*) INTO v_audiopros_count FROM audiopro_lifecycle;
  SELECT COUNT(*) INTO v_centres_linked FROM audiopro_centres;
  SELECT jsonb_object_agg(lifecycle_stage, count) INTO v_by_stage
  FROM (
    SELECT lifecycle_stage, COUNT(*) as count
    FROM audiopro_lifecycle
    GROUP BY lifecycle_stage
  ) sub;

  RAISE NOTICE 'Migration audiopro_lifecycle terminée.';
  RAISE NOTICE 'Audiopros créés: %', v_audiopros_count;
  RAISE NOTICE 'Liens centres: %', v_centres_linked;
  RAISE NOTICE 'Distribution par stage: %', v_by_stage;
END $$;
```

**Validation manuelle après exécution** — requêtes de contrôle à lancer :

```sql
-- 1. Compte total audiopros vs emails uniques dans centres_auditifs
SELECT
  (SELECT COUNT(DISTINCT LOWER(claimed_by_email))
   FROM centres_auditifs WHERE claimed_by_email IS NOT NULL) AS emails_uniques,
  (SELECT COUNT(*) FROM audiopro_lifecycle) AS audiopros_crees;
-- → les deux nombres doivent être égaux

-- 2. Distribution des stages
SELECT lifecycle_stage, COUNT(*) FROM audiopro_lifecycle GROUP BY lifecycle_stage;

-- 3. Audiopros avec plus d'1 centre (multi-centres, ex: Anthony)
SELECT a.email, a.prenom, a.nom, COUNT(ac.centre_id) as nb_centres
FROM audiopro_lifecycle a
JOIN audiopro_centres ac ON ac.audiopro_id = a.id
GROUP BY a.id, a.email, a.prenom, a.nom
HAVING COUNT(ac.centre_id) > 1
ORDER BY nb_centres DESC;

-- 4. Cas où le split nom/prenom a foiré (prenom vide ou nom vide)
SELECT email, prenom, nom
FROM audiopro_lifecycle
WHERE prenom IS NULL OR nom IS NULL OR prenom = '' OR nom = '';
```

---

## 5. Types TypeScript

Nouveau fichier : `src/types/audiopro-lifecycle.ts`

```typescript
// Types du pipeline lifecycle audio.
// Correspondance stricte avec supabase/migrations/NNN_audiopro_lifecycle_tables.sql.

export type LifecycleStage =
  | 'revendique'
  | 'approuve'
  | 'active'
  | 'engage'
  | 'premium'
  | 'churned';

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  revendique: 'Revendiqué',
  approuve: 'Approuvé',
  active: 'Actif',
  engage: 'Engagé',
  premium: 'Premium',
  churned: 'Churné',
};

export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
  revendique: 'bg-stone-200 text-stone-800',
  approuve:   'bg-blue-100 text-blue-800',
  active:     'bg-amber-100 text-amber-800',
  engage:     'bg-orange-100 text-orange-800',
  premium:    'bg-emerald-100 text-emerald-800',
  churned:    'bg-red-100 text-red-800',
};

// ─────────────────────────────────────────────────────────────

export type LinkedVia = 'claim' | 'manual';

export interface AudioproLifecycle {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  adeli: string | null;
  rpps: string | null;

  lifecycle_stage: LifecycleStage;
  stage_changed_at: string;          // ISO timestamp

  first_claim_at: string | null;
  last_login_at: string | null;

  email_unsubscribed_at: string | null;
  email_preferences_token: string;   // UUID

  prospect_id: string | null;

  hard_bounced_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface AudioproCentre {
  audiopro_id: string;
  centre_id: string;
  linked_via: LinkedVia;
  linked_at: string;
}

export interface AudioproLifecycleEvent {
  id: string;
  audiopro_id: string;
  from_stage: LifecycleStage | null;
  to_stage: LifecycleStage;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

// ─────────────────────────────────────────────────────────────

export type EmailTemplateKey =
  // Transactionnels existants
  | 'claim_confirmation'
  | 'claim_approved'
  | 'claim_rejected'
  | 'payment_confirmation'
  | 'subscription_cancelled'
  | 'claim_admin_notification'
  | 'payment_admin_notification'
  // Nouveaux templates Phase 1 (seul fiche_incomplete_relance est utilisé en Phase 1)
  | 'fiche_incomplete_relance'
  // Phase 2
  | 'nurture_01_premiers_patients'
  | 'nurture_02_offre_fondateurs'
  | 'nurture_03_cas_concret'
  | 'nurture_04_slots_restants'
  | 'nurture_05_ads_ou_sortie'
  | 'premium_welcome';

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  claim_confirmation:            'Confirmation de revendication',
  claim_approved:                'Validation de la fiche',
  claim_rejected:                'Rejet de la revendication',
  payment_confirmation:          'Confirmation de paiement',
  subscription_cancelled:        'Annulation abonnement',
  claim_admin_notification:      'Notification admin claim',
  payment_admin_notification:    'Notification admin paiement',
  fiche_incomplete_relance:      'Relance complétude de fiche',
  nurture_01_premiers_patients:  'Nurture 01 — Premiers patients',
  nurture_02_offre_fondateurs:   'Nurture 02 — Offre Fondateurs',
  nurture_03_cas_concret:        'Nurture 03 — Étude de cas',
  nurture_04_slots_restants:     'Nurture 04 — Slots restants',
  nurture_05_ads_ou_sortie:      'Nurture 05 — Ads ou sortie',
  premium_welcome:               'Bienvenue Premium',
};

export type EmailTrigger =
  | 'cron'
  | 'manual_admin'
  | 'transactional'
  | 'webhook_stripe';

export interface EmailEvent {
  id: string;
  audiopro_id: string | null;
  centre_slug: string | null;
  recipient_email: string;
  template_key: EmailTemplateKey;
  resend_message_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complaint_at: string | null;
  trigger: EmailTrigger;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────

// Retour de la fonction SQL audiopro_missing_fields()
export interface AudioproMissingField {
  centre_id: string;
  centre_slug: string;
  centre_nom: string;
  completeness_pct: number;
  missing_fields: CompletenessField[];
}

export type CompletenessField =
  | 'tel'
  | 'site_web'
  | 'a_propos'
  | 'photo_url'
  | 'email'
  | 'specialites'
  | 'marques';

export const COMPLETENESS_FIELD_LABELS: Record<CompletenessField, string> = {
  tel: 'Téléphone',
  site_web: 'Site web',
  a_propos: 'Description',
  photo_url: 'Photo',
  email: 'E-mail',
  specialites: 'Spécialités',
  marques: 'Marques',
};

// ─────────────────────────────────────────────────────────────

// Vue agrégée consommée par /admin/claims
// Jointure: audiopro_lifecycle + aggregats centres + last email + prospect status
export interface AudioproListRow {
  audiopro_id: string;
  email: string;
  prenom: string | null;
  nom: string | null;

  lifecycle_stage: LifecycleStage;
  stage_changed_at: string;

  first_claim_at: string | null;

  nb_centres: number;
  completeness_avg: number;                  // 0..100
  claim_status_summary: string;              // ex: "2 approved / 1 pending"

  last_email_template: EmailTemplateKey | null;
  last_email_sent_at: string | null;
  last_email_clicked_at: string | null;
  emails_sent_30d: number;

  prospect_id: string | null;
  prospect_status: string | null;            // cf. ProspectStatus

  email_unsubscribed_at: string | null;
  hard_bounced_at: string | null;
}
```

---

## 6. Helper lib (nouveau fichier)

Nouveau fichier : `src/lib/audiopro-lifecycle.ts`

Helpers côté serveur consommés par les endpoints et les pages admin. Pas de logique business ici, juste des wrappers Supabase typés.

```typescript
// Helpers partagés pour audiopro_lifecycle.
// Consommés par les endpoints /api/claim, /api/admin/*, /api/webhook
// et les pages admin SSR.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AudioproLifecycle,
  AudioproCentre,
  AudioproLifecycleEvent,
  LifecycleStage,
  AudioproMissingField,
  AudioproListRow,
  EmailTemplateKey,
  EmailTrigger,
  EmailEvent,
} from '../types/audiopro-lifecycle';

// ──────────────────────────────────────────────────────────────
// UPSERT audiopro au claim
// ──────────────────────────────────────────────────────────────

interface UpsertAudioproInput {
  email: string;
  nom: string | null;
  prenom: string | null;
  adeli: string | null;
  rpps: string | null;
  centre_id: string;
  first_claim_at: string;
}

/**
 * UPSERT d'un audiopro par email + création de la liaison centre.
 * Renvoie l'id audiopro et un flag `is_new`.
 * Ajoute aussi un lifecycle_event si c'est un nouveau claim ou si c'est
 * la première revendication de cet audio.
 */
export async function upsertAudioproAtClaim(
  supabase: SupabaseClient,
  input: UpsertAudioproInput
): Promise<{ audiopro_id: string; is_new: boolean }> {
  // Upsert sur email (ON CONFLICT DO UPDATE minimum — on ne touche pas au stage si déjà approuve/premium)
  const email = input.email.toLowerCase().trim();

  // 1. Chercher si existe
  const { data: existing } = await supabase
    .from('audiopro_lifecycle')
    .select('id, lifecycle_stage, first_claim_at')
    .eq('email', email)
    .maybeSingle();

  let audiopro_id: string;
  let is_new: boolean;

  if (existing) {
    audiopro_id = existing.id;
    is_new = false;
    // Si l'audio existe déjà, on met éventuellement à jour adeli/rpps/first_claim_at si null
    await supabase
      .from('audiopro_lifecycle')
      .update({
        nom: input.nom,
        prenom: input.prenom,
        adeli: input.adeli,
        rpps: input.rpps,
        first_claim_at: existing.first_claim_at ?? input.first_claim_at,
      })
      .eq('id', audiopro_id);
  } else {
    // Création
    const { data: created, error } = await supabase
      .from('audiopro_lifecycle')
      .insert({
        email,
        nom: input.nom,
        prenom: input.prenom,
        adeli: input.adeli,
        rpps: input.rpps,
        lifecycle_stage: 'revendique',
        first_claim_at: input.first_claim_at,
      })
      .select('id')
      .single();
    if (error || !created) {
      throw new Error(`upsertAudioproAtClaim: insert failed — ${error?.message}`);
    }
    audiopro_id = created.id;
    is_new = true;

    // Event de création
    await supabase.from('audiopro_lifecycle_events').insert({
      audiopro_id,
      from_stage: null,
      to_stage: 'revendique',
      reason: 'claim_submitted',
    });
  }

  // 2. Liaison centre (idempotente)
  await supabase
    .from('audiopro_centres')
    .upsert(
      {
        audiopro_id,
        centre_id: input.centre_id,
        linked_via: 'claim',
        linked_at: new Date().toISOString(),
      },
      { onConflict: 'audiopro_id,centre_id' }
    );

  return { audiopro_id, is_new };
}

// ──────────────────────────────────────────────────────────────
// Transition de stage avec event tracking
// ──────────────────────────────────────────────────────────────

export async function transitionLifecycleStage(
  supabase: SupabaseClient,
  audiopro_id: string,
  to_stage: LifecycleStage,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Lire stage actuel
  const { data: current } = await supabase
    .from('audiopro_lifecycle')
    .select('lifecycle_stage')
    .eq('id', audiopro_id)
    .single();
  if (!current) return;

  if (current.lifecycle_stage === to_stage) return;  // idempotent

  // Update + event
  await supabase
    .from('audiopro_lifecycle')
    .update({ lifecycle_stage: to_stage, stage_changed_at: new Date().toISOString() })
    .eq('id', audiopro_id);

  await supabase.from('audiopro_lifecycle_events').insert({
    audiopro_id,
    from_stage: current.lifecycle_stage,
    to_stage,
    reason,
    metadata: metadata ?? null,
  });
}

// ──────────────────────────────────────────────────────────────
// Log email event
// ──────────────────────────────────────────────────────────────

interface LogEmailEventInput {
  audiopro_id: string | null;
  centre_slug: string | null;
  recipient_email: string;
  template_key: EmailTemplateKey;
  resend_message_id: string | null;
  trigger: EmailTrigger;
  metadata?: Record<string, unknown>;
}

export async function logEmailEvent(
  supabase: SupabaseClient,
  input: LogEmailEventInput
): Promise<void> {
  await supabase.from('email_events').insert({
    audiopro_id: input.audiopro_id,
    centre_slug: input.centre_slug,
    recipient_email: input.recipient_email.toLowerCase(),
    template_key: input.template_key,
    resend_message_id: input.resend_message_id,
    trigger: input.trigger,
    metadata: input.metadata ?? null,
  });
}

// ──────────────────────────────────────────────────────────────
// Fetch des champs manquants (pour templates de relance)
// ──────────────────────────────────────────────────────────────

export async function getAudioproMissingFields(
  supabase: SupabaseClient,
  audiopro_id: string
): Promise<AudioproMissingField[]> {
  const { data, error } = await supabase.rpc('audiopro_missing_fields', {
    p_audiopro_id: audiopro_id,
  });
  if (error) {
    console.error('[getAudioproMissingFields]', error);
    return [];
  }
  return (data ?? []) as AudioproMissingField[];
}

// ──────────────────────────────────────────────────────────────
// Liste refondue /admin/claims — query agrégée
// ──────────────────────────────────────────────────────────────

export interface GetAudioproListOptions {
  stage_filter?: LifecycleStage[];
  has_prospect?: boolean | null;        // null = tous
  completeness_range?: [number, number]; // [min, max] en %
  last_email_days?: number | 'never';    // nb de jours depuis dernier mail, ou 'never'
  search?: string;                       // nom, email, centre
  limit?: number;
  offset?: number;
}

export async function getAudioproList(
  supabase: SupabaseClient,
  opts: GetAudioproListOptions = {}
): Promise<AudioproListRow[]> {
  // Implémentation via RPC custom ou query SQL raw.
  // Recommandation : créer une vue SQL `v_audiopro_list` (voir section 7 ci-dessous)
  // et faire `supabase.from('v_audiopro_list').select(...)` avec filtres client-side
  // pour l'instant. Optimisation full-SQL en v2 si besoin de perf.

  let query = supabase.from('v_audiopro_list').select('*');

  if (opts.stage_filter && opts.stage_filter.length > 0) {
    query = query.in('lifecycle_stage', opts.stage_filter);
  }
  if (opts.has_prospect === true) {
    query = query.not('prospect_id', 'is', null);
  } else if (opts.has_prospect === false) {
    query = query.is('prospect_id', null);
  }
  if (opts.completeness_range) {
    const [min, max] = opts.completeness_range;
    query = query.gte('completeness_avg', min).lte('completeness_avg', max);
  }
  if (opts.search && opts.search.trim()) {
    const s = `%${opts.search.trim()}%`;
    query = query.or(`prenom.ilike.${s},nom.ilike.${s},email.ilike.${s}`);
  }
  query = query.order('first_claim_at', { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) {
    console.error('[getAudioproList]', error);
    return [];
  }
  return (data ?? []) as AudioproListRow[];
}

// ──────────────────────────────────────────────────────────────
// Feature flags helper
// ──────────────────────────────────────────────────────────────

export async function getFeatureFlag<T = unknown>(
  supabase: SupabaseClient,
  key: string,
  defaultValue: T
): Promise<T> {
  const { data } = await supabase
    .from('feature_flags')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value ?? defaultValue) as T;
}

export async function getSlotsFondateursRestants(
  supabase: SupabaseClient
): Promise<number> {
  const max = await getFeatureFlag<number>(supabase, 'fondateurs_slots_max', 20);
  const { count } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('is_fondateur', true)
    .eq('status', 'signe');
  return Math.max(0, max - (count ?? 0));
}
```

---

## 7. Vue SQL `v_audiopro_list`

Fichier : `supabase/migrations/NNN+4_audiopro_list_view.sql`

Vue agrégée consommée par `getAudioproList()` et la page `/admin/claims`. Permet d'éviter des jointures complexes en TypeScript.

```sql
CREATE OR REPLACE VIEW v_audiopro_list AS
SELECT
  a.id AS audiopro_id,
  a.email,
  a.prenom,
  a.nom,
  a.lifecycle_stage,
  a.stage_changed_at,
  a.first_claim_at,
  a.prospect_id,
  a.email_unsubscribed_at,
  a.hard_bounced_at,

  -- Agrégats centres
  (
    SELECT COUNT(*)
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = a.id
  ) AS nb_centres,

  (
    SELECT COALESCE(ROUND(AVG(completeness_pct(ac.centre_id))), 0)::integer
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = a.id
  ) AS completeness_avg,

  -- Résumé claim_status (ex: "2 approved / 1 pending")
  (
    SELECT string_agg(
      count || ' ' || claim_status,
      ' / ' ORDER BY claim_status
    )
    FROM (
      SELECT c.claim_status, COUNT(*) as count
      FROM audiopro_centres ac
      JOIN centres_auditifs c ON c.id = ac.centre_id
      WHERE ac.audiopro_id = a.id
      GROUP BY c.claim_status
    ) grouped
  ) AS claim_status_summary,

  -- Dernier mail envoyé
  (
    SELECT template_key
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY sent_at DESC
    LIMIT 1
  ) AS last_email_template,

  (
    SELECT sent_at
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY sent_at DESC
    LIMIT 1
  ) AS last_email_sent_at,

  (
    SELECT clicked_at
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY sent_at DESC
    LIMIT 1
  ) AS last_email_clicked_at,

  -- Nb emails sur 30j
  (
    SELECT COUNT(*)
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
      AND ee.sent_at >= now() - interval '30 days'
  ) AS emails_sent_30d,

  -- Prospect status (jointure)
  p.status AS prospect_status

FROM audiopro_lifecycle a
LEFT JOIN prospects p ON p.id = a.prospect_id;

COMMENT ON VIEW v_audiopro_list IS
  'Vue agrégée pour /admin/claims. Jointure audiopro + centres + last email + prospect.';
```

---

## 8. Tests et validation

### 8.1 Tests manuels de la migration

Après exécution des 4 fichiers SQL, lancer dans l'ordre :

1. **Vérifier que les tables existent** :
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN (
       'audiopro_lifecycle','audiopro_centres','audiopro_lifecycle_events',
       'email_events','feature_flags'
     );
   ```
   → doit retourner 5 lignes.

2. **Vérifier les feature_flags initiaux** :
   ```sql
   SELECT * FROM feature_flags;
   ```
   → 3 lignes : `fondateurs_drip_enabled`, `fondateurs_slots_max`, `email_drip_enabled`.

3. **Lancer les 4 requêtes de validation de la §4** (rapport migration).

4. **Tester `completeness_pct()`** sur un centre connu :
   ```sql
   SELECT c.slug, c.nom, completeness_pct(c.id)
   FROM centres_auditifs c
   WHERE c.claim_status = 'approved'
   LIMIT 5;
   ```
   → doit renvoyer des entiers 0..100 cohérents.

5. **Tester `audiopro_missing_fields()`** sur un audio connu :
   ```sql
   SELECT * FROM audiopro_missing_fields(
     (SELECT id FROM audiopro_lifecycle LIMIT 1)
   );
   ```

6. **Tester `recompute_audiopro_lifecycle()`** :
   ```sql
   SELECT recompute_audiopro_lifecycle();
   -- Puis vérifier les events récents :
   SELECT * FROM audiopro_lifecycle_events
   WHERE reason IN ('stripe_paid_batch', 'first_login_detected', 'completeness_threshold_reached')
   ORDER BY occurred_at DESC LIMIT 10;
   ```

7. **Tester la vue `v_audiopro_list`** :
   ```sql
   SELECT * FROM v_audiopro_list ORDER BY first_claim_at DESC LIMIT 5;
   ```
   → colonnes complètes avec agrégats.

### 8.2 Script de rollback (en cas de problème)

Fichier séparé **non commité dans migrations** (à garder en local ou dans `scripts/`) :

```sql
-- Rollback Phase 1 — à lancer en cas de désastre
DROP VIEW IF EXISTS v_audiopro_list;
DROP FUNCTION IF EXISTS recompute_audiopro_lifecycle();
DROP FUNCTION IF EXISTS audiopro_missing_fields(uuid);
DROP FUNCTION IF EXISTS completeness_pct(uuid);
DROP TABLE IF EXISTS email_events CASCADE;
DROP TABLE IF EXISTS audiopro_lifecycle_events CASCADE;
DROP TABLE IF EXISTS audiopro_centres CASCADE;
DROP TABLE IF EXISTS audiopro_lifecycle CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
-- (le trigger set_updated_at_timestamp peut rester, il est partagé)
```

---

## Récap : checklist d'exécution Claude Code

- [ ] Identifier le dernier numéro de migration dans `supabase/migrations/`
- [ ] Créer les 4 fichiers de migration dans l'ordre (tables → fonctions → RLS → migration → vue)
- [ ] Créer `src/types/audiopro-lifecycle.ts`
- [ ] Créer `src/lib/audiopro-lifecycle.ts`
- [ ] Appliquer les migrations sur Supabase (CLI : `supabase db push` ou équivalent MCP)
- [ ] Lancer les 7 requêtes de validation §8.1
- [ ] Commit unique : `feat(data): audiopro lifecycle tables + migration des 43 revendicateurs`

**Pas encore implémenté dans ce fichier** (couverts par `specs-phase1-endpoints.md` et `specs-phase1-admin.md`) :
- Modifications de `/api/claim.ts`, `/api/admin/quick-approve`, `/api/webhook.ts`
- Endpoints `/api/admin/relance-email`, `/api/admin/promote-to-prospect`
- Pages admin `/admin/claims` refondue + fiche détail

---

**Fin des specs Phase 1 — Data Layer.**
