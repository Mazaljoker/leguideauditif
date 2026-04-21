/**
 * Reconciliation RPPS <-> centres_auditifs Pass 3a : audio_nom deja rempli,
 * juste le numero rpps manquant.
 *
 * Cible : fiches `source='rpps'` avec :
 *   - rpps IS NULL (pas encore rattache)
 *   - audio_nom IS NOT NULL (pro deja affiche sur la fiche)
 *
 * Matching : SIRET + audio_nom (+ audio_prenom si les deux cotes ont).
 *   - Case-insensitive, normalisation UPPER
 *   - Si 1 pro matche au SIRET + nom/prenom -> patch minimal
 *   - Sinon -> skip (log CSV)
 *
 * Patch minimal (sûr, preserve SEO) :
 *   - rpps = pro.rpps
 *   - enseigne = canonEnseigne(pro.enseigne) si dispo (colonne nouvelle, souvent NULL)
 *   - raison_sociale = cleanInseeText(pro.raison_sociale) si dispo
 *   - updated_at
 *
 * INCHANGE : nom, slug, ville, adresse, audio_nom, audio_prenom, tel, email,
 *            claim_status, source, plan.
 *
 * Safety :
 *   - Skip si centre.claimed OR claim_status IN ('pending','approved')
 *
 * Usage :
 *   node scripts/etl-rpps-pass3a-audio-match.mjs           # dry-run + CSV
 *   node scripts/etl-rpps-pass3a-audio-match.mjs --apply   # UPDATE prod
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
const PREVIEW_CSV = 'reports/rpps-pass3a-preview.csv';
const UNMATCHED_CSV = 'reports/rpps-pass3a-unmatched.csv';
const CLAIM_SKIP_CSV = 'reports/rpps-pass3a-claim-skips.csv';
const ENSEIGNE_FIXES_JSON = 'references/enseigne-fixes.json';

// --- Dict enseignes ---
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

// --- Title Case FR ---
const PARTICULES = new Set([
  'à', 'au', 'aux', 'de', 'des', 'du', 'en',
  'et', 'la', 'le', 'les', 'sous', 'sur',
]);

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;
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
      if ((p === 'l' || p === 'd') && parts[i + 1] === "'") { atStart = false; return p; }
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

function normalizeName(s) {
  if (!s) return '';
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
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

async function main() {
  console.log('=== Pass 3a : audio_nom deja rempli, retrouver rpps manquant ===');
  console.log(`Mode : ${APPLY ? 'APPLY (production)' : 'DRY-RUN'}`);
  console.log('---');

  console.log('[1/4] Chargement cibles + RPPS…');
  const targets = await fetchAll(
    supabase
      .from('centres_auditifs')
      .select('id, slug, nom, cp, ville, siret, audio_nom, audio_prenom, enseigne, raison_sociale, claimed, claim_status, claimed_by_email')
      .eq('source', 'rpps')
      .is('rpps', null)
      .not('audio_nom', 'is', null),
    'targets',
  );
  console.log(`  Cibles (source=rpps, rpps NULL, audio_nom NOT NULL) : ${targets.length}`);

  const pros = await fetchAll(
    supabase
      .from('rpps_audioprothesistes')
      .select('rpps, siret, nom, prenom, enseigne, raison_sociale')
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

  console.log('[2/4] Matching SIRET + audio_nom…');
  const diffs = [];
  const unmatched = [];
  const claimSkips = [];
  let matchByNomPrenom = 0;
  let matchByNomOnly = 0;
  let matchMultipleCandidates = 0;

  for (const c of targets) {
    if (!c.siret) { unmatched.push({ ...c, reason: 'no_siret' }); continue; }

    // Safety claim
    if (c.claimed === true
      || (c.claim_status && ['pending', 'approved'].includes(c.claim_status))
      || c.claimed_by_email) {
      claimSkips.push(c);
      continue;
    }

    const candidates = bySiret.get(c.siret);
    if (!candidates || candidates.length === 0) {
      unmatched.push({ ...c, reason: 'no_rpps_at_siret' });
      continue;
    }

    const targetNom = normalizeName(c.audio_nom);
    const targetPrenom = normalizeName(c.audio_prenom);

    // 1. Try match nom+prenom
    let match = null;
    if (targetPrenom) {
      const exactMatches = candidates.filter((p) =>
        normalizeName(p.nom) === targetNom && normalizeName(p.prenom) === targetPrenom);
      if (exactMatches.length === 1) {
        match = exactMatches[0];
        matchByNomPrenom++;
      } else if (exactMatches.length > 1) {
        unmatched.push({ ...c, reason: `multiple_nom_prenom_match_${exactMatches.length}` });
        matchMultipleCandidates++;
        continue;
      }
    }

    // 2. Fallback : match nom seul
    if (!match) {
      const nomMatches = candidates.filter((p) => normalizeName(p.nom) === targetNom);
      if (nomMatches.length === 1) {
        match = nomMatches[0];
        matchByNomOnly++;
      } else if (nomMatches.length > 1) {
        unmatched.push({ ...c, reason: `multiple_nom_match_${nomMatches.length}` });
        matchMultipleCandidates++;
        continue;
      } else {
        unmatched.push({ ...c, reason: 'no_nom_match_at_siret', candidates_count: candidates.length });
        continue;
      }
    }

    // Match trouve -> construire le patch minimal
    const enseigne = c.enseigne ?? canonEnseigne(match.enseigne);
    const raisonSociale = c.raison_sociale ?? cleanInseeText(match.raison_sociale);

    diffs.push({
      centre_id: c.id,
      slug: c.slug,
      nom: c.nom,
      siret: c.siret,
      cp: c.cp,
      ville: c.ville,
      audio_nom: c.audio_nom,
      audio_prenom: c.audio_prenom,
      rpps_match: match.rpps,
      enseigne_before: c.enseigne,
      enseigne_after: enseigne,
      raison_sociale_before: c.raison_sociale,
      raison_sociale_after: raisonSociale,
    });
  }

  console.log(`  Matchs (nom+prenom)       : ${matchByNomPrenom}`);
  console.log(`  Matchs (nom seul)         : ${matchByNomOnly}`);
  console.log(`  Multi-candidats ambigus   : ${matchMultipleCandidates}`);
  console.log(`  Unmatched                 : ${unmatched.length}`);
  console.log(`  Claim skipped             : ${claimSkips.length}`);
  console.log(`  Prets a patcher           : ${diffs.length}`);

  console.log('[3/4] Ecriture CSVs…');
  if (!existsSync(dirname(PREVIEW_CSV))) mkdirSync(dirname(PREVIEW_CSV), { recursive: true });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  // Preview
  const header = ['centre_id', 'slug', 'nom', 'siret', 'cp', 'ville',
    'audio_nom', 'audio_prenom', 'rpps_match',
    'enseigne_before', 'enseigne_after',
    'raison_sociale_before', 'raison_sociale_after'];
  const lines = [header.join(',')];
  for (const d of diffs) lines.push(header.map((k) => esc(d[k])).join(','));
  writeFileSync(PREVIEW_CSV, lines.join('\n'));
  console.log(`  ${PREVIEW_CSV} (${diffs.length} lignes)`);

  // Unmatched
  if (unmatched.length > 0) {
    const uHeader = ['centre_id', 'slug', 'nom', 'siret', 'audio_nom', 'audio_prenom', 'reason', 'candidates_count'];
    const uLines = [uHeader.join(',')];
    for (const u of unmatched) uLines.push(uHeader.map((k) => esc(u[k])).join(','));
    writeFileSync(UNMATCHED_CSV, uLines.join('\n'));
    console.log(`  ${UNMATCHED_CSV} (${unmatched.length} lignes, review manuelle)`);
  }

  // Claim skips
  if (claimSkips.length > 0) {
    const sHeader = ['centre_id', 'slug', 'nom', 'siret', 'audio_nom', 'claimed', 'claim_status', 'claimed_by_email'];
    const sLines = [sHeader.join(',')];
    for (const s of claimSkips) sLines.push(sHeader.map((k) => esc(s[k])).join(','));
    writeFileSync(CLAIM_SKIP_CSV, sLines.join('\n'));
    console.log(`  ${CLAIM_SKIP_CSV} (${claimSkips.length} fiches claimed, safe skipped)`);
  }

  // Echantillon console
  console.log('---');
  console.log('Echantillon 5 premiers patchs :');
  diffs.slice(0, 5).forEach((d) => {
    console.log(`  ${d.slug.padEnd(55)} -> rpps=${d.rpps_match} (${d.audio_prenom} ${d.audio_nom})`);
  });
  console.log('---');

  if (!APPLY) {
    console.log(`MODE DRY-RUN. Relancer avec --apply pour patcher ${diffs.length} fiches.`);
    return;
  }

  console.log(`[4/4] APPLY : ${diffs.length} UPDATE (rpps + enseigne + raison_sociale)…`);
  let updateOk = 0;
  let errors = 0;
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    const patch = {
      rpps: d.rpps_match,
      updated_at: new Date().toISOString(),
    };
    if (d.enseigne_after && !d.enseigne_before) patch.enseigne = d.enseigne_after;
    if (d.raison_sociale_after && !d.raison_sociale_before) patch.raison_sociale = d.raison_sociale_after;

    const { error } = await supabase
      .from('centres_auditifs')
      .update(patch)
      .eq('id', d.centre_id);
    if (error) {
      console.error(`  UPDATE ${d.centre_id} fail : ${error.message}`);
      errors++;
    } else {
      updateOk++;
      if (updateOk % 200 === 0) process.stdout.write(`  ${updateOk}/${diffs.length}\r`);
    }
  }
  console.log('');
  console.log(`  UPDATE ok : ${updateOk}`);
  console.log(`  Erreurs   : ${errors}`);
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
