export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import type { TaskOwnerType, TaskRecurrenceKind } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_OWNER_TYPES: TaskOwnerType[] = ['prospect', 'contact', 'centre'];
const VALID_RECURRENCE: TaskRecurrenceKind[] = ['none', 'daily', 'weekly', 'monthly'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
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
