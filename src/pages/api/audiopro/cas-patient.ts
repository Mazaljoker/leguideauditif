export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

// Soumission d'un cas patient par l'audio. Toujours en status='pending'
// — la publication publique requiert une validation admin explicite
// (gate RGPD art. 9 + deontologie).
//
// L'audio ne peut pas auto-publier. Il peut en revanche supprimer son
// propre cas tant qu'il n'est pas encore review (ou meme apres).

const AGES = ['< 40', '40-50', '50-60', '60-70', '70-80', '> 80'];
const SEXES = ['F', 'M', 'NC'];
const PERTES = ['legere', 'moderee', 'severe', 'profonde', 'asymetrique', 'acouphenes'];
const TYPES = ['RITE', 'BTE', 'ITE', 'CIC', 'IIC', 'contour'];
const CLASSES = ['1', '2', 'mixte'];

const FORBIDDEN_TERMS = [
  /\bgu[ée]rir\b/i,
  /\b[ée]liminer\b/i,
  /\bmiracle\b/i,
  /\bd[ée]finitif\b/i,
  /\btraitement\b/i,
  /\bth[ée]rapie\b/i,
  /\bsoigner\b/i,
];

const PRICE_RE = /\b\d{2,5}\s*(€|euros?|EUR)\b/i;

// Anti-identification patient : prenoms courants + initiales + mentions explicites
const IDENTIFYING_RE = /\b(madame|monsieur|mme|mr|m\.|mlle|melle|docteur|dr\.?)\s+[A-Z][a-zéèêëàâä]+\b/i;

function validateVerdict(v: string | null | undefined): string | null {
  if (!v) return null;
  if (v.length < 20 || v.length > 350) return 'Verdict : 20-350 caractères.';
  for (const re of FORBIDDEN_TERMS) {
    if (re.test(v)) return 'Terme interdit (promesse thérapeutique non autorisée).';
  }
  if (PRICE_RE.test(v)) return 'Pas de prix exact dans le verdict.';
  if (IDENTIFYING_RE.test(v)) return 'Information identifiante détectée (nom, titre). Le cas doit être strictement anonyme.';
  return null;
}

async function assertOwner(email: string, centreSlug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('centres_auditifs')
    .select('id, claimed_by_email, claim_status, plan')
    .eq('slug', centreSlug)
    .single();
  if (!data) throw new Error('Centre introuvable.');
  if (
    data.claimed_by_email?.trim().toLowerCase() !== email.trim().toLowerCase() ||
    data.claim_status !== 'approved'
  ) {
    throw new Error('Non autorisé.');
  }
  if (data.plan !== 'premium') {
    throw new Error('Feature réservée aux centres Premium.');
  }
  return data.id as string;
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const {
      centreSlug,
      age_range,
      sexe,
      perte_type,
      solution_type,
      solution_classe,
      resultat_comprehension_parole,
      resultat_environnement_bruit,
      resultat_television,
      resultat_ecoute_musique,
      resultat_autre,
      verdict_audio,
      patient_accord,
    } = body;

    if (!centreSlug) return json({ error: 'centreSlug requis.' }, 400);
    if (!patient_accord) {
      return json({ error: 'Vous devez attester avoir l\'accord écrit du patient (gate RGPD).' }, 400);
    }
    if (!AGES.includes(age_range)) return json({ error: 'age_range invalide.' }, 400);
    if (!SEXES.includes(sexe)) return json({ error: 'sexe invalide.' }, 400);
    if (!PERTES.includes(perte_type)) return json({ error: 'perte_type invalide.' }, 400);
    if (!TYPES.includes(solution_type)) return json({ error: 'solution_type invalide.' }, 400);
    if (!CLASSES.includes(solution_classe)) return json({ error: 'solution_classe invalide.' }, 400);

    const verdictErr = validateVerdict(verdict_audio);
    if (verdictErr) return json({ error: verdictErr }, 400);

    if (resultat_autre) {
      if (resultat_autre.length > 200) return json({ error: 'resultat_autre max 200 chars.' }, 400);
      if (IDENTIFYING_RE.test(resultat_autre)) {
        return json({ error: 'resultat_autre contient une information identifiante.' }, 400);
      }
    }

    const atLeastOneResult =
      resultat_comprehension_parole ||
      resultat_environnement_bruit ||
      resultat_television ||
      resultat_ecoute_musique ||
      !!resultat_autre;
    if (!atLeastOneResult) {
      return json({ error: 'Cochez au moins un résultat.' }, 400);
    }

    const centreId = await assertOwner(user.email, centreSlug);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('centre_cas_patients')
      .insert({
        centre_id: centreId,
        age_range,
        sexe,
        perte_type,
        solution_type,
        solution_classe,
        resultat_comprehension_parole: !!resultat_comprehension_parole,
        resultat_environnement_bruit: !!resultat_environnement_bruit,
        resultat_television: !!resultat_television,
        resultat_ecoute_musique: !!resultat_ecoute_musique,
        resultat_autre: resultat_autre || null,
        verdict_audio: verdict_audio || null,
        patient_accord: true,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[cas-patient POST]', error.message);
      return json({ error: 'Soumission impossible.' }, 500);
    }

    return json({ success: true, cas: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    const status = msg === 'Non autorisé.' || msg.includes('Premium') ? 403 : 500;
    return json({ error: msg }, status);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { id, centreSlug } = body;
    if (!id || !centreSlug) return json({ error: 'id + centreSlug requis.' }, 400);

    const centreId = await assertOwner(user.email, centreSlug);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_cas_patients')
      .delete()
      .eq('id', id)
      .eq('centre_id', centreId);

    if (error) {
      console.error('[cas-patient DELETE]', error.message);
      return json({ error: 'Suppression impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    const status = msg === 'Non autorisé.' || msg.includes('Premium') ? 403 : 500;
    return json({ error: msg }, status);
  }
};
