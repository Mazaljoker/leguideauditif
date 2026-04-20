/**
 * ETL rpps_audioprothesistes → centres_auditifs (Option A : 1 fiche par RPPS).
 *
 * Cible : 1 898 pros RPPS non-matchés par SIRET avec CP complet.
 * Exclus : 1 404 sans CP (ingestion RPPS incomplète, hors-scope).
 *
 * Scope :
 *   - Géocodage BAN (api-adresse.data.gouv.fr, public, no key)
 *   - Génération slug unique avec suffixe nom pro
 *   - Preview CSV avant apply
 *   - INSERT batch 500 via Supabase service role
 *
 * Usage :
 *   node scripts/etl-rpps-to-centres.mjs                # dry-run + CSV
 *   node scripts/etl-rpps-to-centres.mjs --apply        # INSERT prod
 *
 * Source tag : 'rpps_etl_bulk_2026-04-20'
 * Rollback   : DELETE FROM centres_auditifs WHERE source = 'rpps_etl_bulk_2026-04-20'
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const SOURCE_TAG = 'rpps_etl_bulk_2026-04-20';
const PREVIEW_CSV = 'reports/rpps-etl-preview.csv';
const LOW_SCORE_CSV = 'reports/rpps-etl-low-score-manual-review.csv';
const GEOCODE_CACHE = 'reports/rpps-etl-geocode-cache.json';

// Scores BAN en dessous de ce seuil → lat/lng forcés à NULL (fiche créée
// sans point sur la carte, pour review manuelle ultérieure).
const MIN_GEO_SCORE = 0.5;

// --- Utils ---
const LIGATURE_MAP = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE' };

function slugify(s) {
  return (s || '')
    .replace(/[œŒæÆ]/g, (c) => LIGATURE_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSlug(nom, ville, cp, prenomPro, nomPro) {
  const base = slugify(`${nom} ${ville} ${cp}`);
  const proSuffix = slugify(`${prenomPro} ${nomPro}`);
  return `${base}-${proSuffix}`;
}

function buildAdresse(r) {
  return [r.num_voie, r.type_voie, r.voie]
    .filter((x) => x && x.trim())
    .join(' ')
    .trim();
}

function buildNom(r) {
  // Enseigne si dispo, sinon "Prenom Nom Audioprothésiste"
  if (r.enseigne && r.enseigne.trim()) return r.enseigne.trim();
  return `${r.prenom || ''} ${r.nom || ''}`.trim() + ' Audioprothésiste';
}

function departementFromCp(cp) {
  if (!cp) return null;
  return (cp.startsWith('97') || cp.startsWith('98')) ? cp.substring(0, 3) : cp.substring(0, 2);
}

// --- Load candidates ---
async function loadCandidates() {
  console.log('[1/5] Chargement candidats RPPS non-matchés par SIRET avec CP…');

  // Paginated full scan of rpps_audioprothesistes with CP
  const PAGE = 1000;
  const allPros = [];
  let off = 0;
  while (true) {
    const { data, error } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps, siret, civilite, nom, prenom, enseigne, num_voie, type_voie, voie, code_postal, commune, telephone, email')
      .not('code_postal', 'is', null)
      .neq('code_postal', '')
      .range(off, off + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allPros.push(...data);
    if (data.length < PAGE) break;
    off += PAGE;
  }
  console.log(`  Total pros avec CP : ${allPros.length}`);

  // Get existing SIRETs from centres_auditifs
  const existingSirets = new Set();
  off = 0;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('siret')
      .not('siret', 'is', null)
      .range(off, off + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const c of data) existingSirets.add(c.siret);
    if (data.length < PAGE) break;
    off += PAGE;
  }
  console.log(`  SIRET uniques en centres : ${existingSirets.size}`);

  // Filter unmatched
  const unmatched = allPros.filter((p) => p.siret && !existingSirets.has(p.siret));
  console.log(`  Pros non-matchés (cibles ETL) : ${unmatched.length}`);

  return unmatched;
}

// --- Geocoding BAN ---
async function geocode(q) {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `http_${res.status}` };
    const j = await res.json();
    const f = j.features?.[0];
    if (!f) return { error: 'no_match' };
    return {
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      score: f.properties.score,
      label: f.properties.label,
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function geocodeBatch(items) {
  console.log('[2/5] Géocodage BAN (batch 10 parallèle)…');
  const cache = existsSync(GEOCODE_CACHE) ? JSON.parse(readFileSync(GEOCODE_CACHE, 'utf-8')) : {};
  let cached = 0;
  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);
    await Promise.all(chunk.map(async (item) => {
      if (cache[item.rpps]) {
        cached++;
        item.geo = cache[item.rpps];
        return;
      }
      const q = `${item.adresse} ${item.cp} ${item.ville}`;
      const g = await geocode(q);
      if (g.error) {
        // Fallback : commune seule
        const g2 = await geocode(`${item.ville} ${item.cp}`);
        item.geo = g2.error ? { error: g.error + '/commune_' + g2.error } : { ...g2, fallback: 'commune' };
      } else {
        item.geo = g;
      }
      if (item.geo.error) failed++; else fetched++;
      cache[item.rpps] = item.geo;
    }));
    if ((i + 10) % 200 === 0 || i + 10 >= items.length) {
      writeFileSync(GEOCODE_CACHE, JSON.stringify(cache));
      const done = Math.min(i + 10, items.length);
      process.stdout.write(`  ${done}/${items.length} (cached=${cached}, fetched=${fetched}, failed=${failed})\r`);
    }
  }
  console.log('');
  console.log(`  Total : cached=${cached} | fetched=${fetched} | failed=${failed}`);
  writeFileSync(GEOCODE_CACHE, JSON.stringify(cache));

  // Stats score
  const scores = items.filter(i => i.geo.score).map(i => i.geo.score);
  const high = scores.filter(s => s >= 0.7).length;
  const mid = scores.filter(s => s >= 0.5 && s < 0.7).length;
  const low = scores.filter(s => s < 0.5).length;
  const noGeo = items.filter(i => i.geo.error).length;
  console.log(`  Score ≥ 0.7 : ${high} (${(high / items.length * 100).toFixed(1)}%)`);
  console.log(`  Score 0.5-0.7 : ${mid}`);
  console.log(`  Score < 0.5 : ${low}`);
  console.log(`  Pas de géo : ${noGeo}`);
}

// --- Slug generation + collision check ---
async function generateSlugs(items) {
  console.log('[3/5] Génération slugs + check collisions…');

  // Load all existing slugs (one shot)
  const PAGE = 1000;
  const existingSlugs = new Set();
  let off = 0;
  while (true) {
    const { data, error } = await supabase.from('centres_auditifs').select('slug').range(off, off + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) if (r.slug) existingSlugs.add(r.slug);
    if (data.length < PAGE) break;
    off += PAGE;
  }
  console.log(`  Slugs existants : ${existingSlugs.size}`);

  // Also track newly generated to avoid internal collisions
  const generated = new Set();
  let collisions = 0;

  for (const item of items) {
    const base = buildSlug(item.nom, item.ville, item.cp, item.prenom, item.nom_pro);
    let slug = base;
    let i = 2;
    while (existingSlugs.has(slug) || generated.has(slug)) {
      slug = `${base}-${i}`;
      i++;
      collisions++;
    }
    generated.add(slug);
    item.slug = slug;
  }
  console.log(`  Collisions résolues : ${collisions}`);
}

// --- Filtre low-score : on garde la fiche mais on nullifie lat/lng ---
function applyLowScoreFilter(items) {
  const lowScoreItems = [];
  for (const item of items) {
    const score = item.geo.score ?? 0;
    if (item.geo.error || score < MIN_GEO_SCORE) {
      // Stocker le score original pour le rapport manuel
      item.geo_rejected = { ...item.geo };
      item.geo = { error: item.geo.error || `low_score_${score.toFixed(2)}` };
      lowScoreItems.push(item);
    }
  }
  if (lowScoreItems.length > 0) {
    const header = 'rpps,slug,nom,adresse,cp,ville,siret,geo_score_rejected,geo_label_rejected';
    const lines = [header];
    for (const it of lowScoreItems) {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      lines.push([
        esc(it.rpps), esc(it.slug), esc(it.nom), esc(it.adresse), esc(it.cp), esc(it.ville),
        esc(it.siret),
        esc(it.geo_rejected?.score ?? ''),
        esc(it.geo_rejected?.label ?? it.geo_rejected?.error ?? ''),
      ].join(','));
    }
    writeFileSync(LOW_SCORE_CSV, lines.join('\n'));
    console.log(`  Low-score isolés (lat/lng→NULL) : ${lowScoreItems.length} → ${LOW_SCORE_CSV}`);
  } else {
    console.log(`  Aucun low-score à isoler (tous ≥ ${MIN_GEO_SCORE}).`);
  }
}

// --- Export preview CSV ---
function writePreview(items) {
  console.log('[4/5] Écriture preview CSV…');
  const header = 'rpps,slug,nom,adresse,cp,ville,departement,lat,lng,geo_score,geo_status,siret,prenom,nom_pro,enseigne_source';
  const lines = [header];
  for (const item of items) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push([
      esc(item.rpps),
      esc(item.slug),
      esc(item.nom),
      esc(item.adresse),
      esc(item.cp),
      esc(item.ville),
      esc(item.departement),
      esc(item.geo.lat ?? ''),
      esc(item.geo.lng ?? ''),
      esc(item.geo.score ?? ''),
      esc(item.geo.error ?? (item.geo.fallback ? 'fallback_' + item.geo.fallback : 'ok')),
      esc(item.siret),
      esc(item.prenom),
      esc(item.nom_pro),
      esc(item.enseigne_source ?? ''),
    ].join(','));
  }
  writeFileSync(PREVIEW_CSV, lines.join('\n'));
  console.log(`  ${PREVIEW_CSV} (${items.length} lignes + header)`);
}

// --- Apply INSERT ---
async function applyInserts(items) {
  console.log('[5/5] INSERT batch en prod…');
  const BATCH = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH).map((item) => ({
      legacy_id: `rpps-${item.rpps}`,
      slug: item.slug,
      nom: item.nom,
      adresse: item.adresse,
      cp: item.cp,
      ville: item.ville,
      departement: item.departement,
      lat: item.geo.lat ?? null,
      lng: item.geo.lng ?? null,
      siret: item.siret,
      rpps: item.rpps,
      plan: 'rpps',
      source: SOURCE_TAG,
      audio_prenom: item.prenom,
      tel: item.telephone || null,
      email: item.email || null,
    }));

    const { error } = await supabase.from('centres_auditifs').insert(chunk);
    if (error) {
      console.error(`  ERREUR batch ${Math.floor(i / BATCH) + 1} : ${error.message}`);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
      console.log(`  batch ${Math.floor(i / BATCH) + 1} : +${chunk.length} (cumul ${inserted})`);
    }
  }
  console.log(`---`);
  console.log(`Total INSERT : ${inserted} / ${items.length}`);
  console.log(`Erreurs : ${errors}`);
}

// --- Main ---
async function main() {
  console.log(`=== ETL rpps_audioprothesistes → centres_auditifs ===`);
  console.log(`Mode : ${APPLY ? 'APPLY (production)' : 'DRY-RUN'}`);
  console.log(`Source tag : ${SOURCE_TAG}`);
  console.log(`---`);

  const candidates = await loadCandidates();

  // Préparer items (enrichir avec champs construits)
  const items = candidates.map((r) => ({
    rpps: r.rpps,
    siret: r.siret,
    prenom: r.prenom,
    nom_pro: r.nom,
    enseigne_source: r.enseigne,
    nom: buildNom(r),
    adresse: buildAdresse(r),
    cp: r.code_postal,
    ville: r.commune,
    departement: departementFromCp(r.code_postal),
    telephone: r.telephone,
    email: r.email,
  }));

  // Filtrer ceux dont la construction échoue (pas d'adresse utilisable)
  const valid = items.filter((i) => i.adresse && i.ville && i.cp && i.departement);
  console.log(`  Candidats valides (avec adresse+ville+cp+dep) : ${valid.length} / ${items.length}`);
  console.log(`---`);

  await geocodeBatch(valid);
  await generateSlugs(valid);
  applyLowScoreFilter(valid);
  writePreview(valid);

  if (APPLY) {
    await applyInserts(valid);
    console.log(`---`);
    console.log(`Rollback si besoin : DELETE FROM centres_auditifs WHERE source = '${SOURCE_TAG}';`);
  } else {
    console.log(`---`);
    console.log(`MODE DRY-RUN : aucun INSERT. Valider ${PREVIEW_CSV} puis relancer avec --apply.`);
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
