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
// Seuils d'indexation alignés sur la logique noindex des pages [ville].astro
// et [dep].astro : on ne pousse au sitemap que les URLs réellement indexables.
const VILLE_MIN_CENTRES = 6;
const DEPT_MIN_CENTRES = 10;
const DEPT_MIN_VILLES = 3;

export const GET: APIRoute = async () => {
  const PAGE_SIZE = 1000;
  const villeCounts = new Map<string, number>();
  const deptData = new Map<string, { centres: number; villes: Set<string> }>();

  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('ville, cp')
      .eq('is_demo', false)
      .not('ville', 'is', null)
      .not('cp', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return new Response(`Erreur Supabase: ${error.message}`, { status: 500 });
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const slug = slugifyVille(row.ville || '');
      if (slug) {
        villeCounts.set(slug, (villeCounts.get(slug) ?? 0) + 1);
      }

      const cp = (row.cp || '').toString();
      const code = cp.startsWith('97') || cp.startsWith('98') ? cp.substring(0, 3) : cp.substring(0, 2);
      if (code && getDepartementByCode(code)) {
        const entry = deptData.get(code) ?? { centres: 0, villes: new Set<string>() };
        entry.centres += 1;
        if (slug) entry.villes.add(slug);
        deptData.set(code, entry);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const today = new Date().toISOString().split('T')[0];

  // Ne pousser que les villes avec >= 6 centres (alignement noindex)
  const villeUrls = Array.from(villeCounts.entries())
    .filter(([, count]) => count >= VILLE_MIN_CENTRES)
    .map(([slug]) => slug)
    .sort()
    .map(
      (slug) => `  <url>
    <loc>https://leguideauditif.fr/audioprothesiste/${slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    );

  // Département : inclure si >= 10 centres OU >= 3 villes
  const deptUrls = Array.from(deptData.entries())
    .filter(([, v]) => v.centres >= DEPT_MIN_CENTRES || v.villes.size >= DEPT_MIN_VILLES)
    .map(([code]) => getDepartementByCode(code))
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
