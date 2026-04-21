export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { enrichTasksWithOwners } from '../../../../lib/tasks';
import type { Task, TaskStatus, TaskOwnerType } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_STATUSES: TaskStatus[] = ['open', 'done', 'skipped'];
const VALID_OWNER_TYPES: TaskOwnerType[] = ['prospect', 'contact', 'centre'];

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
    const supabase = createServerClient();

    let query = supabase.from('tasks').select('*');

    // Filtre owner_type/owner_id
    if (body.owner_type !== undefined) {
      if (body.owner_type === null) {
        query = query.is('owner_type', null);
      } else if (VALID_OWNER_TYPES.includes(body.owner_type)) {
        query = query.eq('owner_type', body.owner_type);
      }
    }
    if (body.owner_id) {
      query = query.eq('owner_id', body.owner_id);
    }

    // Filtre status (string ou array)
    if (body.status !== undefined) {
      const statuses = Array.isArray(body.status) ? body.status : [body.status];
      const valid = statuses.filter((s: string) => VALID_STATUSES.includes(s as TaskStatus));
      if (valid.length > 0) {
        query = query.in('status', valid);
      }
    }

    // Filtre dates
    if (body.due_before) {
      const d = new Date(body.due_before);
      if (!isNaN(d.getTime())) query = query.lt('due_at', d.toISOString());
    }
    if (body.due_after) {
      const d = new Date(body.due_after);
      if (!isNaN(d.getTime())) query = query.gte('due_at', d.toISOString());
    }

    // Search côté DB (ILIKE sur title)
    if (body.search) {
      const safeSearch = String(body.search).replace(/[%_]/g, '\\$&');
      query = query.ilike('title', `%${safeSearch}%`);
    }

    const limit = Math.min(Math.max(parseInt(body.limit, 10) || 100, 1), 500);
    query = query.order('due_at', { ascending: true, nullsFirst: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[list tasks]', error);
      return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tasks = await enrichTasksWithOwners(supabase, (data ?? []) as Task[]);

    return new Response(JSON.stringify({ success: true, tasks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[list tasks]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
