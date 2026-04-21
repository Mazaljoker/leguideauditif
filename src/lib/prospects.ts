// Helpers partagés pour /admin/prospects.
// Consommés par la page SSR (prospects.astro) et les endpoints API.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Prospect, ProspectStats } from '../types/prospect';
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
