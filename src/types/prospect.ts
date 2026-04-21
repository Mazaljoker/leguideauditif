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

// Champs pondérés pour le calcul de complétude d'une fiche centre
// (utilisé par /centres/list pour calculer completeness_pct)
export const COMPLETENESS_FIELDS: Array<keyof CentreAuditif> = [
  'tel', 'site_web', 'a_propos', 'photo_url', 'specialites', 'marques', 'email',
];
