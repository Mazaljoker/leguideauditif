export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { verifyAdminToken } from '../../../lib/admin-token';
import { sendEmail } from '../../../lib/email';
import { claimApprovedEmail } from '../../../emails/claim-approved';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  const token = url.searchParams.get('token');

  if (!slug || !token) {
    return new Response(page('Lien invalide', 'Param\u00e8tres manquants.', 'error'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const valid = await verifyAdminToken('approve', slug, token);
  if (!valid) {
    return new Response(page('Lien invalide', 'Le token de s\u00e9curit\u00e9 est invalide ou expir\u00e9.', 'error'), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const supabase = createServerClient();

  const { data: centre, error: fetchError } = await supabase
    .from('centres_auditifs')
    .select('slug, nom, plan, claim_status, claimed_by_email, claimed_by_name')
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

  const { error: updateError } = await supabase
    .from('centres_auditifs')
    .update({ plan: 'claimed', claim_status: 'approved', claimed: true, verifie: true })
    .eq('slug', slug);

  if (updateError) {
    return new Response(page('Erreur', 'Impossible de mettre \u00e0 jour le centre.', 'error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Creer le compte Supabase Auth pour le professionnel (magic link)
  let magicLinkNote = '';
  if (centre.claimed_by_email) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(u => u.email === centre.claimed_by_email);

    if (!alreadyExists) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: centre.claimed_by_email,
        email_confirm: true,
        user_metadata: { centre_slug: slug, role: 'pro' },
      });
      if (createError) {
        console.error('User creation error:', createError.message);
      }
    }

    // Generer un magic link pour connexion directe
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: centre.claimed_by_email,
      options: { redirectTo: `https://leguideauditif.fr/centre/${slug}/modifier` },
    });
    if (linkError) {
      console.error('Magic link error:', linkError.message);
    }

    const magicLink = linkData?.properties?.action_link || `https://leguideauditif.fr/connexion-pro`;
    magicLinkNote = magicLink;

    // Envoyer l'email au professionnel avec le magic link
    const prenom = centre.claimed_by_name?.split(' ')[0] || '';
    await sendEmail({
      to: centre.claimed_by_email,
      subject: `Votre fiche ${centre.nom} est valid\u00e9e sur LeGuideAuditif.fr`,
      html: claimApprovedEmail({ prenom, centreNom: centre.nom, centreSlug: slug, magicLink }),
      replyTo: 'franck@leguideauditif.fr',
    });
  }

  return new Response(
    page(
      'Fiche approuv\u00e9e',
      `<strong>${centre.nom}</strong> est maintenant en statut "claimed".<br/>Un email de confirmation a \u00e9t\u00e9 envoy\u00e9 \u00e0 ${centre.claimed_by_email}.`,
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
<title>${title} — LeGuideAuditif Admin</title>
<style>body{margin:0;padding:40px 20px;font-family:Inter,sans-serif;background:#F8F5F0;color:#1B2E4A;display:flex;justify-content:center;}
.card{max-width:480px;width:100%;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
h1{font-size:22px;margin:0 0 16px;}
.badge{display:inline-block;padding:6px 14px;border-radius:6px;font-weight:600;font-size:14px;background:${bgs[type]};color:${colors[type]};}
p{line-height:1.75;margin:16px 0 0;}
a{color:#D97B3D;font-weight:600;}</style></head>
<body><div class="card"><span class="badge">${title}</span><p>${message}</p><p style="margin-top:24px;"><a href="/">Retour au site</a></p></div></body></html>`;
}
