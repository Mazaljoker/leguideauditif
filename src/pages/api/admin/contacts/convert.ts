export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import { normalizeForDedup } from '../../../../lib/contactsImport';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const contactId = body?.contact_id as string | undefined;

    if (!contactId || !isValidUuid(contactId)) {
      return new Response(JSON.stringify({ error: 'contact_id UUID invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();

    // Charge le contact
    const { data: contact, error: fetchErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (fetchErr || !contact) {
      return new Response(JSON.stringify({ error: 'Contact introuvable.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (contact.converted_to_prospect_id) {
      return new Response(
        JSON.stringify({
          error: 'Ce contact est déjà converti en prospect.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Match prospect existant par nom normalisé (évite doublon)
    const fullNameNorm = normalizeForDedup(
      `${contact.first_name} ${contact.last_name}`
    );

    const { data: allProspects } = await supabase
      .from('prospects')
      .select('id, name');

    const matchingProspect = (allProspects ?? []).find(
      (p) => normalizeForDedup(p.name as string) === fullNameNorm
    );

    let prospectId: string;
    let created = false;

    if (matchingProspect) {
      prospectId = matchingProspect.id as string;
    } else {
      const prospectName = `${contact.first_name} ${contact.last_name}`;
      const notesParts: string[] = [
        `Converti depuis un contact ${contact.source_import ?? 'importé'} le ${new Date().toLocaleDateString('fr-FR')}.`,
      ];
      if (contact.occupation) notesParts.push(contact.occupation as string);

      const { data: newProspect, error: insErr } = await supabase
        .from('prospects')
        .insert({
          name: prospectName,
          company: contact.company_name,
          status: 'contacte',
          source: 'linkedin',
          is_fondateur: false,
          notes: notesParts.join(' '),
        })
        .select('id')
        .single();

      if (insErr || !newProspect) {
        console.error('[convert contact — insert prospect]', insErr);
        return new Response(
          JSON.stringify({ error: 'Impossible de créer le prospect.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      prospectId = newProspect.id as string;
      created = true;

      // Interaction DM pré-remplie si réponse LinkedIn disponible
      if (contact.waalaxy_last_reply_content) {
        await supabase.from('prospect_interactions').insert({
          prospect_id: prospectId,
          kind: 'dm',
          content: `[Waalaxy] Réponse LinkedIn : ${contact.waalaxy_last_reply_content}`,
          occurred_at: contact.waalaxy_last_reply_date ?? now,
        });
      }
    }

    // Lie le contact au prospect
    const { data: updatedContact, error: updErr } = await supabase
      .from('contacts')
      .update({
        converted_to_prospect_id: prospectId,
        converted_at: now,
      })
      .eq('id', contactId)
      .select('*')
      .single();

    if (updErr || !updatedContact) {
      console.error('[convert contact — update contact]', updErr);
      return new Response(
        JSON.stringify({ error: 'Impossible de lier le contact.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: updatedContact,
        prospect_id: prospectId,
        created,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[convert contact]', e);
    return new Response(JSON.stringify({ error: 'Erreur serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
