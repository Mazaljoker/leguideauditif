export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

// Upload de l'avatar audio (photo pro de l'audioprothésiste) pour une
// fiche revendiquée. Réutilise le bucket `centre-photos` (public) au
// chemin `{centre_id}/avatar.{ext}` pour ne pas multiplier les buckets.
//
// Contraintes :
//   - 4 MB max
//   - image/jpeg | image/png | image/webp
//   - owner de la fiche uniquement (claim_status = 'approved')
//   - upsert pour remplacer l'avatar précédent

const MAX_SIZE = 4 * 1024 * 1024;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    if (!accessToken || !refreshToken) {
      return json({ error: 'Non autorisé. Veuillez vous connecter.' }, 401);
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
    } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!user || !user.email) return json({ error: 'Session invalide.' }, 401);

    const form = await request.formData();
    const centreSlug = form.get('centreSlug');
    const file = form.get('file');

    if (typeof centreSlug !== 'string' || !(file instanceof File)) {
      return json({ error: 'Paramètres manquants (centreSlug + file requis).' }, 400);
    }

    if (file.size > MAX_SIZE) {
      return json({ error: 'Image trop lourde (max 4 Mo).' }, 400);
    }

    if (!ACCEPTED.has(file.type)) {
      return json({ error: 'Format non supporté (JPG, PNG ou WebP uniquement).' }, 400);
    }

    const supabase = createServerClient();

    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('id, slug, claimed_by_email, claim_status')
      .eq('slug', centreSlug)
      .single();

    if (!centre) return json({ error: 'Centre introuvable.' }, 404);

    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }

    // Upload dans centre-photos/{centre_id}/avatar.{ext}, upsert = remplace
    const ext =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${centre.id}/avatar.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('centre-photos')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-audio-avatar] upload error:', uploadError.message);
      return json({ error: 'Upload impossible, réessayez.' }, 500);
    }

    const { data: urlData } = supabase.storage
      .from('centre-photos')
      .getPublicUrl(filePath);

    // Ajoute un cache-buster pour que le navigateur recharge la nouvelle photo
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        audio_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', centre.id);

    if (updateError) {
      console.error('[upload-audio-avatar] update error:', updateError.message);
      return json({ error: 'Avatar uploadé mais mise à jour fiche impossible.' }, 500);
    }

    return json({ success: true, url: publicUrl }, 200);
  } catch (err) {
    console.error('[upload-audio-avatar] unexpected error:', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
