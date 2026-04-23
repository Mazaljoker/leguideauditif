// Tracking des users authentifiés sur /audioprothesiste-pro/ qui n'ont pas
// encore de fiche revendiquée. Upsert dans contacts (lead pool B2B).
//
// Logique :
//   - Si un contact existe déjà avec le même pro_email ou linkedin_email,
//     on le lie à l'auth.user (update audiopro_auth_user_id) au lieu de
//     créer un doublon.
//   - Sinon, on insère un nouveau contact avec source_import='audiopro_signup'.
//   - Idempotent : appelable à chaque visite de /bienvenue/ sans effet de bord
//     (update last_imported_at seulement).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AudioproSignupMetadata {
  given_name?: string;
  family_name?: string;
  full_name?: string;
  name?: string;
  picture?: string | null;
}

function splitName(fullName?: string): { firstName: string; lastName: string } {
  const cleaned = (fullName ?? '').trim();
  if (!cleaned) return { firstName: '', lastName: '' };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Enregistre le signup de l'user dans la table contacts.
 * Appelée au frontmatter de /audioprothesiste-pro/bienvenue/.
 *
 * @param supabase Client Supabase avec service_role (createServerClient)
 * @param authUserId ID de l'utilisateur Supabase Auth
 * @param email Email principal (user.email)
 * @param metadata user_metadata depuis Supabase Auth (Google fournit given_name, family_name, full_name, picture)
 */
export async function trackAudioproSignup(
  supabase: SupabaseClient,
  authUserId: string,
  email: string,
  metadata: AudioproSignupMetadata = {},
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !authUserId) return;

  // 1. Si un contact est déjà lié à cet auth.user → refresh timestamp, rien d'autre.
  const { data: linked } = await supabase
    .from('contacts')
    .select('id')
    .eq('audiopro_auth_user_id', authUserId)
    .maybeSingle();

  if (linked) {
    await supabase
      .from('contacts')
      .update({
        last_imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', linked.id);
    return;
  }

  // 2. Sinon, chercher un contact Waalaxy/LinkedIn existant avec le même email.
  const { data: existing } = await supabase
    .from('contacts')
    .select('id, audiopro_auth_user_id')
    .or(`pro_email.ilike.${normalizedEmail},linkedin_email.ilike.${normalizedEmail}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // On enrichit le contact existant avec le lien auth — pas de doublon.
    await supabase
      .from('contacts')
      .update({
        audiopro_auth_user_id: authUserId,
        last_imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return;
  }

  // 3. Aucun contact existant → insert nouveau.
  const { firstName, lastName } = splitName(
    metadata.full_name || metadata.name || `${metadata.given_name ?? ''} ${metadata.family_name ?? ''}`.trim(),
  );

  await supabase.from('contacts').insert({
    first_name: metadata.given_name || firstName || normalizedEmail.split('@')[0],
    last_name: metadata.family_name || lastName || '',
    pro_email: normalizedEmail,
    profile_picture_url: metadata.picture ?? null,
    occupation: 'Signup espace pro (sans fiche revendiquée)',
    source_import: 'audiopro_signup',
    audiopro_auth_user_id: authUserId,
    waalaxy_message_sent: false,
    waalaxy_message_replied: false,
    archived: false,
  });
}
