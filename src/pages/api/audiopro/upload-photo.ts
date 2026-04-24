export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

// Upload unifié des photos liées à une fiche (Premium uniquement).
//   - kind=avatar           → audio_photo_url
//   - kind=cabine + slot 0-3 → photos_cabine[slot]
//
// Bucket: centre-photos
// Chemin:
//   - avatar  → {centre_id}/avatar.{ext}
//   - cabine  → {centre_id}/cabine-{slot}.{ext}
//
// Contraintes : JPG/PNG/WebP, 4 Mo max, owner + plan=premium.

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
    const centreSlug = form.get('centreSlug');
    const kind = form.get('kind');
    const slotRaw = form.get('slot');
    const file = form.get('file');

    if (typeof centreSlug !== 'string' || !(file instanceof File) || typeof kind !== 'string') {
      return json({ error: 'Paramètres manquants (centreSlug, kind, file).' }, 400);
    }

    if (kind !== 'avatar' && kind !== 'cabine') {
      return json({ error: 'kind doit être "avatar" ou "cabine".' }, 400);
    }

    let slot = -1;
    if (kind === 'cabine') {
      slot = typeof slotRaw === 'string' ? parseInt(slotRaw, 10) : NaN;
      if (isNaN(slot) || slot < 0 || slot > 3) {
        return json({ error: 'slot doit être 0, 1, 2 ou 3.' }, 400);
      }
    }

    if (file.size > MAX_SIZE) return json({ error: 'Image trop lourde (max 4 Mo).' }, 400);
    if (!ACCEPTED.has(file.type)) return json({ error: 'Format non supporté (JPG, PNG ou WebP).' }, 400);

    const supabase = createServerClient();

    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('id, slug, claimed_by_email, claim_status, plan, photos_cabine')
      .eq('slug', centreSlug)
      .single();

    if (!centre) return json({ error: 'Centre introuvable.' }, 404);
    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }
    // Avatar accessible aux comptes revendiqués (claimed + premium).
    // Photos cabine (4 slots) réservées au Premium.
    if (kind === 'cabine' && centre.plan !== 'premium') {
      return json({ error: 'Les photos du centre sont réservées aux comptes Premium.' }, 403);
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filePath =
      kind === 'avatar'
        ? `${centre.id}/avatar.${ext}`
        : `${centre.id}/cabine-${slot}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('centre-photos')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-photo] upload error:', uploadError.message);
      return json({ error: 'Upload impossible, réessayez.' }, 500);
    }

    const { data: urlData } = supabase.storage.from('centre-photos').getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // Update DB
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (kind === 'avatar') {
      update.audio_photo_url = publicUrl;
    } else {
      const current = (centre.photos_cabine ?? []) as string[];
      // Garantit un tableau de 4 slots (null possible entre les deux)
      const normalized: string[] = [];
      for (let i = 0; i < 4; i++) {
        if (i === slot) normalized.push(publicUrl);
        else if (current[i]) normalized.push(current[i]);
      }
      update.photos_cabine = normalized;
    }

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update(update)
      .eq('id', centre.id);

    if (updateError) {
      console.error('[upload-photo] update error:', updateError.message);
      return json({ error: 'Photo uploadée mais mise à jour fiche impossible.' }, 500);
    }

    return json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[upload-photo] unexpected error:', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};

// DELETE : retire l'avatar ou une photo cabine (met à null ou retire du tableau)
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { centreSlug, kind, slot } = body as {
      centreSlug?: string;
      kind?: 'avatar' | 'cabine';
      slot?: number;
    };

    if (!centreSlug || !kind) return json({ error: 'centreSlug + kind requis.' }, 400);
    if (kind !== 'avatar' && kind !== 'cabine') return json({ error: 'kind invalide.' }, 400);

    const supabase = createServerClient();
    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('id, claimed_by_email, claim_status, plan, photos_cabine')
      .eq('slug', centreSlug)
      .single();

    if (!centre) return json({ error: 'Centre introuvable.' }, 404);
    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (kind === 'avatar') {
      update.audio_photo_url = null;
    } else {
      if (typeof slot !== 'number' || slot < 0 || slot > 3) {
        return json({ error: 'slot doit être 0-3.' }, 400);
      }
      const current = (centre.photos_cabine ?? []) as string[];
      const next = [...current];
      next.splice(slot, 1);
      update.photos_cabine = next;
    }

    const { error } = await supabase
      .from('centres_auditifs')
      .update(update)
      .eq('id', centre.id);

    if (error) {
      console.error('[upload-photo DELETE]', error.message);
      return json({ error: 'Suppression impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error('[upload-photo DELETE] unexpected:', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};
