export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase';
import type { TaskOwnerType } from '../../../../types/task';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_OWNER_TYPES: TaskOwnerType[] = ['prospect', 'contact', 'centre'];

export interface OwnerSearchResult {
  id: string;
  label: string;
  sublabel?: string;
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
    const ownerType = body?.owner_type as TaskOwnerType;
    const qRaw = (body?.q ?? '') as string;
    const q = qRaw.trim();

    if (!VALID_OWNER_TYPES.includes(ownerType)) {
      return new Response(JSON.stringify({ error: 'owner_type invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (q.length < 2) {
      return new Response(JSON.stringify({ success: true, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();
    const safeQ = q.replace(/[%_]/g, '\\$&');
    let results: OwnerSearchResult[] = [];

    if (ownerType === 'prospect') {
      const { data } = await supabase
        .from('prospects')
        .select('id, name, company, city, cp')
        .ilike('name', `%${safeQ}%`)
        .limit(15);
      results = (data ?? []).map((p) => ({
        id: p.id as string,
        label: p.name as string,
        sublabel:
          [p.company, [p.cp, p.city].filter(Boolean).join(' ')]
            .filter((s) => s && s.length > 0)
            .join(' · ') || undefined,
      }));
    } else if (ownerType === 'contact') {
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, company_name, location')
        .ilike('full_name', `%${safeQ}%`)
        .eq('archived', false)
        .limit(15);
      results = (data ?? []).map((c) => ({
        id: c.id as string,
        label: c.full_name as string,
        sublabel:
          [c.company_name, c.location].filter((s) => s && s.length > 0).join(' · ') || undefined,
      }));
    } else if (ownerType === 'centre') {
      const { data } = await supabase
        .from('centres_auditifs')
        .select('id, nom, ville, cp')
        .ilike('nom', `%${safeQ}%`)
        .limit(15);
      results = (data ?? []).map((ce) => ({
        id: ce.id as string,
        label: ce.nom as string,
        sublabel: [ce.cp, ce.ville].filter(Boolean).join(' ') || undefined,
      }));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[search-owners]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
