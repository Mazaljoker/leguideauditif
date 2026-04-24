/**
 * Helpers serveur pour le pipeline lifecycle audio.
 *
 * Consommés par :
 *   - /api/claim (sync au moment du claim)
 *   - /api/admin/quick-approve, /api/admin/quick-reject (transitions)
 *   - /api/webhook (Stripe — transitions premium/churned)
 *   - /api/admin/relance-email, /api/admin/promote-to-prospect (Phase 1)
 *   - Page admin SSR /admin/claims (getAudioproList)
 *
 * Tous les helpers attendent un SupabaseClient en service_role
 * (createServerClient() dans src/lib/supabase.ts).
 *
 * Docs : docs/phase1-email-pipeline/specs-phase1-data.md §6
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LifecycleStage,
  AudioproMissingField,
  AudioproListRow,
  EmailTemplateKey,
  EmailTrigger,
} from '../types/audiopro-lifecycle';

// ──────────────────────────────────────────────────────────────
// UPSERT audiopro au claim
// ──────────────────────────────────────────────────────────────

interface UpsertAudioproInput {
  email: string;
  nom: string | null;
  prenom: string | null;
  adeli: string | null;
  /**
   * RPPS détecté au niveau applicatif. En Phase 1, on passe NULL sauf si
   * l'appelant a déjà vérifié que l'ADELI saisi matche `^\d{11}$`.
   * Le helper ne refait pas la regex — c'est la responsabilité du caller
   * (cf. /api/claim en Étape 2).
   */
  rpps: string | null;
  centre_id: string;
  first_claim_at: string;
}

/**
 * UPSERT d'un audiopro par email + création idempotente de la liaison centre.
 *
 * Règles :
 *  - Si l'audio existe déjà : on met à jour nom/prenom/adeli/rpps si fournis,
 *    on préserve `first_claim_at` existant, on NE TOUCHE PAS au `lifecycle_stage`
 *    (un audio déjà approuve/premium qui re-claim un autre centre reste à son stage).
 *  - Si nouveau : création en stage='revendique' + event `claim_submitted`.
 *  - La liaison `audiopro_centres` est upsertée (onConflict PK composée).
 *
 * @returns `{ audiopro_id, is_new }`. `is_new=true` = audio créé dans ce call.
 */
export async function upsertAudioproAtClaim(
  supabase: SupabaseClient,
  input: UpsertAudioproInput,
): Promise<{ audiopro_id: string; is_new: boolean }> {
  const email = input.email.toLowerCase().trim();

  // 1. Lookup existant
  const { data: existing } = await supabase
    .from('audiopro_lifecycle')
    .select('id, first_claim_at')
    .eq('email', email)
    .maybeSingle();

  let audiopro_id: string;
  let is_new: boolean;

  if (existing) {
    audiopro_id = existing.id;
    is_new = false;
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
      throw new Error(`upsertAudioproAtClaim: insert failed — ${error?.message ?? 'no data'}`);
    }
    audiopro_id = created.id;
    is_new = true;

    await supabase.from('audiopro_lifecycle_events').insert({
      audiopro_id,
      from_stage: null,
      to_stage: 'revendique',
      reason: 'claim_submitted',
    });
  }

  // 2. Liaison centre — idempotent sur la PK composée
  await supabase
    .from('audiopro_centres')
    .upsert(
      {
        audiopro_id,
        centre_id: input.centre_id,
        linked_via: 'claim',
        linked_at: new Date().toISOString(),
      },
      { onConflict: 'audiopro_id,centre_id' },
    );

  return { audiopro_id, is_new };
}

// ──────────────────────────────────────────────────────────────
// Transition de stage + event
// ──────────────────────────────────────────────────────────────

/**
 * Applique une transition de lifecycle_stage + log l'event associé.
 *
 * Idempotent : si le stage courant est déjà `to_stage`, no-op.
 * Ne fait AUCUN check de progression (caller responsable — cf. quick-approve
 * qui vérifie que currentIdx < approvedIdx avant d'appeler).
 */
