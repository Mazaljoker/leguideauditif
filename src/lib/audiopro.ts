// Helpers serveur pour l'espace pro /audioprothesiste-pro/.
// Encapsule la résolution des centres possédés par un user et
// la sélection du centre actif (cookie lga_centre_slug).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CentreData, CentrePlan } from '../types/centre';
import type { DashboardState } from '../types/audiopro';
import type { CentreAudio } from '../types/centre-team';

export const ACTIVE_CENTRE_COOKIE = 'lga_centre_slug';
export const ACTIVE_CENTRE_MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

// Seuil à partir duquel un pro Premium bascule en dashboard "Réseau".
// Cas Anthony Athuil = 3 centres ; garder 3 pour qu'il rende le dashboard
// agrégé. À monter si le produit évolue.
export const RESEAU_MIN_FICHES = 3;

// Offre Fondateur : 20 places à vie. Le compteur est géré en constante
// tant qu'il n'y a pas de workflow paiement en DB (Phase 2). Franck-Olivier
// bump FONDATEUR_SLOTS_TAKEN par PR à chaque signature.
export const FONDATEUR_SLOTS_TOTAL = 20;
export const FONDATEUR_SLOTS_TAKEN = 6;

/**
 * Résout l'état de dashboard à afficher.
 *
 * La présentation suit le **centre actif** (celui sélectionné dans
 * CentreSwitcher), pas l'agrégat du portefeuille. Motivation : un audio
 * multi-centres avec 1 Premium + 2 Claimed doit voir les CTA d'upsell
 * quand il pilote un centre Claimed, et le dashboard Premium quand il
 * pilote son centre Premium.
 *
 *   - onboarding       : aucun centre approved (géré en amont via redirect)
 *   - revendicateur    : le centre actif n'est pas Premium
 *   - reseau           : centre actif Premium + au moins RESEAU_MIN_FICHES
 *                        centres dans le portefeuille, tous Premium
 *   - premium_solo     : centre actif Premium hors conditions Réseau
 */
export function resolveDashboardState(
  active: { plan: CentrePlan } | null,
  allCentres: { plan: CentrePlan }[],
): DashboardState {
  if (!active || allCentres.length === 0) return 'onboarding';
  if (active.plan !== 'premium') return 'revendicateur';
  const allPremium = allCentres.every((c) => c.plan === 'premium');
  if (allPremium && allCentres.length >= RESEAU_MIN_FICHES) return 'reseau';
  return 'premium_solo';
}

export interface UserCentre {
  id: string;
  slug: string;
  nom: string;
  ville: string | null;
  cp: string | null;
  plan: CentrePlan;
  is_primary: boolean;
  is_premium: boolean;
}

/**
 * Liste les centres claimed approved d'un user via la RPC
 * get_user_centres (migration 021). Retourne [] si erreur
 * ou si aucun centre trouvé — jamais null pour simplifier
 * les appelants.
 */
export async function getUserCentres(
  supabase: SupabaseClient,
  email: string,
): Promise<UserCentre[]> {
  const { data, error } = await supabase.rpc('get_user_centres', {
    p_email: email,
  });
  if (error) {
    console.error('[audiopro] get_user_centres error', error.message);
    return [];
  }
  return (data ?? []) as UserCentre[];
}

/**
 * Résout le centre actif depuis la liste + le cookie :
 *   1. Cookie `lga_centre_slug` si valide (présent dans la liste)
 *   2. Sinon le centre is_primary
 *   3. Sinon le premier de la liste
 *   4. null si la liste est vide
 */
export function resolveActiveCentre(
  centres: UserCentre[],
  cookieSlug: string | undefined,
): UserCentre | null {
  if (!centres.length) return null;
  if (cookieSlug) {
    const match = centres.find((c) => c.slug === cookieSlug);
    if (match) return match;
  }
  return centres.find((c) => c.is_primary) ?? centres[0];
}

/**
 * Charge la fiche complète du centre actif (pour l'édition).
 * Retourne null si introuvable ou si l'user n'en est pas owner.
 */
