export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import type { TaskCategory, TaskOwnerType, TaskRecurrenceKind } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_OWNER_TYPES: TaskOwnerType[] = ['prospect', 'contact', 'centre'];
const VALID_RECURRENCE: TaskRecurrenceKind[] = ['none', 'daily', 'weekly', 'monthly'];
const VALID_CATEGORIES: TaskCategory[] = ['call', 'email', 'inmail', 'todo'];

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

    if (!id || !isValidUuid(id)) {
      return new Response(JSON.stringify({ error: 'id UUID invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const patch: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title || title.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Titre invalide (1-500 caractères).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      patch.title = title;
    }

    if (body.description !== undefined) {
      patch.description = body.description ? String(body.description).slice(0, 5000) : null;
    }

    if (body.owner_type !== undefined || body.owner_id !== undefined) {
      const ot = (body.owner_type ?? null) as TaskOwnerType | null;
      const oid = (body.owner_id ?? null) as string | null;
      if (ot !== null && !VALID_OWNER_TYPES.includes(ot)) {
        return new Response(JSON.stringify({ error: 'owner_type invalide.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if ((ot === null) !== (oid === null)) {
        return new Response(
          JSON.stringify({ error: 'owner_type et owner_id doivent être tous deux null ou tous deux définis.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (oid && !isValidUuid(oid)) {
        return new Response(JSON.stringify({ error: 'owner_id UUID invalide.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      patch.owner_type = ot;
      patch.owner_id = oid;
    }

    if (body.due_at !== undefined) {
      if (body.due_at === null || body.due_at === '') {
        patch.due_at = null;
      } else {
        const d = new Date(body.due_at);
        if (isNaN(d.getTime())) {
          return new Response(JSON.stringify({ error: 'due_at invalide.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        patch.due_at = d.toISOString();
      }
    }

    if (body.recurrence_kind !== undefined) {
      const rk = body.recurrence_kind as TaskRecurrenceKind;
      if (!VALID_RECURRENCE.includes(rk)) {
        return new Response(JSON.stringify({ error: 'recurrence_kind invalide.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      patch.recurrence_kind = rk;
    }

    if (body.category !== undefined) {
      const cat = body.category as TaskCategory;
      if (!VALID_CATEGORIES.includes(cat)) {
        return new Response(JSON.stringify({ error: 'category invalide.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      patch.category = cat;
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun champ à mettre à jour.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();
    const { data: task, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error || !task) {
      if (error && (error as { code?: string }).code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Tâche introuvable.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('[update task]', error);
      return new Response(JSON.stringify({ error: 'Erreur lors de la mise à jour.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, task }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[update task]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
