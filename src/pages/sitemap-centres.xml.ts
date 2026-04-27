export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const GET: APIRoute = async () => {
  // Seules les fiches claimed/premium sont exposées au sitemap : les fiches RPPS brutes
  // sont noindex (thin content) et ne doivent pas être poussées à Google.
  // Vue v_centres_auditifs_public : exclut les fiches etat_administratif=C (cf. migration 033)
  // pour ne pas publier d'URLs qui retournent 410 Gone.
  const { data: centres, error } = await supabase
    .from('v_centres_auditifs_public')
    .select('slug, updated_at, plan')
    .in('plan', ['claimed', 'premium'])
    .eq('is_demo', false)
    .order('slug');

  if (error || !centres) {
    return new Response('Erreur lors de la génération du sitemap', { status: 500 });
  }

  const urls = centres
    .filter((c) => c.slug)
    .map((c) => {
      const lastmod = c.updated_at
        ? new Date(c.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      return `  <url>
    <loc>https://leguideauditif.fr/centre/${c.slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
