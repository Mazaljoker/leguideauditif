// Helpers tasks — enrichissement owners, fetch initial, calcul récurrence.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task, TaskWithOwner, TaskRecurrenceKind } from '../types/task';

/**
 * Enrichit une liste de tâches avec les labels/slugs des owners.
 * Ne fait PAS de N+1 : 3 requêtes max (prospects, contacts, centres) filtrées par IN.
 */
export async function enrichTasksWithOwners(
  supabase: SupabaseClient,
  tasks: Task[]
): Promise<TaskWithOwner[]> {
  if (tasks.length === 0) return [];

  const prospectIds = [
    ...new Set(
      tasks.filter((t) => t.owner_type === 'prospect' && t.owner_id).map((t) => t.owner_id as string)
    ),
  ];
  const contactIds = [
    ...new Set(
      tasks.filter((t) => t.owner_type === 'contact' && t.owner_id).map((t) => t.owner_id as string)
    ),
  ];
  const centreIds = [
    ...new Set(
      tasks.filter((t) => t.owner_type === 'centre' && t.owner_id).map((t) => t.owner_id as string)
    ),
  ];

  const [pRes, cRes, ceRes] = await Promise.all([
    prospectIds.length
      ? supabase.from('prospects').select('id, name').in('id', prospectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    contactIds.length
      ? supabase.from('contacts').select('id, full_name').in('id', contactIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    centreIds.length
      ? supabase.from('centres_auditifs').select('id, slug, nom').in('id', centreIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; nom: string }> }),
  ]);

  const pMap = new Map((pRes.data ?? []).map((p) => [p.id, p.name]));
  const cMap = new Map((cRes.data ?? []).map((c) => [c.id, c.full_name]));
  const ceMap = new Map(
    (ceRes.data ?? []).map((ce) => [ce.id, { nom: ce.nom, slug: ce.slug }])
  );

  return tasks.map((t) => {
    let owner_label: string | null = null;
    let owner_slug: string | null = null;
    if (t.owner_type === 'prospect' && t.owner_id) {
      owner_label = pMap.get(t.owner_id) ?? null;
      owner_slug = t.owner_id;
    } else if (t.owner_type === 'contact' && t.owner_id) {
      owner_label = cMap.get(t.owner_id) ?? null;
      owner_slug = t.owner_id;
    } else if (t.owner_type === 'centre' && t.owner_id) {
      const ce = ceMap.get(t.owner_id);
      owner_label = ce?.nom ?? null;
      owner_slug = ce?.slug ?? null;
    }
    return { ...t, owner_label, owner_slug };
  });
}

/**
 * Fetch initial pour la page /admin/tasks : tâches ouvertes + fermées récentes.
 * Déjà enrichies avec owner labels.
 */
export async function fetchInitialTasks(
  supabase: SupabaseClient
): Promise<TaskWithOwner[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .or(`status.eq.open,and(status.in.(done,skipped),updated_at.gte.${thirtyDaysAgo})`)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(200);

  return enrichTasksWithOwners(supabase, (data ?? []) as Task[]);
}

/**
 * Calcule la due_at de la prochaine occurrence d'une tâche récurrente.
 * Retourne null si pas de récurrence OU si la tâche courante n'a pas de due_at.
 * Ligne critique cas null : `if (kind === 'none' || !currentDueAt) return null;`
 */
export function computeNextDueAt(
  currentDueAt: string | null,
  kind: TaskRecurrenceKind
): string | null {
  if (kind === 'none' || !currentDueAt) return null;
  const current = new Date(currentDueAt);
  if (isNaN(current.getTime())) return null;
  const next = new Date(current);
  if (kind === 'daily') next.setDate(next.getDate() + 1);
  if (kind === 'weekly') next.setDate(next.getDate() + 7);
  if (kind === 'monthly') next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}
