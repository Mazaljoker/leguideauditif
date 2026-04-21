// Types partagés pour le CRM admin /admin/prospects.
// Correspondance stricte avec supabase/migrations/012_prospects.sql + 013_prospect_extended.sql.

export type ProspectStatus =
  | 'prospect'
  | 'contacte'
  | 'rdv'
  | 'proposition'
  | 'signe'
  | 'perdu';

export type ProspectSource =
  | 'linkedin'
  | 'rpps'
  | 'entrant'
  | 'autre';

export type InteractionKind =
  | 'dm'
  | 'call'
  | 'email'
  | 'note'
  | 'meeting'
  | 'status_change'
  | 'transcript_meet'
  | 'transcript_call';

export interface Prospect {
  id: string;
  name: string;
  company: string | null;
  centres_count: number;
  city: string | null;
  cp: string | null;
  departement: string | null;
  centre_id: string | null;
  status: ProspectStatus;
  source: ProspectSource;
  is_fondateur: boolean;
  next_action: string | null;
  next_action_at: string | null;
  mrr_potentiel: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  prospect_id: string;
  kind: InteractionKind;
  content: string;
  occurred_at: string;
  created_at: string;
  rank?: number;
}

export interface ProspectCentre {
  prospect_id: string;
  centre_id: string;
  is_primary: boolean;
  linked_at: string;
  linked_via: 'manual' | 'auto_claim';
}

export interface CentreAuditif {
  id: string;
  slug: string;
  nom: string;
  enseigne: string | null;
  raison_sociale: string | null;
  adresse: string | null;
  cp: string | null;
  ville: string | null;
  departement: string | null;
  tel: string | null;
  email: string | null;
  site_web: string | null;
  siret: string | null;
  finess: string | null;
  audio_nom: string | null;
  audio_prenom: string | null;
  photo_url: string | null;
  a_propos: string | null;
  specialites: string[] | null;
  marques: string[] | null;
  plan: 'rpps' | 'claimed' | 'premium';
  claim_status: 'none' | 'pending' | 'approved' | 'rejected';
  claimed_by_email: string | null;
  claimed_by_adeli: string | null;
}

export interface LinkedCentre extends CentreAuditif {
  is_primary: boolean;
  linked_via: 'manual' | 'auto_claim';
  linked_at: string;
  completeness_pct: number;
}

// Shape simplifié retourné par /centres/search (autocomplete)
export interface CentreSearchResult {
  id: string;
  slug: string;
  nom: string;
  ville: string | null;
  cp: string | null;
  departement: string | null;
  audio_nom: string | null;
  audio_prenom: string | null;
}

export interface ProspectStats {
  pipelineActif: number;
  pipelineActifThisMonth: number;
  rdvThisWeek: number;
  rdvToday: number;
  propositions: number;
  propositionsMrrTotal: number;
  fondateurSlotsUsed: number;
  fondateurSlotsMax: number;
}

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  prospect: 'Prospect',
  contacte: 'Contacté',
  rdv: 'RDV planifié',
  proposition: 'Proposition',
  signe: 'Signé',
  perdu: 'Perdu',
};

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  linkedin: 'LinkedIn',
  rpps: 'RPPS',
  entrant: 'Entrant',
  autre: 'Autre',
};

export const INTERACTION_KIND_LABELS: Record<InteractionKind, string> = {
  dm: 'DM',
  call: 'Appel',
  email: 'E-mail',
  note: 'Note',
  meeting: 'RDV',
  status_change: 'Changement de statut',
  transcript_meet: 'Transcript Meet',
  transcript_call: 'Transcript appel',
};

export const FONDATEUR_SLOTS_MAX = 20;

// ============================================================
// Phase 6 : Contacts importés (Waalaxy, LinkedIn, etc.)
// ============================================================

export type WaalaxyState =
  | 'interested'
  | 'replied'
  | 'later_interested'
  | 'not_interested'
  | 'connected';

export type ImportSource = 'waalaxy' | 'linkedin' | 'manual' | 'other';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: 'male' | 'female' | 'other' | null;

  job_title: string | null;
  occupation: string | null;
  company_name: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;

  location: string | null;
  country: string | null;

  linkedin_url: string | null;
  linkedin_email: string | null;
  pro_email: string | null;
  phone_numbers: string | null;
  profile_picture_url: string | null;

  waalaxy_state: WaalaxyState | null;
  waalaxy_prospect_list: string | null;
  waalaxy_message_sent: boolean;
  waalaxy_message_replied: boolean;
  waalaxy_last_reply_content: string | null;
  waalaxy_last_reply_date: string | null;
  waalaxy_connected_at: string | null;

  source_import: ImportSource;
  first_imported_at: string;
  last_imported_at: string;

  converted_to_prospect_id: string | null;
  converted_at: string | null;

  archived: boolean;

  created_at: string;
  updated_at: string;
}

export const WAALAXY_STATE_LABELS: Record<WaalaxyState, string> = {
  interested: 'Intéressé',
  replied: 'A répondu',
  later_interested: 'Intéressé plus tard',
  not_interested: 'Non intéressé',
  connected: 'Connecté',
};

// Champs pondérés pour le calcul de complétude d'une fiche centre
// (utilisé par /centres/list pour calculer completeness_pct)
export const COMPLETENESS_FIELDS: Array<keyof CentreAuditif> = [
  'tel', 'site_web', 'a_propos', 'photo_url', 'specialites', 'marques', 'email',
];