export async function getActiveCentreFull(
  supabase: SupabaseClient,
  slug: string,
  userEmail: string,
): Promise<CentreData | null> {
  const { data, error } = await supabase
    .from('centres_auditifs')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;

  const centre = data as unknown as CentreData;
  const ownerEmail = (centre.claimed_by_email ?? '').trim().toLowerCase();
  if (
    ownerEmail !== userEmail.trim().toLowerCase() ||
    centre.claim_status !== 'approved'
  ) {
    return null;
  }
  return centre;
}

// ------------------------------------------------------------
// Leads (demandes de bilan reçues par un pro)
// ------------------------------------------------------------

export interface UserLead {
  id: string;
  first_name: string;
  phone: string;
  zip_code: string;
  hearing_loss_type: string | null;
  status: string | null;
  created_at: string;
  read_at: string | null;
  centre_slug: string;
  centre_nom: string;
}

export interface UserLeadCounts {
  total: number;
  unread: number;
  last_7d: number;
  last_30d: number;
}

export interface GetUserLeadsOptions {
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
  centreSlug?: string | null;
}

/**
 * Liste paginée des leads reçus par l'ensemble des centres claimed
 * d'un pro, via la RPC get_user_leads (migration 022).
 */
export async function getUserLeads(
  supabase: SupabaseClient,
  email: string,
  opts: GetUserLeadsOptions = {},
): Promise<UserLead[]> {
  const { limit = 20, offset = 0, onlyUnread = false, centreSlug = null } = opts;
  const { data, error } = await supabase.rpc('get_user_leads', {
    p_email: email,
    p_limit: limit,
    p_offset: offset,
    p_only_unread: onlyUnread,
    p_centre_slug: centreSlug,
  });
  if (error) {
    console.error('[audiopro] get_user_leads error', error.message);
    return [];
  }
  return (data ?? []) as UserLead[];
}

/**
 * Compteurs (total, non lus, 7j, 30j) via RPC count_user_leads.
 */
export async function countUserLeads(
  supabase: SupabaseClient,
  email: string,
  centreSlug: string | null = null,
): Promise<UserLeadCounts> {
  const { data, error } = await supabase.rpc('count_user_leads', {
    p_email: email,
    p_centre_slug: centreSlug,
  });
  if (error || !data || data.length === 0) {
    if (error) console.error('[audiopro] count_user_leads error', error.message);
    return { total: 0, unread: 0, last_7d: 0, last_30d: 0 };
  }
  const row = data[0] as {
    total: number | string;
    unread: number | string;
    last_7d: number | string;
    last_30d: number | string;
  };
  return {
    total: Number(row.total) || 0,
    unread: Number(row.unread) || 0,
    last_7d: Number(row.last_7d) || 0,
    last_30d: Number(row.last_30d) || 0,
  };
}

/**
 * Équipe audios d'un centre (Premium only). Lue depuis la table
 * centre_audios, ordonnée par ordre croissant (titulaire en tête
 * à ordre=0). Retourne [] si aucune entrée ou erreur.
 */
export async function getCentreTeam(
  supabase: SupabaseClient,
  centreId: string,
): Promise<CentreAudio[]> {
  const { data, error } = await supabase
    .from('centre_audios')
    .select('*')
    .eq('centre_id', centreId)
    .order('ordre', { ascending: true });
  if (error) {
    console.error('[audiopro] getCentreTeam error', error.message);
    return [];
  }
  return (data ?? []) as CentreAudio[];
}

/**
 * Calcul de complétude identique à CentreCompleteness.astro.
 * Renvoie un pourcentage 0-100 (plan rpps forcé à 15).
 */
export function computeCompleteness(centre: CentreData): number {
  if (centre.plan === 'rpps') return 15;
  const fields = [
    !!centre.tel,
    !!centre.horaires,
    !!centre.site_web,
    !!centre.photo_url,
    centre.specialites.length > 0,
    centre.marques.length > 0,
    !!centre.a_propos,
    !!centre.email,
    !!(centre.reseaux_sociaux && Object.keys(centre.reseaux_sociaux).length > 0),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
