-- ============================================================
-- Migration 030 : Vue v_audiopro_list pour /admin/claims
-- Date         : 2026-04-24
-- Specs data   : docs/phase1-email-pipeline/specs-phase1-data.md v1.0 §7
-- ============================================================
-- Vue agrégée consommée par src/lib/audiopro-lifecycle.ts
-- → getAudioproList() et la page /admin/claims (Étape 3).
--
-- Évite les jointures complexes en TypeScript. Calcul à la volée :
--   - nb_centres
--   - completeness_avg (moyenne des completeness_pct)
--   - claim_status_summary (ex: "2 approved / 1 pending")
--   - last_email_template / sent_at / clicked_at
--   - emails_sent_30d
--   - prospect_status (jointure)
--
-- Dépend de completeness_pct() (migration 027) — donc ordre 030 après 027.
-- ============================================================

CREATE OR REPLACE VIEW v_audiopro_list AS
SELECT
  a.id                         AS audiopro_id,
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
    SELECT COALESCE(ROUND(AVG(public.completeness_pct(ac.centre_id))), 0)::INTEGER
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = a.id
  ) AS completeness_avg,

  -- Résumé claim_status agrégé (ex: "2 approved / 1 pending")
  (
    SELECT string_agg(
      count || ' ' || claim_status,
      ' / ' ORDER BY claim_status
    )
    FROM (
      SELECT c.claim_status, COUNT(*) AS count
      FROM audiopro_centres ac
      JOIN centres_auditifs c ON c.id = ac.centre_id
      WHERE ac.audiopro_id = a.id
      GROUP BY c.claim_status
    ) grouped
  ) AS claim_status_summary,

  -- Dernier mail envoyé — template
  (
    SELECT ee.template_key
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY ee.sent_at DESC
    LIMIT 1
  ) AS last_email_template,

  -- Dernier mail envoyé — date
  (
    SELECT ee.sent_at
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY ee.sent_at DESC
    LIMIT 1
  ) AS last_email_sent_at,

  -- Dernier mail envoyé — flag cliqué
  (
    SELECT ee.clicked_at
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
    ORDER BY ee.sent_at DESC
    LIMIT 1
  ) AS last_email_clicked_at,

  -- Nb emails sur 30 jours glissants
  (
    SELECT COUNT(*)
    FROM email_events ee
    WHERE ee.audiopro_id = a.id
      AND ee.sent_at >= NOW() - INTERVAL '30 days'
  ) AS emails_sent_30d,

  -- Prospect status (jointure)
  p.status AS prospect_status

FROM audiopro_lifecycle a
LEFT JOIN prospects p ON p.id = a.prospect_id;

COMMENT ON VIEW v_audiopro_list IS
  'Vue agrégée pour /admin/claims — ligne par audio avec agrégats centres + last email + prospect.';

-- ============================================================
-- Fin migration 030
-- ============================================================
