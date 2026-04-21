export const prerender = false;

import type { APIRoute } from 'astro';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import {
  parseWaalaxyRow,
  shouldAutoConvertToProspect,
  normalizeForDedup,
} from '../../../../lib/contactsImport';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

interface ImportSummary {
  total_rows: number;
  imported_contacts: number;
  updated_contacts: number;
  skipped_invalid: number;
  auto_prospects_created: number;
  prospects_already_existed: number;
  errors: Array<{ row: number; reason: string }>;
}

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
    const csvText = body?.csv as string;
    const format = (body?.format as string) || 'waalaxy';

    if (!csvText || typeof csvText !== 'string') {
      return new Response(JSON.stringify({ error: 'CSV manquant.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (format !== 'waalaxy') {
      return new Response(
        JSON.stringify({ error: `Format non supporté : ${format}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'CSV malformé',
          details: parsed.errors.slice(0, 5),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Pré-fetch des prospects existants pour matching normalisé (auto-lien Emilie Hardier etc.)
    const { data: existingProspects } = await supabase
      .from('prospects')
      .select('id, name');
    const prospectsByNormName = new Map<string, string>();
    for (const p of existingProspects ?? []) {
      prospectsByNormName.set(normalizeForDedup(p.name as string), p.id as string);
    }

    const summary: ImportSummary = {
      total_rows: parsed.data.length,
      imported_contacts: 0,
      updated_contacts: 0,
      skipped_invalid: 0,
      auto_prospects_created: 0,
      prospects_already_existed: 0,
      errors: [],
    };

    const now = new Date().toISOString();

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const parsedContact = parseWaalaxyRow(row);
      if (!parsedContact) {
        summary.skipped_invalid++;
        continue;
      }

      try {
        // Lookup existant par nom+prénom+company normalisés
        const normFirst = normalizeForDedup(parsedContact.first_name);
        const normLast = normalizeForDedup(parsedContact.last_name);
        const normCompany = normalizeForDedup(parsedContact.company_name ?? '');

        // On fetch les candidats proches pour comparer normalisés (pas de filter unaccent
        // direct en PostgREST, on filtre côté JS sur un sous-ensemble via ilike)
        const { data: candidates } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, company_name, converted_to_prospect_id')
          .ilike('last_name', parsedContact.last_name);

        const existing = (candidates ?? []).find(
          (c) =>
            normalizeForDedup(c.first_name as string) === normFirst &&
            normalizeForDedup(c.last_name as string) === normLast &&
            normalizeForDedup((c.company_name as string) ?? '') === normCompany
        );

        let contactId: string;
        let alreadyConvertedId: string | null = null;

        if (existing) {
          const { error: updErr } = await supabase
            .from('contacts')
            .update({
              ...parsedContact,
              last_imported_at: now,
            })
            .eq('id', existing.id as string);
          if (updErr) throw updErr;
          contactId = existing.id as string;
          alreadyConvertedId = (existing.converted_to_prospect_id as string | null) ?? null;
          summary.updated_contacts++;
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from('contacts')
            .insert({
              ...parsedContact,
              first_imported_at: now,
              last_imported_at: now,
            })
            .select('id')
            .single();

          if (insErr) {
            if ((insErr as { code?: string }).code === '23505') {
              // Conflit d'index unique (dedup normalisé côté SQL) — skip silencieusement
              summary.skipped_invalid++;
              continue;
            }
            throw insErr;
          }
          contactId = inserted.id as string;
          summary.imported_contacts++;
        }

        // Lien systématique à un prospect existant (match nom normalisé) —
        // indépendant du statut Waalaxy pour éviter les doublons type Emilie Hardier.
        const fullNameNorm = normalizeForDedup(
          `${parsedContact.first_name} ${parsedContact.last_name}`
        );
        const matchingProspectId = prospectsByNormName.get(fullNameNorm);

        if (!alreadyConvertedId && matchingProspectId) {
          await supabase
            .from('contacts')
            .update({
              converted_to_prospect_id: matchingProspectId,
              converted_at: now,
            })
            .eq('id', contactId);
          alreadyConvertedId = matchingProspectId;
          summary.prospects_already_existed++;
        }

        // Auto-création prospect pour interested / replied (si pas déjà lié)
        if (shouldAutoConvertToProspect(parsedContact.waalaxy_state)) {
          if (alreadyConvertedId) {
            continue;
          }

          // Crée un nouveau prospect
          const prospectName = `${parsedContact.first_name} ${parsedContact.last_name}`;
          const notesParts: string[] = [
            `Auto-importé depuis Waalaxy le ${new Date().toLocaleDateString('fr-FR')}.`,
          ];
          if (parsedContact.occupation) notesParts.push(parsedContact.occupation);

          const { data: newProspect, error: pErr } = await supabase
            .from('prospects')
            .insert({
              name: prospectName,
              company: parsedContact.company_name,
              status: 'contacte',
              source: 'linkedin',
              is_fondateur: false,
              notes: notesParts.join(' '),
            })
            .select('id')
            .single();

          if (pErr) throw pErr;

          // Mémoire : ajoute au map pour ne pas re-créer sur les lignes suivantes
          prospectsByNormName.set(fullNameNorm, newProspect.id as string);

          await supabase
            .from('contacts')
            .update({
              converted_to_prospect_id: newProspect.id as string,
              converted_at: now,
            })
            .eq('id', contactId);

          // Interaction DM pré-remplie si réponse LinkedIn
          if (parsedContact.waalaxy_last_reply_content) {
            await supabase.from('prospect_interactions').insert({
              prospect_id: newProspect.id as string,
              kind: 'dm',
              content: `[Waalaxy] Réponse LinkedIn : ${parsedContact.waalaxy_last_reply_content}`,
              occurred_at: parsedContact.waalaxy_last_reply_date ?? now,
            });
          }

          summary.auto_prospects_created++;
        }
      } catch (e) {
        summary.errors.push({
          row: i + 2,
          reason: (e as Error).message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[import contacts]', e);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
