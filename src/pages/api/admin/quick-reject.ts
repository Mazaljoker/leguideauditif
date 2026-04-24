export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { verifyAdminToken } from '../../../lib/admin-token';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  const token = url.searchParams.get('token');

  if (!slug || !token) {
    return new Response(page('Lien invalide', 'Param\u00e8tres manquants.', 'error'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const valid = await verifyAdminToken('reject', slug, token);
  if (!valid) {
    return new Response(page('Lien invalide', 'Le token de s\u00e9curit\u00e9 est invalide ou expir\u00e9.', 'error'), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const supabase = createServerClient();

  const { data: centre, error: fetchError } = await supabase
    .from('centres_auditifs')
    .select('slug, nom, claim_status, claimed_by_email')
    .eq('slug', slug)
    .single();

  if (fetchError || !centre) {
    return new Response(page('Centre introuvable', `Aucun centre avec le slug "${slug}".`, 'error'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (centre.claim_status !== 'pending') {
    return new Response(page('D\u00e9j\u00e0 trait\u00e9', `Ce centre est d\u00e9j\u00e0 en statut "${centre.claim_status}".`, 'warning'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Lookup audiopro AVANT l'UPDATE (qui nullifie claimed_by_email)
  const rejectedEmail = centre.claimed_by_email;

  const { error: updateError } = await supabase
    .from('centres_auditifs')
    .update({
      claim_status: 'rejected',
      claimed_by_email: null,
      claimed_by_name: null,
      claimed_by_adeli: null,
      claimed_at: null,
    })
    .eq('slug', slug);

  if (updateError) {
    return new Response(page('Erreur', 'Impossible de mettre \u00e0 jour le centre.', 'error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Event lifecycle claim_rejected (Phase 1)
  // Pas de changement de stage : l'audio reste \u00e0 'revendique'. Pas d'email
  // envoy\u00e9 au revendicateur (le rejet est silencieux c\u00f4t\u00e9 user par design).
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (rejectedEmail) {
    try {
      const { data: audio } = await supabase
        .from('audiopro_lifecycle')
        .select('id, lifecycle_stage')
        .eq('email', rejectedEmail.toLowerCase())
        .maybeSingle();
      if (audio) {
        await supabase.from('audiopro_lifecycle_events').insert({
          audiopro_id: audio.id,
          from_stage: audio.lifecycle_stage,
          to_stage: audio.lifecycle_stage,
          reason: 'claim_rejected',
          metadata: { centre_slug: slug },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[quick-reject] lifecycle event failed:', msg);
    }
  }

  return new Response(
    page('Demande rejet\u00e9e', `La demande de revendication pour <strong>${centre.nom}</strong> a \u00e9t\u00e9 rejet\u00e9e.`, 'error'),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
};

function page(title: string, message: string, type: 'success' | 'error' | 'warning'): string {
  const colors = { success: '#2D7A3A', error: '#A32D2D', warning: '#854F0B' };
  const bgs = { success: '#E8F5E9', error: '#FCEBEB', warning: '#FAEEDA' };
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — LeGuideAuditif Admin</title>
<style>body{margin:0;padding:40px 20px;font-family:Inter,sans-serif;background:#F8F5F0;color:#1B2E4A;display:flex;justify-content:center;}
.card{max-width:480px;width:100%;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
h1{font-size:22px;margin:0 0 16px;}
.badge{display:inline-block;padding:6px 14px;border-radius:6px;font-weight:600;font-size:14px;background:${bgs[type]};color:${colors[type]};}
p{line-height:1.75;margin:16px 0 0;}
a{color:#D97B3D;font-weight:600;}</style></head>
<body><div class="card"><span class="badge">${title}</span><p>${message}</p><p style="margin-top:24px;"><a href="/">Retour au site</a></p></div></body></html>`;
}
