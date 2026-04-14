export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';
import { sendEmail, sendAdminNotification } from '../../lib/email';
import { claimConfirmationEmail } from '../../emails/claim-confirmation';
import { claimAdminNotificationEmail } from '../../emails/claim-admin-notification';
import { generateAdminToken } from '../../lib/admin-token';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const centreSlug = formData.get('centreSlug') as string;
    const nom = formData.get('nom') as string;
    const prenom = formData.get('prenom') as string;
    const email = formData.get('email') as string;
    const adeli = formData.get('adeli') as string;
    const centreNom = formData.get('centreNom') as string | null;
    const siteWeb = formData.get('site_web') as string | null;
    const tel = formData.get('tel') as string | null;
    const horaires = formData.get('horaires') as string | null;
    const a_propos = formData.get('a_propos') as string | null;
    const specialites = formData.getAll('specialites') as string[];
    const marques = formData.getAll('marques') as string[];
    const photo = formData.get('photo') as File | null;

    if (!centreSlug || !nom || !prenom || !email || !adeli) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs obligatoires sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Adresse email invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Verifier que le centre existe et n'est pas deja revendique
    const { data: centre, error: fetchError } = await supabase
      .from('centres_auditifs')
      .select('id, slug, nom, plan, claim_status')
      .eq('slug', centreSlug)
      .single();

    if (fetchError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.plan !== 'rpps') {
      return new Response(
        JSON.stringify({ error: 'Ce centre a deja ete revendique.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.claim_status === 'pending') {
      return new Response(
        JSON.stringify({ error: 'Une demande de revendication est deja en cours pour ce centre.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload photo si fournie
    let photoUrl: string | null = null;
    if (photo && photo.size > 0) {
      if (photo.size > MAX_PHOTO_SIZE) {
        return new Response(
          JSON.stringify({ error: 'La photo ne doit pas depasser 5 Mo.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!ALLOWED_TYPES.includes(photo.type)) {
        return new Response(
          JSON.stringify({ error: 'Format de photo non supporte. Utilisez JPG, PNG ou WebP.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${centre.id}/photo.${ext}`;
      const arrayBuffer = await photo.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('centre-photos')
        .upload(filePath, arrayBuffer, {
          contentType: photo.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError.message);
        // On continue sans la photo plutot que de bloquer la revendication
      } else {
        const { data: urlData } = supabase.storage
          .from('centre-photos')
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }

    // Valider specialites et marques (3 max, strings non-vides)
    const cleanSpecialites = specialites.filter(s => typeof s === 'string' && s.trim().length > 0).slice(0, 3);
    const cleanMarques = marques.filter(m => typeof m === 'string' && m.trim().length > 0).slice(0, 3);

    // Sauvegarder la demande (verification manuelle avant activation)
    const updateData: Record<string, unknown> = {
      claim_status: 'pending',
      claimed_at: new Date().toISOString(),
      claimed_by_email: email,
      claimed_by_name: `${prenom} ${nom}`,
      claimed_by_adeli: adeli,
    };

    if (centreNom && centreNom.trim()) updateData.nom = centreNom.trim();
    if (siteWeb && siteWeb.trim()) updateData.site_web = siteWeb.trim();
    if (tel) updateData.tel = tel;
    if (horaires) updateData.horaires = horaires;
    if (a_propos) updateData.a_propos = a_propos;
    if (photoUrl) updateData.photo_url = photoUrl;
    if (cleanSpecialites.length > 0) updateData.specialites = cleanSpecialites;
    if (cleanMarques.length > 0) updateData.marques = cleanMarques;

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update(updateData)
      .eq('slug', centreSlug);

    if (updateError) {
      console.error('Claim update error:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la revendication. Veuillez reessayer.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generer les tokens pour les liens one-click admin
    const baseUrl = 'https://leguideauditif.fr/api/admin';
    const [approveToken, rejectToken] = await Promise.all([
      generateAdminToken('approve', centreSlug),
      generateAdminToken('reject', centreSlug),
    ]);
    const approveUrl = `${baseUrl}/quick-approve?slug=${centreSlug}&token=${approveToken}`;
    const rejectUrl = `${baseUrl}/quick-reject?slug=${centreSlug}&token=${rejectToken}`;

    // Envoi emails (non-bloquant — on ne fait pas echouer le claim si l'email echoue)
    await Promise.allSettled([
      sendEmail({
        to: email,
        subject: 'Votre demande de revendication a bien \u00e9t\u00e9 re\u00e7ue',
        html: claimConfirmationEmail({
          prenom, nom, centreNom: centre.nom, centreSlug,
          siteWeb: siteWeb || null,
          tel: tel || null,
          horaires: horaires || null,
          specialites: cleanSpecialites,
          marques: cleanMarques,
          photo: !!photoUrl,
          aPropos: a_propos || null,
        }),
        replyTo: 'franck@leguideauditif.fr',
      }),
      sendAdminNotification(
        `Nouvelle revendication : ${centre.nom}`,
        claimAdminNotificationEmail({
          prenom, nom, email, adeli,
          centreNom: centre.nom, centreSlug,
          tel: tel || undefined,
          approveUrl,
          rejectUrl,
        }),
      ),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: `/revendiquer-gratuit/confirmation/?centre=${centreSlug}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Claim error:', errMsg);
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
