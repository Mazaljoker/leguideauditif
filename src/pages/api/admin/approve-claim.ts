export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import { claimApprovedEmail } from '../../../emails/claim-approved';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Verifier la session admin
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
    const { centreSlug } = body;

    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    const { data: centre, error: fetchError } = await supabase
      .from('centres_auditifs')
      .select('slug, nom, plan, claim_status, claimed_by_email, claimed_by_name')
      .eq('slug', centreSlug)
      .single();

    if (fetchError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.claim_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Aucune demande en attente pour ce centre.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        plan: 'claimed',
        claim_status: 'approved',
      })
      .eq('slug', centreSlug);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la validation.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Envoyer l'email de confirmation au professionnel
    if (centre.claimed_by_email && centre.claimed_by_name) {
      const prenom = centre.claimed_by_name.split(' ')[0] || centre.claimed_by_name;
      await sendEmail({
        to: centre.claimed_by_email,
        subject: `Votre fiche ${centre.nom} est valid\u00e9e sur LeGuideAuditif.fr`,
        html: claimApprovedEmail({
          prenom,
          centreNom: centre.nom,
          centreSlug: centre.slug,
        }),
        replyTo: 'franckolivier@leguideauditif.fr',
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
