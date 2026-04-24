export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

// Validation admin des cas patients soumis. Seul Franck-Olivier peut
// approuver ou rejeter. Un cas rejeté reste en DB avec le motif pour
// que l'audio puisse corriger + resoumettre.

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user || user.email !== ADMIN_EMAIL) {
      return json({ error: 'Admin uniquement.' }, 403);
    }

    const body = await request.json();
    const { id, decision, reason } = body as {
      id?: string;
      decision?: 'approved' | 'rejected';
      reason?: string;
    };

    if (!id || !decision || !['approved', 'rejected'].includes(decision)) {
      return json({ error: 'id + decision (approved|rejected) requis.' }, 400);
    }
    if (decision === 'rejected' && (!reason || reason.trim().length < 10)) {
      return json({ error: 'Raison du rejet requise (10 caractères min).' }, 400);
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_cas_patients')
      .update({
        status: decision,
        admin_reason: reason?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[cas-patient-review]', error.message);
      return json({ error: 'Mise à jour impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    return json({ error: msg }, 500);
  }
};