export async function transitionLifecycleStage(
  supabase: SupabaseClient,
  audiopro_id: string,
  to_stage: LifecycleStage,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { data: current } = await supabase
    .from('audiopro_lifecycle')
    .select('lifecycle_stage')
    .eq('id', audiopro_id)
    .single();

  if (!current) return;
  if (current.lifecycle_stage === to_stage) return;

  await supabase
    .from('audiopro_lifecycle')
    .update({
      lifecycle_stage: to_stage,
      stage_changed_at: new Date().toISOString(),
    })
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
// Log d'un email_event
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

/**
 * Insère une ligne dans email_events.
 *
 * **Non bloquant côté caller** — les appelants doivent wrapper en try/catch
 * et logger en `console.error` sans faire échouer la requête utilisateur
 * (règle rappelée dans specs-phase1-endpoints §1.1).
 */
export async function logEmailEvent(
  supabase: SupabaseClient,
  input: LogEmailEventInput,
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
// Fetch des champs manquants (pour fiche_incomplete_relance)
// ──────────────────────────────────────────────────────────────

/**
 * Appelle la fonction SQL `audiopro_missing_fields(p_audiopro_id)`.
 * Retour ordonné : centre le moins complet en premier (cible magic link).
 */
export async function getAudioproMissingFields(
  supabase: SupabaseClient,
  audiopro_id: string,
): Promise<AudioproMissingField[]> {
  const { data, error } = await supabase.rpc('audiopro_missing_fields', {
    p_audiopro_id: audiopro_id,
  });
  if (error) {
    console.error('[getAudioproMissingFields]', error.message);
    return [];
  }
  return (data ?? []) as AudioproMissingField[];
}

// ──────────────────────────────────────────────────────────────
// Liste agrégée /admin/claims
// ──────────────────────────────────────────────────────────────

export interface GetAudioproListOptions {
  stage_filter?: LifecycleStage[];
  /** `true` = avec prospect lié, `false` = sans, `null`/absent = tous */
  has_prospect?: boolean | null;
  /** [min, max] en % */
  completeness_range?: [number, number];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lit `v_audiopro_list` (vue SQL migration 030) avec filtres.
 * Pagination classique via limit/offset, tri par `first_claim_at` desc.
 */
export async function getAudioproList(
  supabase: SupabaseClient,
  opts: GetAudioproListOptions = {},
): Promise<AudioproListRow[]> {
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

  query = query.order('first_claim_at', { ascending: false, nullsFirst: false });

  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    console.error('[getAudioproList]', error.message);
    return [];
  }
  return (data ?? []) as AudioproListRow[];
}

// ──────────────────────────────────────────────────────────────
// Feature flags
// ──────────────────────────────────────────────────────────────

/**
 * Lit un flag runtime. La colonne `value` est JSONB — la valeur
 * est désérialisée automatiquement côté Supabase.
 */
export async function getFeatureFlag<T = unknown>(
  supabase: SupabaseClient,
  key: string,
  defaultValue: T,
): Promise<T> {
  const { data } = await supabase
    .from('feature_flags')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value ?? defaultValue) as T;
}

/**
 * Calcule les places restantes dans le programme Fondateurs.
 * Règle : 20 places max (overridable via feature_flag `fondateurs_slots_max`)
 * moins le nombre de prospects signés avec `is_fondateur=true`.
 *
 * Référence : PRD §7.3 — utilisé par le drip cron (Phase 2) et par
 * le bouton Relance manuelle (templates nurture_02 / nurture_04).
 */
export async function getSlotsFondateursRestants(
  supabase: SupabaseClient,
): Promise<number> {
  const max = await getFeatureFlag<number>(supabase, 'fondateurs_slots_max', 20);
  const { count } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('is_fondateur', true)
    .eq('status', 'signe');
  return Math.max(0, max - (count ?? 0));
}
