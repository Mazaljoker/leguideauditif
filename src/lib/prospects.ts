// Helpers partagés pour /admin/prospects.
// Consommés par la page SSR (prospects.astro) et les endpoints API.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Prospect,
  ProspectStats,
  ProspectStatus,
  ProspectSource,
} from '../types/prospect';
import { FONDATEUR_SLOTS_MAX } from '../types/prospect';

export async function getProspects(supabase: SupabaseClient): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[getProspects]', error);
    return [];
  }
  return (data as Prospect[]) ?? [];
}

export function buildStats(prospects: Prospect[]): ProspectStats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Lundi de la semaine en cours (semaine ISO : lundi premier jour)
  const dayOfWeek = todayStart.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayStart = new Date(todayStart.getTime() - daysSinceMonday * 86400000);
  const nextMondayStart = new Date(mondayStart.getTime() + 7 * 86400000);

  const pipelineActif = prospects.filter(
    (p) => p.status !== 'signe' && p.status !== 'perdu'
  ).length;

  const pipelineActifThisMonth = prospects.filter((p) => {
    if (p.status === 'signe' || p.status === 'perdu') return false;
    return new Date(p.created_at) >= firstOfMonth;
  }).length;

  const rdvThisWeek = prospects.filter((p) => {
    if (p.status !== 'rdv' || !p.next_action_at) return false;
    const d = new Date(p.next_action_at);
    return d >= mondayStart && d < nextMondayStart;
  }).length;

  const rdvToday = prospects.filter((p) => {
    if (!p.next_action_at) return false;
    const d = new Date(p.next_action_at);
    return d >= todayStart && d < tomorrowStart;
  }).length;

  const propositions = prospects.filter((p) => p.status === 'proposition').length;

  const propositionsMrrTotal = prospects
    .filter((p) => p.status === 'proposition' && p.mrr_potentiel != null)
    .reduce((sum, p) => sum + Number(p.mrr_potentiel), 0);

  const fondateurSlotsUsed = prospects.filter(
    (p) => p.is_fondateur && p.status === 'signe'
  ).length;

  return {
    pipelineActif,
    pipelineActifThisMonth,
    rdvThisWeek,
    rdvToday,
    propositions,
    propositionsMrrTotal,
    fondateurSlotsUsed,
    fondateurSlotsMax: FONDATEUR_SLOTS_MAX,
  };
}

export function formatEuros(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================
// Validation (Phase 2 : pas de zod, validation manuelle)
// ============================================================

const VALID_STATUSES: ProspectStatus[] = [
  'prospect', 'contacte', 'rdv', 'proposition', 'signe', 'perdu',
];
const VALID_SOURCES: ProspectSource[] = ['linkedin', 'rpps', 'entrant', 'autre'];
const UUID_RE = /^[0-9a-f-]{36}$/i;

export interface ProspectInput {
  name?: string;
  company?: string | null;
  centres_count?: number;
  city?: string | null;
  cp?: string | null;
  departement?: string | null;
  centre_id?: string | null;
  status?: ProspectStatus;
  source?: ProspectSource;
  is_fondateur?: boolean;
  next_action?: string | null;
  next_action_at?: string | null;
  mrr_potentiel?: number | null;
  notes?: string | null;
}

type ValidationResult =
  | { ok: true; data: ProspectInput }
  | { ok: false; error: string };

export function validateProspectInput(
  body: unknown,
  opts: { requireName: boolean }
): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalide' };
  }
  const b = body as Record<string, unknown>;
  const data: ProspectInput = {};

  // name
  if (opts.requireName) {
    if (typeof b.name !== 'string' || b.name.trim().length === 0) {
      return { ok: false, error: 'Nom requis' };
    }
    data.name = b.name.trim().slice(0, 200);
  } else if (b.name !== undefined) {
    if (typeof b.name !== 'string' || b.name.trim().length === 0) {
      return { ok: false, error: 'Nom vide' };
    }
    data.name = b.name.trim().slice(0, 200);
  }

  // text nullables
  const textKeys = ['company', 'city', 'cp', 'departement', 'next_action', 'notes'] as const;
  for (const key of textKeys) {
    if (b[key] === undefined) continue;
    if (b[key] === null) {
      data[key] = null;
      continue;
    }
    if (typeof b[key] !== 'string') return { ok: false, error: `${key} invalide` };
    const v = (b[key] as string).trim();
    data[key] = v.length === 0 ? null : v.slice(0, 5000);
  }

  // centres_count
  if (b.centres_count !== undefined) {
    const n = Number(b.centres_count);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: 'centres_count doit être >= 1' };
    data.centres_count = n;
  }

  // status
  if (b.status !== undefined) {
    if (!VALID_STATUSES.includes(b.status as ProspectStatus)) {
      return { ok: false, error: 'Statut invalide' };
    }
    data.status = b.status as ProspectStatus;
  }

  // source
  if (b.source !== undefined) {
    if (!VALID_SOURCES.includes(b.source as ProspectSource)) {
      return { ok: false, error: 'Source invalide' };
    }
    data.source = b.source as ProspectSource;
  }

  // is_fondateur
  if (b.is_fondateur !== undefined) {
    if (typeof b.is_fondateur !== 'boolean') {
      return { ok: false, error: 'is_fondateur doit être booléen' };
    }
    data.is_fondateur = b.is_fondateur;
  }

  // next_action_at
  if (b.next_action_at !== undefined) {
    if (b.next_action_at === null || b.next_action_at === '') {
      data.next_action_at = null;
    } else if (typeof b.next_action_at === 'string') {
      const d = new Date(b.next_action_at);
      if (isNaN(d.getTime())) return { ok: false, error: 'next_action_at invalide' };
      data.next_action_at = d.toISOString();
    } else {
      return { ok: false, error: 'next_action_at invalide' };
    }
  }

  // mrr_potentiel
  if (b.mrr_potentiel !== undefined) {
    if (b.mrr_potentiel === null || b.mrr_potentiel === '') {
      data.mrr_potentiel = null;
    } else {
      const n = Number(b.mrr_potentiel);
      if (!isFinite(n) || n < 0) return { ok: false, error: 'mrr_potentiel doit être >= 0' };
      data.mrr_potentiel = n;
    }
  }

  // centre_id UUID
  if (b.centre_id !== undefined) {
    if (b.centre_id === null || b.centre_id === '') {
      data.centre_id = null;
    } else if (typeof b.centre_id === 'string' && UUID_RE.test(b.centre_id)) {
      data.centre_id = b.centre_id;
    } else {
      return { ok: false, error: 'centre_id UUID invalide' };
    }
  }

  return { ok: true, data };
}

export function isValidUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s);
}
