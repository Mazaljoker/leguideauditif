export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';

// Upload photo d'un membre de l'équipe (titulaire ou collaborateur).
// Bucket : centre-photos
// Path : {centre_id}/team/{audio_id}.{ext}
// Contraintes : JPG/PNG/WebP, 4 Mo max. Ownership premium + claim approved.

const MAX_SIZE = 4 * 1024 * 1024;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function authUser(cookies: { get(name: string): { value?: string } | undefined }) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  if (!accessToken || !refreshToken) return null;
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return user;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const form = await request.formData();
    const audioId = form.get('audioId');
    const file = form.get('file');

    if (typeof audioId !== 'string' || !(file instanceof File)) {
      return json({ error: 'Paramètres manquants (audioId, file).' }, 400);
    }
    if (file.size > MAX_SIZE) return json({ error: 'Image trop lourde (max 4 Mo).' }, 400);
    if (!ACCEPTED.has(file.type)) return json({ error: 'Format non supporté (JPG, PNG ou WebP).' }, 400);

    const supabase = createServerClient();

    const { data: audioRow } = await supabase
      .from('centre_audios')
      .select('id, centre_id, centres_auditifs!inner(claimed_by_email, claim_status, plan)')
      .eq('id', audioId)
      .single();
    if (!audioRow) return json({ error: 'Audioprothésiste introuvable.' }, 404);

    const centre = (audioRow as unknown as {
      centre_id: string;
      centres_auditifs: { claimed_by_email: string; claim_status: string; plan: string };
    });
    if (
      centre.centres_auditifs.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.centres_auditifs.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }
    if (centre.centres_auditifs.plan !== 'premium') {
      return json({ error: 'L\'équipe est réservée aux centres Premium.' }, 403);
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${centre.centre_id}/team/${audioId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('centre-photos')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[team/upload-photo] upload', uploadError.message);
      return json({ error: 'Upload impossible.' }, 500);
    }

    const { data: urlData } = supabase.storage.from('centre-photos').getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('centre_audios')
      .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', audioId);
    if (updateError) {
      console.error('[team/upload-photo] update', updateError.message);
      return json({ error: 'Photo uploadée mais update fiche impossible.' }, 500);
    }

    return json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[team/upload-photo] unexpected', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};
