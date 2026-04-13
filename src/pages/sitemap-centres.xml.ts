export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const GET: APIRoute = async () => {
  const { data: centres, error } = await supabase
    .from('centres_auditifs')
    .select('slug, updated_at')
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
