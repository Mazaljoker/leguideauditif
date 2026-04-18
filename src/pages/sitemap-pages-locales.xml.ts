export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';
import { DEPARTEMENTS, getDepartementByCode, slugifyVille } from '../lib/departements';

/**
 * Sitemap du silo local : pages villes et départements.
 *
 * Adresse la Partie 3 du diagnostic 2026-04-18 : le silo /audioprothesiste/*
 * n'est pas dans un sitemap soumis, Google le crawle peu malgré un contenu
 * dense (5-14k chars/page) et un maillage fonctionnel.
 *
 * Contenu :
 *  - /audioprothesiste/[ville-slug]/ pour chaque ville distincte en base
 *    (slugifyVille regroupe les arrondissements — paris-15e → paris)
 *  - /audioprothesiste/departement/[slug]/ pour chaque département
 *    présent en base (filtré sur DEPARTEMENTS pour éviter les 404)
 */
export const GET: APIRoute = async () => {
  const PAGE_SIZE = 1000;
  const villeSlugs = new Set<string>();
  const deptCodes = new Set<string>();

  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('ville, cp')
      .not('ville', 'is', null)
      .not('cp', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return new Response(`Erreur Supabase: ${error.message}`, { status: 500 });
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const slug = slugifyVille(row.ville || '');
      if (slug) villeSlugs.add(slug);

      const cp = (row.cp || '').toString();
      const code = cp.startsWith('97') || cp.startsWith('98') ? cp.substring(0, 3) : cp.substring(0, 2);
      if (code && getDepartementByCode(code)) deptCodes.add(code);
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const today = new Date().toISOString().split('T')[0];

  const villeUrls = Array.from(villeSlugs).sort().map(
    (slug) => `  <url>
    <loc>https://leguideauditif.fr/audioprothesiste/${slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
  );

  const deptUrls = Array.from(deptCodes)
    .map((code) => getDepartementByCode(code))
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(
      (dept) => `  <url>
    <loc>https://leguideauditif.fr/audioprothesiste/departement/${dept.slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    );

  const hubUrl = `  <url>
    <loc>https://leguideauditif.fr/audioprothesiste/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[hubUrl, ...deptUrls, ...villeUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
