export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import type { TaskOwnerType, TaskRecurrenceKind } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_OWNER_TYPES: TaskOwnerType[] = ['prospect', 'contact', 'centre'];
const VALID_RECURRENCE: TaskRecurrenceKind[] = ['none', 'daily', 'weekly', 'monthly'];

async function ownerExists(
  supabase: SupabaseClient,
  ownerType: TaskOwnerType,
  ownerId: string
): Promise<boolean> {
  const table =
    ownerType === 'prospect' ? 'prospects' : ownerType === 'contact' ? 'contacts' : 'centres_auditifs';
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('id', ownerId);
  return (count ?? 0) > 0;
}

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
    const titleRaw = (body?.title ?? '') as string;
    const title = titleRaw.trim();
    if (!title || title.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Titre requis (1-500 caractères).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const description = body?.description ? String(body.description).slice(0, 5000) : null;

    const ownerType = (body?.owner_type ?? null) as TaskOwnerType | null;
    const ownerId = (body?.owner_id ?? null) as string | null;

    if (ownerType !== null && !VALID_OWNER_TYPES.includes(ownerType)) {
      return new Response(JSON.stringify({ error: 'owner_type invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if ((ownerType === null) !== (ownerId === null)) {
      return new Response(
        JSON.stringify({ error: 'owner_type et owner_id doivent être tous deux null ou tous deux définis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (ownerId && !isValidUuid(ownerId)) {
      return new Response(JSON.stringify({ error: 'owner_id UUID invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dueAtRaw = body?.due_at;
    let dueAt: string | null = null;
    if (dueAtRaw) {
      const d = new Date(dueAtRaw);
      if (isNaN(d.getTime())) {
        return new Response(JSON.stringify({ error: 'due_at invalide.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      dueAt = d.toISOString();
    }

    const recurrenceKind = (body?.recurrence_kind ?? 'none') as TaskRecurrenceKind;
    if (!VALID_RECURRENCE.includes(recurrenceKind)) {
      return new Response(JSON.stringify({ error: 'recurrence_kind invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();

    if (ownerType && ownerId) {
      const exists = await ownerExists(supabase, ownerType, ownerId);
      if (!exists) {
        return new Response(
          JSON.stringify({ error: `${ownerType} introuvable.` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        owner_type: ownerType,
        owner_id: ownerId,
        due_at: dueAt,
        recurrence_kind: recurrenceKind,
      })
      .select()
      .single();

    if (error || !task) {
      console.error('[create task]', error);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, task }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[create task]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
