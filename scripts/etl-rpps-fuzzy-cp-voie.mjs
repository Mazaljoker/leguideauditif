/**
 * Réconciliation RPPS ↔ centres_auditifs Pass 2 fuzzy : CP exact + voie fuzzy.
 *
 * Cible : 1 200 fiches `source='insee-sirene'` orphelines (rpps+audio_nom NULL)
 * dont le SIRET ne matche aucun pro RPPS (Pass 1 et 2b déjà appliqués).
 *
 * Logique :
 *   - Indexer les pros RPPS unmatched par CP.
 *   - Pour chaque orphelin : prendre les pros au même CP, calculer similarity
 *     (Levenshtein ratio) entre voie_normalisée du centre et voie_normalisée
 *     RPPS. Retenir le top match.
 *   - Seuils d'acceptation proposés (à ajuster après dry-run sample) :
 *       >= 0.90 → match fort (confiance)
 *       0.75-0.90 → match probable (review)
 *       < 0.75 → rejet
 *   - Anti-ambiguité : le top match doit être > 2e match + 0.05 (écart clair).
 *
 * Usage :
 *   node scripts/etl-rpps-fuzzy-cp-voie.mjs --sample 50       # dry-run 50 aleatoires
 *   node scripts/etl-rpps-fuzzy-cp-voie.mjs --threshold 0.85  # change seuil
 *   node scripts/etl-rpps-fuzzy-cp-voie.mjs --all             # dry-run complet sur les 1200
 *   node scripts/etl-rpps-fuzzy-cp-voie.mjs --all --apply     # APPLY prod (TBD si seuil valide)
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
const ALL = process.argv.includes('--all');
const SAMPLE_SIZE = (() => {
  const a = process.argv.find((x) => x.startsWith('--sample'));
  if (!a) return 50;
  const next = process.argv[process.argv.indexOf(a) + 1];
  return Number(next) || 50;
})();
const THRESHOLD = (() => {
  const a = process.argv.find((x) => x.startsWith('--threshold'));
  if (!a) return 0.85;
  const next = process.argv[process.argv.indexOf(a) + 1];
  return Number(next) || 0.85;
})();
const MARGIN = 0.05; // top match doit etre > second + margin
const SAMPLE_CSV = 'reports/rpps-fuzzy-sample.csv';
const AMBIGUOUS_CSV = 'reports/rpps-fuzzy-ambiguous.csv';
const NEEDS_RECHECK_CSV = 'reports/batch-b-needs-brand-recheck.csv';
const ENSEIGNE_FIXES_JSON = 'references/enseigne-fixes.json';
const REDIRECT_REASON = 'rpps-fuzzy-cp-voie';

// --- Exclusion list : fiches flaguees "needs_brand_recheck" (Batch B) ---
const EXCLUDED_IDS = (() => {
  if (!existsSync(NEEDS_RECHECK_CSV)) return new Set();
  const lines = readFileSync(NEEDS_RECHECK_CSV, 'utf-8').split('\n').slice(1);
  const ids = new Set();
  for (const line of lines) {
    const m = line.match(/^"([^"]+)"/);
    if (m) ids.add(m[1]);
  }
  return ids;
})();

// --- Dict enseignes canoniques (partage avec Pass 1) ---
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

// --- Title Case FR (identique Pass 1 + 2b) ---
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
  let atStart = true;
  return parts
    .map((p, i) => {
      if (!p) return p;
      if (/^\s+$/.test(p)) return p;
      if (p === '-') return p;
      if (p === "'") return p;
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

function canonEnseigne(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (ENSEIGNE_FIXES.has(key)) return ENSEIGNE_FIXES.get(key);
  return titleCaseFR(raw);
}

function cleanInseeText(s) {
  if (!s) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(\[nd\]\s*)+$/i.test(t)) return null;
  return t;
}

function deriveEnseigne(proEnseigneRaw, centreNomRaw) {
  const rps = proEnseigneRaw ? canonEnseigne(proEnseigneRaw) : null;
  if (rps) return rps;
  const inseeClean = cleanInseeText(centreNomRaw);
  if (inseeClean && inseeClean.length >= 4 && /[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}/.test(inseeClean)) {
    return canonEnseigne(inseeClean);
  }
  return null;
}

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

function buildNewSlug(enseigne, ville, siret, prenom, nom) {
  const core = enseigne
    ? `${slugify(enseigne)}-${slugify(ville)}`
    : `${slugify(prenom)}-${slugify(nom)}-${slugify(ville)}`;
  const suffix = siret ? siret.slice(-4) : '';
  return suffix ? `${core}-${suffix}` : core;
}

function buildDisplayName(enseigne, villeTitle, prenom, nom) {
  if (enseigne && enseigne.trim()) {
    return `${enseigne} ${villeTitle}`;
  }
  const prenomT = titleCaseFR(prenom || '').trim();
  const nomUpper = (nom || '').toUpperCase().trim();
  const base = [prenomT, nomUpper].filter(Boolean).join(' ');
  return base ? `${base} Audioprothésiste` : `Audioprothésiste ${villeTitle}`;
}

// --- Levenshtein ratio (similarity 0..1) ---
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// --- Normalisation adresse (clef de comparaison) ---
// On GARDE les mots generiques (rue/avenue/de/la) : ils structurent la string
// et aident Levenshtein. On canonise aussi les abreviations frequentes
// (av->avenue, bd->boulevard, etc.) pour aligner les deux cotes.
const ABBREV = new Map([
  ['av', 'avenue'], ['ave', 'avenue'],
  ['bd', 'boulevard'], ['blvd', 'boulevard'], ['boul', 'boulevard'],
  ['rte', 'route'],
  ['ch', 'chemin'], ['chem', 'chemin'],
  ['imp', 'impasse'],
  ['pl', 'place'],
  ['all', 'allee'], ['allée', 'allee'],
  ['gr', 'grande'],
  ['sq', 'square'],
  ['fg', 'faubourg'],
  ['res', 'residence'], ['résidence', 'residence'],
  ['st', 'saint'], ['ste', 'sainte'],
]);

function normalizeAddress(s) {
  if (!s) return '';
  const base = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Expand abbreviations
  return base.split(' ')
    .map((w) => ABBREV.get(w) ?? w)
    .join(' ');
}

// --- Pagination ---
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

// --- Load ---
async function loadOrphans() {
  const orphans = await fetchAll(
    supabase
      .from('centres_auditifs')
      .select('id, slug, nom, cp, ville, adresse, siret, tel, email, claimed, claim_status, claimed_by_email')
      .eq('source', 'insee-sirene')
      .is('rpps', null)
      .is('audio_nom', null)
      .not('cp', 'is', null)
      .not('adresse', 'is', null),
    'orphans',
  );
  return orphans.filter((o) =>
    !EXCLUDED_IDS.has(o.id)
    && o.cp && !['', '[ND]'].includes(o.cp)
    && o.adresse && o.adresse.length >= 10 && !o.adresse.startsWith('[nd]') && !o.adresse.startsWith('[ND]'));
}

async function loadUnmatchedRpps() {
  const allRpps = await fetchAll(
    supabase
      .from('rpps_audioprothesistes')
      .select('rpps, siret, nom, prenom, enseigne, num_voie, type_voie, voie, code_postal, commune, telephone, email'),
    'rpps',
  );
  // Centres avec rpps rempli : ceux-la sont deja matches
  const matched = new Set();
  const linked = await fetchAll(
    supabase.from('centres_auditifs').select('rpps').not('rpps', 'is', null),
    'centres_linked',
  );
  for (const r of linked) matched.add(r.rpps);
  return allRpps.filter((p) =>
    !matched.has(p.rpps)
    && p.code_postal && p.code_postal.length > 0
    && p.voie && p.voie.length >= 3);
}

// --- Match ---
function matchOrphan(orphan, prosByCp) {
  const candidates = prosByCp.get(orphan.cp) || [];
  if (candidates.length === 0) return { topScore: 0, runnerUp: 0, match: null, candidates: [] };

  const orphanVoie = normalizeAddress(orphan.adresse);
  if (!orphanVoie) return { topScore: 0, runnerUp: 0, match: null, candidates: [] };

  const scored = candidates.map((p) => {
    // Inclure num_voie pour symetrie avec centre.adresse (INSEE inclut le numero).
    const proVoie = normalizeAddress([p.num_voie, p.type_voie, p.voie].filter(Boolean).join(' '));
    return { pro: p, score: similarity(orphanVoie, proVoie) };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runner = scored[1] ? scored[1].score : 0;
  return { topScore: top.score, runnerUp: runner, match: top.pro, candidates: scored };
}

// --- Main ---
async function main() {
  console.log('=== Pass 2 fuzzy : CP exact + voie fuzzy ===');
  console.log(`Seuil : ${THRESHOLD} (margin vs runner-up : ${MARGIN})`);
  console.log(`Sample : ${ALL ? 'ALL (1 200)' : SAMPLE_SIZE}`);
  console.log('---');

  console.log('[1/3] Chargement orphelines + RPPS unmatched…');
  const [orphans, pros] = await Promise.all([loadOrphans(), loadUnmatchedRpps()]);
  console.log(`  Orphelines exploitables : ${orphans.length}`);
  console.log(`  Pros RPPS unmatched     : ${pros.length}`);

  const prosByCp = new Map();
  for (const p of pros) {
    const arr = prosByCp.get(p.code_postal) ?? [];
    arr.push(p);
    prosByCp.set(p.code_postal, arr);
  }

  // Sample
  let targets = orphans;
  if (!ALL) {
    const shuffled = [...orphans].sort(() => Math.random() - 0.5);
    targets = shuffled.slice(0, SAMPLE_SIZE);
  }

  console.log(`[2/3] Matching fuzzy sur ${targets.length} orphelines…`);
  const results = targets.map((o) => {
    const r = matchOrphan(o, prosByCp);
    return { orphan: o, ...r };
  });

  // Stats par seuil
  const buckets = {
    '≥ 0.95': 0, '0.90-0.95': 0, '0.85-0.90': 0, '0.80-0.85': 0,
    '0.70-0.80': 0, '0.50-0.70': 0, '< 0.50': 0, 'no_candidate': 0,
  };
  const confidentMatches = []; // top >= threshold AND margin OK
  const ambiguous = [];
  let noCandidate = 0;
  for (const r of results) {
    if (!r.match) { buckets.no_candidate++; noCandidate++; continue; }
    const s = r.topScore;
    if (s >= 0.95) buckets['≥ 0.95']++;
    else if (s >= 0.90) buckets['0.90-0.95']++;
    else if (s >= 0.85) buckets['0.85-0.90']++;
    else if (s >= 0.80) buckets['0.80-0.85']++;
    else if (s >= 0.70) buckets['0.70-0.80']++;
    else if (s >= 0.50) buckets['0.50-0.70']++;
    else buckets['< 0.50']++;

    if (s >= THRESHOLD && (s - r.runnerUp) >= MARGIN) {
      confidentMatches.push(r);
    } else if (s >= THRESHOLD && (s - r.runnerUp) < MARGIN) {
      ambiguous.push(r);
    }
  }

  console.log('[3/3] Resultats :');
  console.log('');
  console.log('  Distribution score top-match :');
  for (const [k, v] of Object.entries(buckets)) {
    const pct = ((v / results.length) * 100).toFixed(1);
    console.log(`    ${k.padEnd(15)} : ${String(v).padStart(4)} (${pct}%)`);
  }
  console.log('');
  console.log(`  Matchs confiance (>= ${THRESHOLD} + margin ${MARGIN}) : ${confidentMatches.length} (${((confidentMatches.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Matchs ambigus (>= ${THRESHOLD} mais margin faible)   : ${ambiguous.length}`);
  console.log(`  Pas de candidat CP                                    : ${noCandidate}`);
  console.log(`  Reject (score < ${THRESHOLD})                          : ${results.length - confidentMatches.length - ambiguous.length - noCandidate}`);

  // CSV sample
  if (!existsSync(dirname(SAMPLE_CSV))) mkdirSync(dirname(SAMPLE_CSV), { recursive: true });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'centre_id', 'centre_slug', 'centre_cp', 'centre_ville', 'centre_adresse',
    'top_score', 'runner_up', 'margin', 'verdict',
    'match_rpps', 'match_nom', 'match_prenom', 'match_enseigne',
    'match_adresse_rpps',
  ];
  const lines = [header.join(',')];
  for (const r of results) {
    const verdict = !r.match ? 'no_cp_match'
      : (r.topScore >= THRESHOLD && (r.topScore - r.runnerUp) >= MARGIN ? 'confident'
        : (r.topScore >= THRESHOLD ? 'ambiguous' : 'reject'));
    const matchAdr = r.match ? [r.match.num_voie, r.match.type_voie, r.match.voie].filter(Boolean).join(' ') : '';
    lines.push(header.map((k) => {
      switch (k) {
        case 'centre_id': return esc(r.orphan.id);
        case 'centre_slug': return esc(r.orphan.slug);
        case 'centre_cp': return esc(r.orphan.cp);
        case 'centre_ville': return esc(r.orphan.ville);
        case 'centre_adresse': return esc(r.orphan.adresse);
        case 'top_score': return esc(r.topScore.toFixed(3));
        case 'runner_up': return esc(r.runnerUp.toFixed(3));
        case 'margin': return esc((r.topScore - r.runnerUp).toFixed(3));
        case 'verdict': return esc(verdict);
        case 'match_rpps': return esc(r.match?.rpps);
        case 'match_nom': return esc(r.match?.nom);
        case 'match_prenom': return esc(r.match?.prenom);
        case 'match_enseigne': return esc(r.match?.enseigne);
        case 'match_adresse_rpps': return esc(matchAdr);
        default: return '""';
      }
    }).join(','));
  }
  writeFileSync(SAMPLE_CSV, lines.join('\n'));
  console.log(`  CSV : ${SAMPLE_CSV} (${results.length} lignes)`);
  console.log('');

  // Exemples
  console.log('  Exemples top-5 scores eleves (confident) :');
  confidentMatches.slice(0, 5).forEach((r) => {
    const matchAdr = [r.match.num_voie, r.match.type_voie, r.match.voie].filter(Boolean).join(' ');
    console.log(`    ${r.topScore.toFixed(2)} [${r.orphan.cp}] "${r.orphan.adresse}" <-> "${matchAdr}" (${r.match.prenom} ${r.match.nom})`);
  });

  console.log('');
  console.log('  Exemples top-5 scores ambigus (review necessaire) :');
  ambiguous.slice(0, 5).forEach((r) => {
    const matchAdr = [r.match.num_voie, r.match.type_voie, r.match.voie].filter(Boolean).join(' ');
    console.log(`    top=${r.topScore.toFixed(2)} vs runner=${r.runnerUp.toFixed(2)} [${r.orphan.cp}] "${r.orphan.adresse}" <-> "${matchAdr}"`);
  });

  // --- Isoler CSV ambigus (toujours, meme en dry-run) ---
  if (ambiguous.length > 0) {
    const ambHeader = ['centre_id', 'centre_slug', 'cp', 'centre_adresse', 'top_score', 'runner_up', 'top_rpps', 'top_nom_prenom', 'top_enseigne', 'top_adresse_rpps'];
    const ambLines = [ambHeader.join(',')];
    for (const r of ambiguous) {
      const matchAdr = [r.match.num_voie, r.match.type_voie, r.match.voie].filter(Boolean).join(' ');
      ambLines.push([
        esc(r.orphan.id), esc(r.orphan.slug), esc(r.orphan.cp), esc(r.orphan.adresse),
        esc(r.topScore.toFixed(3)), esc(r.runnerUp.toFixed(3)),
        esc(r.match.rpps), esc(`${r.match.prenom} ${r.match.nom}`),
        esc(r.match.enseigne), esc(matchAdr),
      ].join(','));
    }
    writeFileSync(AMBIGUOUS_CSV, ambLines.join('\n'));
    console.log(`  CSV ambigus : ${AMBIGUOUS_CSV} (${ambiguous.length} lignes)`);
  }

  console.log('---');
  if (!APPLY) {
    console.log(`MODE DRY-RUN. Confident: ${confidentMatches.length}, Ambigus: ${ambiguous.length}. Relancer --all --apply pour exec.`);
    return;
  }

  // --- APPLY ---
  if (!ALL) {
    console.error('ERREUR : --apply requiert --all (sinon on n applique que sur un sous-ensemble random).');
    process.exit(1);
  }
  console.log(`APPLY PROD : ${confidentMatches.length} UPDATE + redirects…`);
  await applyConfidentMatches(confidentMatches);
}

async function applyConfidentMatches(matches) {
  // Pre-flight : load existing slugs to resolve collisions
  const existingSlugs = new Set();
  const slugs = await fetchAll(
    supabase.from('centres_auditifs').select('slug, id'),
    'slugs',
  );
  const ownSlugs = new Set(matches.map((m) => m.orphan.slug));
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
  let updateOk = 0;
  let redirectOk = 0;
  let claimSkipped = 0;
  let errors = 0;
  const applyLog = [];

  for (const m of matches) {
    const { orphan, match: pro } = m;

    // Safety claim
    if (orphan.claimed === true
      || (orphan.claim_status && ['pending', 'approved'].includes(orphan.claim_status))
      || orphan.claimed_by_email) {
      claimSkipped++;
      applyLog.push({ ...m, action: 'SKIPPED_CLAIM' });
      continue;
    }

    // Ville : geo_trust (CP match garanti ici, check ville)
    const cpMatch = orphan.cp === pro.code_postal;
    const villeMatch = orphan.ville && pro.commune
      && slugify(orphan.ville) === slugify(pro.commune);
    const geoTrust = cpMatch && villeMatch;
    const villeSource = geoTrust && pro.commune ? pro.commune : orphan.ville;
    const villeTitle = titleCaseFR(villeSource);

    // Adresse : INSEE Title Case (systematique)
    const adresseInsee = cleanInseeText(orphan.adresse);
    const adresseTitle = adresseInsee ? titleCaseFR(adresseInsee) : orphan.adresse;

    // Enseigne
    const enseigne = deriveEnseigne(pro.enseigne, orphan.nom);

    // Slug nouveau + collision
    let newSlug = buildNewSlug(enseigne, villeTitle, orphan.siret, pro.prenom, pro.nom);
    let i = 2;
    while (existingSlugs.has(newSlug) || generated.has(newSlug)) {
      newSlug = `${buildNewSlug(enseigne, villeTitle, orphan.siret, pro.prenom, pro.nom)}-${i}`;
      i++;
    }
    generated.add(newSlug);

    const newName = buildDisplayName(enseigne, villeTitle, pro.prenom, pro.nom);
    const raisonSociale = cleanInseeText(orphan.nom);

    const patch = {
      rpps: pro.rpps,
      audio_nom: pro.nom || null,
      audio_prenom: pro.prenom ? titleCaseFR(pro.prenom) : null,
      enseigne,
      raison_sociale: raisonSociale,
      nom: newName,
      ville: villeTitle,
      adresse: adresseTitle,
      tel: orphan.tel || pro.telephone || null,
      email: orphan.email || pro.email || null,
      slug: newSlug,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from('centres_auditifs')
      .update(patch)
      .eq('id', orphan.id);
    if (upErr) {
      console.error(`  UPDATE ${orphan.id} fail : ${upErr.message}`);
      errors++;
      applyLog.push({ ...m, action: 'ERROR', error: upErr.message });
      continue;
    }
    updateOk++;
    applyLog.push({ ...m, action: 'UPDATED', new_slug: newSlug });

    if (orphan.slug !== newSlug) {
      const { error: redErr } = await supabase
        .from('centre_redirects')
        .upsert(
          { old_slug: orphan.slug, new_slug: newSlug, reason: REDIRECT_REASON },
          { onConflict: 'old_slug' },
        );
      if (redErr) {
        console.error(`  REDIRECT ${orphan.slug} fail : ${redErr.message}`);
        errors++;
      } else {
        redirectOk++;
      }
    }
  }

  console.log(`---`);
  console.log(`  UPDATE ok     : ${updateOk}`);
  console.log(`  REDIRECT ok   : ${redirectOk}`);
  console.log(`  Claim skipped : ${claimSkipped}`);
  console.log(`  Erreurs       : ${errors}`);
  console.log(`---`);
  console.log(`Rollback : consulter ${SAMPLE_CSV} pour retrouver les etats avant.`);
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
