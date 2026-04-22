export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import { computeNextDueAt } from '../../../../lib/tasks';
import type { Task, TaskStatus } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Auth via middleware SSR (locals.user) — évite la 2e setSession qui
    // consomme le rotating refresh token déjà utilisé par le middleware.
    const user = locals.user;
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const body = await request.json();
    const id = body?.id as string | undefined;
    const action = body?.action as TaskStatus | undefined;

    if (!id || !isValidUuid(id)) {
      return new Response(JSON.stringify({ error: 'id UUID invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (action !== 'done' && action !== 'skipped') {
      return new Response(JSON.stringify({ error: 'action doit être "done" ou "skipped".' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();

    const { data: current, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !current) {
      return new Response(JSON.stringify({ error: 'Tâche introuvable.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (current.status !== 'open') {
      return new Response(JSON.stringify({ error: 'Tâche déjà terminée ou ignorée.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const updatePatch: Record<string, unknown> = { status: action };
    if (action === 'done') updatePatch.done_at = now;
    if (action === 'skipped') updatePatch.skipped_at = now;

    const { data: updated, error: updateErr } = await supabase
      .from('tasks')
      .update(updatePatch)
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !updated) {
      console.error('[complete task — update]', updateErr);
      return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let nextTask: Task | null = null;

    // Récurrence : créer la prochaine occurrence uniquement si done + recurrence active
    if (action === 'done' && current.recurrence_kind !== 'none') {
      const nextDueAt = computeNextDueAt(current.due_at, current.recurrence_kind);
      if (nextDueAt) {
        const { data: created, error: insErr } = await supabase
          .from('tasks')
          .insert({
            title: current.title,
            description: current.description,
            owner_type: current.owner_type,
            owner_id: current.owner_id,
            due_at: nextDueAt,
            recurrence_kind: current.recurrence_kind,
            parent_task_id: current.id,
          })
          .select()
          .single();
        if (insErr) {
          console.error('[complete task — next occurrence]', insErr);
        } else {
          nextTask = created as Task;
        }
      } else {
        console.warn(
          `[complete task] Tâche ${current.id} récurrente sans due_at : pas d'occurrence suivante créée.`
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, task: updated, next_task: nextTask }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[complete task]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
