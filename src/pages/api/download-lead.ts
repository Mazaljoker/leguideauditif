/**
 * POST /api/download-lead
 * Enregistre un lead en Supabase quand un utilisateur demande une fiche technique PDF
 */
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, nom, prenom, telephone, productSlug, productName, pdfUrl } = body;

    // Validation
    if (!email || !nom || !prenom || !telephone) {
      return new Response(JSON.stringify({ error: 'Tous les champs sont obligatoires' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from('leads_downloads').insert({
      email,
      nom,
      prenom,
      telephone,
      product_slug: productSlug,
      product_name: productName,
      pdf_url: pdfUrl,
      source: 'fiche-technique',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase insert error:', error);
      // Ne pas bloquer le telechargement si Supabase echoue
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Download lead API error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
