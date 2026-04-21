/**
 * Réconciliation RPPS ↔ centres_auditifs (Pass 1 : SIRET exact).
 *
 * Cible : fiches `source='insee-sirene'` orphelines (rpps IS NULL AND
 * audio_nom IS NULL) dont le SIRET matche un enregistrement unique
 * de `rpps_audioprothesistes`. Count attendu : ~339.
 *
 * Les SIRET partagés par plusieurs pros RPPS sont isolés dans un CSV
 * de review manuelle — hors scope Pass 1.
 *
 * Chaque fiche matchée reçoit :
 *   - rpps, audio_nom, audio_prenom ← RPPS (systématique)
 *   - tel, email ← RPPS (uniquement si actuellement NULL)
 *   - enseigne ← RPPS.enseigne (nouvelle colonne, migration 011)
 *   - raison_sociale ← valeur actuelle de centres.nom (préservation INSEE brut)
 *   - ville ← Title Case FR RPPS
 *   - adresse ← Title Case FR RPPS (concaténation num_voie + type_voie + voie)
 *   - nom ← "{Enseigne Title} {Ville Title}" (fallback "{Prenom} {NOM} Audioprothésiste")
 *   - slug ← nouveau slug cohérent → redirect 301 ancien → nouveau
 *
 * Usage :
 *   node scripts/etl-rpps-enrich-insee-orphans.mjs            # dry-run + CSV + 20 villes echantillon
 *   node scripts/etl-rpps-enrich-insee-orphans.mjs --apply    # UPDATE + INSERT redirects
 *
 * Rollback : les anciennes valeurs sont loggées dans le CSV preview.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const EXCLUDE_AUDIT = process.argv.includes('--exclude-audit');
const ONLY_AUDIT = process.argv.includes('--only-audit');
const AUDIT_CSV_OVERRIDE = (() => {
  const a = process.argv.find((x) => x.startsWith('--audit-csv='));
  return a ? a.slice('--audit-csv='.length) : null;
})();
// --target-source=<source> : cible une autre source que 'insee-sirene'
// (ex: 'rpps' pour Pass 3b). Override aussi les chemins CSV pour eviter
// l'ecrasement des rapports precedents.
const TARGET_SOURCE = (() => {
  const a = process.argv.find((x) => x.startsWith('--target-source='));
  return a ? a.slice('--target-source='.length) : 'insee-sirene';
})();
const REPORT_PREFIX = TARGET_SOURCE === 'insee-sirene' ? 'rpps-insee-reconciliation' : `rpps-${TARGET_SOURCE}-reconciliation`;
const PREVIEW_CSV = `reports/${REPORT_PREFIX}-preview.csv`;
const MULTI_SIRET_CSV = `reports/${REPORT_PREFIX}-multi-siret.csv`;
const SLUG_AUDIT_CSV = `reports/${REPORT_PREFIX}-slug-audit.csv`;
const ENSEIGNE_FIXES_JSON = 'references/enseigne-fixes.json';
const REDIRECT_REASON = 'rpps-insee-reconciliation';

// --- Dict enseignes canoniques (coquilles + accents + casse marque) ---
const ENSEIGNE_FIXES = (() => {
  if (!existsSync(ENSEIGNE_FIXES_JSON)) return new Map();
  const raw = JSON.parse(readFileSync(ENSEIGNE_FIXES_JSON, 'utf-8'));
  const m = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    m.set(k.toLowerCase().replace(/\s+/g, ' ').trim(), v);
  }
  return m;
})();

function canonEnseigne(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (ENSEIGNE_FIXES.has(key)) return ENSEIGNE_FIXES.get(key);
  return titleCaseFR(raw);
}

// Choix enseigne : RPPS d'abord, sinon INSEE nom si exploitable.
// Evite la regression "alain-afflelou-acousticien -> margaux-massin" quand
// le pro RPPS n'a pas d'enseigne mais l'INSEE avait le nom commercial.
function deriveEnseigne(proEnseigneRaw, centreNomRaw) {
  const rps = proEnseigneRaw ? canonEnseigne(proEnseigneRaw) : null;
  if (rps) return { value: rps, source: 'rpps' };
  const inseeClean = cleanInseeText(centreNomRaw);
  if (inseeClean && inseeClean.length >= 4 && /[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}/.test(inseeClean)) {
    return { value: canonEnseigne(inseeClean), source: 'insee' };
  }
  return { value: null, source: 'none' };
}

function cleanInseeText(s) {
  if (!s) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  // INSEE tag pour valeurs absentes
  if (/^(\[nd\]\s*)+$/i.test(t)) return null;
  return t;
}

// --- Title Case FR ---
// Particules qui restent en minuscules SAUF en position initiale d'un mot composé.
// Note : "saint"/"sainte" ne sont PAS dans la liste (toujours capitalisés).
const PARTICULES = new Set([
  'à', 'au', 'aux', 'de', 'des', 'du', 'en',
  'et', 'la', 'le', 'les', 'sous', 'sur',
]);

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseFR(s) {
  if (!s) return s;
  const clean = s.toLowerCase().replace(/\s+/g, ' ').trim();
  const parts = clean.split(/(\s+|-|')/);
  let atStart = true; // Reste true UNIQUEMENT jusqu'au premier mot. Les whitespaces
                      // suivants n'y reviennent pas (sinon "Rue De La Paix" au lieu
                      // de "Rue de la Paix").
  return parts
    .map((p, i) => {
      if (!p) return p;
      if (/^\s+$/.test(p)) return p;
      if (p === '-') return p;
      if (p === "'") return p;
      // "l'", "d'" (article élidé) : minuscule, pas un mot à part entière.
      if ((p === 'l' || p === 'd') && parts[i + 1] === "'") {
        atStart = false;
        return p;
      }
      if (atStart) { atStart = false; return capitalize(p); }
      if (PARTICULES.has(p)) return p;
      return capitalize(p);
    })
    .join('');
}

// --- Slug (repris de scripts/etl-rpps-to-centres.mjs) ---
const LIGATURE_MAP = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE' };

function slugify(s) {
  return (s || '')
    .replace(/[œŒæÆ]/g, (c) => LIGATURE_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildNewSlug(enseigne, ville, siret, prenomPro, nomPro) {
  const core = enseigne
    ? `${slugify(enseigne)}-${slugify(ville)}`
    : `${slugify(prenomPro)}-${slugify(nomPro)}-${slugify(ville)}`;
  const suffix = siret ? siret.slice(-4) : '';
  return suffix ? `${core}-${suffix}` : core;
}

function buildAdresseRaw(r) {
  return [r.num_voie, r.type_voie, r.voie]
    .filter((x) => x && String(x).trim())
    .join(' ')
    .trim();
}

function buildDisplayName(enseigne, villeTitle, prenom, nom) {
  if (enseigne && enseigne.trim()) {
    return `${titleCaseFR(enseigne.trim())} ${villeTitle}`;
  }
  const prenomT = titleCaseFR(prenom || '').trim();
  const nomUpper = (nom || '').toUpperCase().trim();
  const base = [prenomT, nomUpper].filter(Boolean).join(' ');
  return base ? `${base} Audioprothésiste` : `Audioprothésiste ${villeTitle}`;
}

// --- Pagination helper ---
async function fetchAll(query, label) {
  const PAGE = 1000;
  const all = [];
  let off = 0;
  while (true) {
    const { data, error } = await query.range(off, off + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    off += PAGE;
  }
  return all;
}

// --- Load data ---
async function loadCandidates() {
  console.log('[1/5] Chargement fiches INSEE orphelines + RPPS matchables…');

  const centres = await fetchAll(
    supabase
      .from('centres_auditifs')
      .select('id, slug, nom, siret, cp, ville, adresse, rpps, audio_nom, tel, email, source, claimed, claim_status, claimed_by_email')
      .eq('source', TARGET_SOURCE)
      .is('rpps', null)
      .is('audio_nom', null)
      .not('siret', 'is', null)
      .neq('siret', ''),
    'centres',
  );
  const claimed = centres.filter((c) =>
    c.claimed === true
    || (c.claim_status && ['pending', 'approved'].includes(c.claim_status))
    || c.claimed_by_email);
  const safeCentres = centres.filter((c) => !claimed.includes(c));
  console.log(`  Orphelines source=${TARGET_SOURCE} avec SIRET : ${safeCentres.length} (+ ${claimed.length} claim skipped)`);

  const pros = await fetchAll(
    supabase
      .from('rpps_audioprothesistes')
      .select('rpps, siret, nom, prenom, enseigne, raison_sociale, num_voie, type_voie, voie, code_postal, commune, telephone, email')
      .not('siret', 'is', null)
      .neq('siret', ''),
    'rpps',
  );
  console.log(`  Pros RPPS avec SIRET : ${pros.length}`);

  // Index pros par SIRET
  const bySiret = new Map();
  for (const p of pros) {
    const arr = bySiret.get(p.siret) ?? [];
    arr.push(p);
    bySiret.set(p.siret, arr);
  }

  const singleMatches = [];
  const multiMatches = [];
  for (const c of safeCentres) {
    const matches = bySiret.get(c.siret);
    if (!matches || matches.length === 0) continue;
    if (matches.length === 1) singleMatches.push({ centre: c, pro: matches[0] });
    else multiMatches.push({ centre: c, pros: matches });
  }

  console.log(`  Matchs SIRET uniques (Pass 1) : ${singleMatches.length}`);
  console.log(`  Matchs SIRET multi-pros (hors Pass 1) : ${multiMatches.length}`);
  return { singleMatches, multiMatches };
}

// --- Build diffs ---
// Politique champs :
//   - adresse : TOUJOURS source INSEE (juste cleanInseeText + titleCaseFR).
//     Le RPPS est regulierement tronque ("1756" seul, "3" seul, type de voie perdu).
//   - ville : source RPPS SI cp+ville matchent apres slugify (geo_trust=yes).
//     Sinon on Title Case-e la ville INSEE (eviter "Serres-Castet -> Valbois").
//   - enseigne : canonisee via references/enseigne-fixes.json (coquilles RPPS).
function buildDiffs(singleMatches) {
  console.log('[2/5] Construction des diffs (Title Case + enseigne-fix + slug)…');
  const diffs = [];
  let geoConflicts = 0;
  let enseigneFixed = 0;
  for (const { centre, pro } of singleMatches) {
    const cpMatch = centre.cp && pro.code_postal && centre.cp === pro.code_postal;
    const villeMatch = centre.ville && pro.commune
      && slugify(centre.ville) === slugify(pro.commune);
    const geoTrust = cpMatch && villeMatch;
    if (!geoTrust) geoConflicts++;

    const villeSource = geoTrust && pro.commune ? pro.commune : centre.ville;
    const villeTitle = titleCaseFR(villeSource);

    // Adresse : INSEE d'abord. Fallback RPPS si INSEE = "[ND]" ou null.
    // Sinon on garde l'adresse originale (NOT NULL contraint en base).
    const adresseInsee = cleanInseeText(centre.adresse);
    const adresseRpps = buildAdresseRaw(pro);
    const adresseSource = adresseInsee || adresseRpps || centre.adresse;
    const adresseTitle = adresseSource ? titleCaseFR(adresseSource) : centre.adresse;

    // Enseigne : RPPS > INSEE nom > fallback prenom/nom pro.
    const enseigneRaw = pro.enseigne ? pro.enseigne.trim() : null;
    const derived = deriveEnseigne(enseigneRaw, centre.nom);
    const enseigneClean = derived.value;
    if (enseigneRaw && enseigneClean && enseigneClean !== titleCaseFR(enseigneRaw)) {
      enseigneFixed++;
    }

    const newName = buildDisplayName(enseigneClean, villeTitle, pro.prenom, pro.nom);
    const newSlug = buildNewSlug(enseigneClean, villeTitle, centre.siret, pro.prenom, pro.nom);

    diffs.push({
      id: centre.id,
      old_slug: centre.slug,
      new_slug: newSlug,
      raison_sociale: cleanInseeText(centre.nom),
      rpps: pro.rpps,
      audio_nom: pro.nom || null,
      audio_prenom: pro.prenom ? titleCaseFR(pro.prenom) : null,
      enseigne: enseigneClean,
      enseigne_source: derived.source,
      enseigne_rpps_raw: enseigneRaw,
      ville_before: centre.ville,
      ville_after: villeTitle,
      adresse_before: centre.adresse,
      adresse_after: adresseTitle,
      nom_before: centre.nom,
      nom_after: newName,
      tel_before: centre.tel,
      tel_after: centre.tel || pro.telephone || null,
      email_before: centre.email,
      email_after: centre.email || pro.email || null,
      siret: centre.siret,
      geo_trust: geoTrust ? 'yes' : 'no',
      geo_warning: geoTrust ? '' : `cp_insee=${centre.cp}/rpps=${pro.code_postal} ville_insee=${centre.ville}/rpps=${pro.commune}`,
    });
  }
  console.log(`  Diffs total              : ${diffs.length}`);
  console.log(`  Geo-conflits (ville INSEE preservee) : ${geoConflicts}`);
  console.log(`  Enseignes fixees via dict : ${enseigneFixed}`);
  return diffs;
}

// --- Audit slugs : detecter nouveaux slugs "objectivement moins bons" ---
// Heuristique : on ignore les mots non-discriminants (statut juridique,
// generiques metier, organismes mutualistes) puis on compte les tokens
// discriminants perdus. >= 2 tokens discriminants perdus = regression.
function auditSlugs(diffs) {
  const STOP = new Set([
    // Particules
    'et', 'de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'aux', 'au',
    // Statuts juridiques / sigles
    'cca', 'sas', 'sarl', 'sasu', 'eurl', 'eirl', 'scop',
    // Termes metier generiques
    'audition', 'audio', 'audios', 'acoustique', 'acoustic',
    'centre', 'laboratoire', 'cabinet', 'institut',
    'sante', 'services', 'service',
    // Mutualite / organismes
    'mutualite', 'mutuelle', 'mutualist', 'mutualiste',
    'francaise', 'union', 'depart', 'vyv', 'vyv3', 'ssam', 'adrea',
  ]);
  const meaningful = (slug) => new Set(
    (slug || '').split('-').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)),
  );

  const worse = [];
  for (const d of diffs) {
    if (!d.old_slug) continue;
    const oldTokens = meaningful(d.old_slug);
    const newTokens = meaningful(d.new_slug);
    const lost = [...oldTokens].filter((t) => !newTokens.has(t));
    if (lost.length >= 2) {
      worse.push({ old_slug: d.old_slug, new_slug: d.new_slug, lost: lost.join(',') });
    }
  }

  if (worse.length > 0) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['old_slug', 'new_slug', 'lost_tokens'];
    const lines = [header.join(',')];
    for (const w of worse) lines.push([esc(w.old_slug), esc(w.new_slug), esc(w.lost)].join(','));
    if (!existsSync(dirname(SLUG_AUDIT_CSV))) mkdirSync(dirname(SLUG_AUDIT_CSV), { recursive: true });
    writeFileSync(SLUG_AUDIT_CSV, lines.join('\n'));
  }
  console.log(`  Slugs potentiellement moins bons : ${worse.length} -> ${SLUG_AUDIT_CSV}`);
  return worse;
}

// --- Collision check on new slugs ---
async function resolveSlugCollisions(diffs) {
  console.log('[3/5] Résolution collisions slug…');
  const existingSlugs = new Set();
  const slugs = await fetchAll(
    supabase.from('centres_auditifs').select('slug, id'),
    'slugs',
  );
  // On exclut les slugs des centres à updater (eux-mêmes) pour éviter un faux positif.
  const ownSlugs = new Set(diffs.map((d) => d.old_slug));
  for (const r of slugs) {
    if (!r.slug) continue;
    if (ownSlugs.has(r.slug)) continue;
    existingSlugs.add(r.slug);
  }

  const redirectsTargets = await fetchAll(
    supabase.from('centre_redirects').select('new_slug'),
    'redirects',
  );
  for (const r of redirectsTargets) {
    if (r.new_slug) existingSlugs.add(r.new_slug);
  }

  const generated = new Set();
  let collisions = 0;
  for (const d of diffs) {
    let candidate = d.new_slug;
    let i = 2;
    while (existingSlugs.has(candidate) || generated.has(candidate)) {
      candidate = `${d.new_slug}-${i}`;
      i++;
      collisions++;
    }
    d.new_slug = candidate;
    generated.add(candidate);
  }
  console.log(`  Collisions résolues : ${collisions}`);
}

// --- Preview CSV ---
function writePreviewCSV(diffs, multiMatches) {
  console.log('[4/5] Écriture preview CSV…');
  if (!existsSync(dirname(PREVIEW_CSV))) mkdirSync(dirname(PREVIEW_CSV), { recursive: true });

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'id', 'siret',
    'old_slug', 'new_slug',
    'nom_before', 'nom_after',
    'ville_before', 'ville_after',
    'adresse_before', 'adresse_after',
    'tel_before', 'tel_after',
    'email_before', 'email_after',
    'enseigne', 'enseigne_source', 'enseigne_rpps_raw', 'raison_sociale',
    'rpps', 'audio_nom', 'audio_prenom',
    'geo_trust', 'geo_warning',
  ];
  const lines = [header.join(',')];
  for (const d of diffs) {
    lines.push(header.map((k) => esc(d[k])).join(','));
  }
  writeFileSync(PREVIEW_CSV, lines.join('\n'));
  console.log(`  ${PREVIEW_CSV} — ${diffs.length} lignes`);

  if (multiMatches.length > 0) {
    const mHeader = ['centre_id', 'centre_slug', 'siret', 'n_pros_rpps', 'pros_rpps_list'];
    const mLines = [mHeader.join(',')];
    for (const m of multiMatches) {
      mLines.push([
        esc(m.centre.id),
        esc(m.centre.slug),
        esc(m.centre.siret),
        esc(m.pros.length),
        esc(m.pros.map((p) => `${p.rpps}:${p.prenom} ${p.nom}`).join(' | ')),
      ].join(','));
    }
    writeFileSync(MULTI_SIRET_CSV, mLines.join('\n'));
    console.log(`  ${MULTI_SIRET_CSV} — ${multiMatches.length} fiches multi-pros (hors Pass 1)`);
  }
}

// --- Console preview : 20 villes échantillon ---
function printVillesSample(diffs) {
  console.log('---');
  console.log('Échantillon 20 villes (10 simples + 10 avec particules) :');
  console.log('---');

  const hasParticule = (v) => /\s(en|sur|sous|de|la|le|les|du|des|aux)\s/.test(v.toLowerCase())
    || /-(en|sur|sous|de|la|le|les|du|des|aux)-/.test(v.toLowerCase());

  const simples = diffs.filter((d) => !hasParticule(d.ville_after)).slice(0, 10);
  const particules = diffs.filter((d) => hasParticule(d.ville_after)).slice(0, 10);

  const print = (list, label) => {
    console.log(`\n--- ${label} ---`);
    if (list.length === 0) { console.log('  (aucun)'); return; }
    for (const d of list) {
      console.log(`  ${d.ville_before.padEnd(32)} -> ${d.ville_after}`);
    }
  };
  print(simples, 'Villes simples');
  print(particules, 'Villes avec particules');
  console.log('---');
}

// --- Apply updates ---
async function applyUpdates(diffs) {
  console.log('[5/5] APPLY : UPDATE centres + INSERT redirects…');
  let updated = 0;
  let redirected = 0;
  let errors = 0;

  for (const d of diffs) {
    const patch = {
      rpps: d.rpps,
      audio_nom: d.audio_nom,
      audio_prenom: d.audio_prenom,
      enseigne: d.enseigne,
      raison_sociale: d.raison_sociale,
      nom: d.nom_after,
      ville: d.ville_after,
      adresse: d.adresse_after,
      tel: d.tel_after,
      email: d.email_after,
      slug: d.new_slug,
      updated_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase
      .from('centres_auditifs')
      .update(patch)
      .eq('id', d.id);
    if (upErr) {
      console.error(`  UPDATE ${d.id} fail : ${upErr.message}`);
      errors++;
      continue;
    }
    updated++;

    if (d.old_slug && d.old_slug !== d.new_slug) {
      const { error: redErr } = await supabase
        .from('centre_redirects')
        .upsert(
          { old_slug: d.old_slug, new_slug: d.new_slug, reason: REDIRECT_REASON },
          { onConflict: 'old_slug' },
        );
      if (redErr) {
        console.error(`  REDIRECT ${d.old_slug} fail : ${redErr.message}`);
        errors++;
      } else {
        redirected++;
      }
    }
    if (updated % 50 === 0) {
      process.stdout.write(`  ${updated}/${diffs.length}\r`);
    }
  }
  console.log('');
  console.log(`  UPDATE ok   : ${updated}`);
  console.log(`  REDIRECT ok : ${redirected}`);
  console.log(`  Erreurs     : ${errors}`);
}

// --- Main ---
async function main() {
  console.log('=== ETL RPPS → centres_auditifs (Pass 1 : SIRET exact) ===');
  console.log(`Mode : ${APPLY ? 'APPLY (production)' : 'DRY-RUN'}`);
  console.log('---');

  const { singleMatches, multiMatches } = await loadCandidates();
  if (singleMatches.length === 0) {
    console.log('Aucun match SIRET unique. Rien à faire.');
    return;
  }

  const diffs = buildDiffs(singleMatches);
  await resolveSlugCollisions(diffs);
  const slugWorse = auditSlugs(diffs);
  writePreviewCSV(diffs, multiMatches);
  printVillesSample(diffs);
  if (slugWorse.length > 10) {
    console.log(`---`);
    console.log(`ATTENTION : ${slugWorse.length} slugs potentiellement moins bons (>10).`);
    console.log(`Review ${SLUG_AUDIT_CSV} avant apply.`);
  }

  // Batch split : --exclude-audit retire les old_slugs audit, --only-audit ne garde QUE eux.
  let applyDiffs = diffs;
  if (EXCLUDE_AUDIT && ONLY_AUDIT) {
    console.error('ERREUR : --exclude-audit et --only-audit sont mutuellement exclusifs.');
    process.exit(1);
  }
  if (EXCLUDE_AUDIT) {
    const excluded = new Set(slugWorse.map((w) => w.old_slug));
    applyDiffs = diffs.filter((d) => !excluded.has(d.old_slug));
    console.log(`---`);
    console.log(`--exclude-audit : ${excluded.size} slugs audit exclus du batch.`);
    console.log(`  Batch A (apply)  : ${applyDiffs.length}`);
    console.log(`  Batch B (exclus) : ${diffs.length - applyDiffs.length}`);
  }
  if (ONLY_AUDIT) {
    // Source de verite : --audit-csv override, sinon SLUG_AUDIT_CSV par defaut.
    const auditSource = AUDIT_CSV_OVERRIDE || SLUG_AUDIT_CSV;
    if (!existsSync(auditSource)) {
      console.error(`ERREUR : ${auditSource} absent.`);
      process.exit(1);
    }
    const csv = readFileSync(auditSource, 'utf-8').split('\n').slice(1);
    const batchBSlugs = new Set();
    for (const line of csv) {
      const m = line.match(/^"([^"]+)"/);
      if (m) batchBSlugs.add(m[1]);
    }
    applyDiffs = diffs.filter((d) => batchBSlugs.has(d.old_slug));
    console.log(`---`);
    console.log(`--only-audit : isolement depuis ${auditSource} (${batchBSlugs.size} slugs).`);
    console.log(`  Batch (apply)   : ${applyDiffs.length}`);
    console.log(`  Ignores         : ${diffs.length - applyDiffs.length}`);
    if (applyDiffs.length !== batchBSlugs.size) {
      console.log(`  ATTENTION : ${batchBSlugs.size - applyDiffs.length} slugs introuvables dans les diffs courants.`);
    }
  }

  if (APPLY) {
    await applyUpdates(applyDiffs);
    console.log('---');
    console.log(`Rollback partiel : consulter ${PREVIEW_CSV} et restaurer les colonnes *_before.`);
  } else {
    console.log('---');
    console.log('MODE DRY-RUN : aucun UPDATE.');
    console.log(`Review : ${PREVIEW_CSV}`);
    console.log('Si OK, relancer avec --apply.');
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
