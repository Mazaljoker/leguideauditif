// adminNav — compteurs d'urgences pour la topbar admin partagée.
// Phase 7 : prospects/contacts/claims. Phase 8 : ajout tasksUrgent + bascule
// prospectsUrgent sur la table tasks (source de vérité unifiée).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminNavCounts {
  prospectsUrgent: number;
  contactsUrgent: number;
  claimsUrgent: number;
  tasksUrgent: number;
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

  const [prospectsRes, contactsRes, claimsRes, tasksRes] = await Promise.all([
    // Prospects urgents : compte les tâches open overdue/today attachées à un prospect.
    // Note : compte les TÂCHES, pas les prospects uniques. Si Anthony a 3 tâches overdue,
    // il compte pour 3. Acceptable V1 (même esprit : "X choses à faire côté prospects").
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('owner_type', 'prospect')
      .eq('status', 'open')
      .lt('due_at', tomorrowIso),

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

    // Tâches urgentes globales (tous owners + libres)
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .lt('due_at', tomorrowIso),
  ]);

  return {
    prospectsUrgent: prospectsRes.count ?? 0,
    contactsUrgent: contactsRes.count ?? 0,
    claimsUrgent: claimsRes.count ?? 0,
    tasksUrgent: tasksRes.count ?? 0,
  };
}
