// Types partagés pour le CRM admin /admin/prospects.
// Correspondance stricte avec supabase/migrations/012_prospects.sql.
// Voir Docs/prd-admin-prospects.md §3 (schema) + §6 (comportements).

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
  | 'status_change';

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
};

export const FONDATEUR_SLOTS_MAX = 20;
