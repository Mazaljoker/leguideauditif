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

  const valid = await verifyAdminToken('premium', slug, token);
  if (!valid) {
    return new Response(page('Lien invalide', 'Le token de s\u00e9curit\u00e9 est invalide.', 'error'), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const supabase = createServerClient();

  const { data: centre, error: fetchError } = await supabase
    .from('centres_auditifs')
    .select('slug, nom, plan')
    .eq('slug', slug)
    .single();

  if (fetchError || !centre) {
    return new Response(page('Centre introuvable', `Aucun centre avec le slug "${slug}".`, 'error'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (centre.plan === 'premium') {
    return new Response(page('D\u00e9j\u00e0 Premium', `<strong>${centre.nom}</strong> est d\u00e9j\u00e0 en formule Premium.`, 'warning'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { error: updateError } = await supabase
    .from('centres_auditifs')
    .update({ plan: 'premium', is_premium: true })
    .eq('slug', slug);

  if (updateError) {
    return new Response(page('Erreur', 'Impossible de mettre \u00e0 jour le centre.', 'error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(
    page(
      'Premium activ\u00e9',
      `<strong>${centre.nom}</strong> est maintenant en formule <strong>Premium</strong> gratuite \u00e0 vie.<br/><br/><a href="https://leguideauditif.fr/centre/${slug}/" style="color:#D97B3D;font-weight:600;">Voir la fiche</a>`,
      'success',
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
};

function page(title: string, message: string, type: 'success' | 'error' | 'warning'): string {
  const colors = { success: '#2D7A3A', error: '#A32D2D', warning: '#854F0B' };
  const bgs = { success: '#E8F5E9', error: '#FCEBEB', warning: '#FAEEDA' };
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} \u2014 LeGuideAuditif</title>
<style>body{margin:0;padding:40px 20px;font-family:Inter,sans-serif;background:#F8F5F0;color:#1B2E4A;display:flex;justify-content:center;}
.card{max-width:480px;width:100%;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
.badge{display:inline-block;padding:6px 14px;border-radius:6px;font-weight:600;font-size:14px;background:${bgs[type]};color:${colors[type]};}
p{line-height:1.75;margin:16px 0 0;}
a{color:#D97B3D;font-weight:600;}</style></head>
<body><div class="card"><span class="badge">${title}</span><p>${message}</p></div></body></html>`;
}
