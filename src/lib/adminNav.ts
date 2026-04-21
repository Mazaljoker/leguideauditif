// adminNav — compteurs d'urgences pour la topbar admin partagée (Phase 7).
// 3 requêtes parallèles, count:'exact'+head:true (pas de rows transférées).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminNavCounts {
  prospectsUrgent: number;
  contactsUrgent: number;
  claimsUrgent: number;
}

export async function getAdminNavCounts(
  supabase: SupabaseClient
): Promise<AdminNavCounts> {
  // "Demain 00:00 Europe/Paris" approximé par le fuseau local (cohérent avec §6.8 PRD :
  // pas de lib TZ, décalage 1-2h max toléré sur un indicateur d'urgence).
  const now = new Date();
  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const tomorrowIso = tomorrowStart.toISOString();

  const [prospectsRes, contactsRes, claimsRes] = await Promise.all([
    // Prospects urgents : next_action_at < demain 00:00 AND status pas signé/perdu
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .lt('next_action_at', tomorrowIso)
      .not('status', 'in', '(signe,perdu)'),

    // Contacts chauds pas encore convertis
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('archived', false)
      .is('converted_to_prospect_id', null)
      .in('waalaxy_state', ['interested', 'replied']),

    // Claims en attente
    supabase
      .from('centres_auditifs')
      .select('id', { count: 'exact', head: true })
      .eq('claim_status', 'pending'),
  ]);

  return {
    prospectsUrgent: prospectsRes.count ?? 0,
    contactsUrgent: contactsRes.count ?? 0,
    claimsUrgent: claimsRes.count ?? 0,
  };
}
