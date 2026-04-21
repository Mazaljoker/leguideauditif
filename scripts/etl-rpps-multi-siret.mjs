/**
 * Réconciliation RPPS ↔ centres_auditifs Pass 2b : SIRET multi-pros.
 *
 * Cible : 29 fiches `source='insee-sirene'` orphelines (rpps+audio_nom NULL)
 * dont le SIRET est partagé par 2+ pros RPPS (identifiées par Pass 1 et
 * loggées dans reports/rpps-insee-reconciliation-multi-siret.csv).
 *
 * Stratégie (Option A du plan-etl-rpps-to-centres.md §2) :
 *   - Chaque pro RPPS obtient SA fiche centre distincte (1 fiche / pro).
 *   - La fiche INSEE existante est renommée pour le Pro #1 (tri alphabétique
 *     par nom, prenom pour déterminisme).
 *   - Les Pros #2+ obtiennent de nouvelles fiches (INSERT).
 *   - Toutes les fiches d'un même SIRET partagent l'adresse physique mais
 *     ont un slug distinct avec suffixe `-{prenom-nom}`.
 *
 * Safety :
 *   - Vérifie `claim_status IN ('pending','approved') OR claimed = true` avant
 *     tout UPDATE d'une fiche existante. Si claim détecté, la fiche est sautée
 *     et loggée pour review manuelle.
 *   - Aucun INSERT sur slug existant (collision check).
 *
 * Usage :
 *   node scripts/etl-rpps-multi-siret.mjs             # dry-run + CSV
 *   node scripts/etl-rpps-multi-siret.mjs --apply     # UPDATE + INSERT prod
 *
 * Source tag INSERT : 'rpps_multi_siret_2026-04-21'
 * Rollback INSERT   : DELETE FROM centres_auditifs WHERE source = 'rpps_multi_siret_2026-04-21'
 * Rollback UPDATE   : consulter reports/rpps-multi-siret-preview.csv colonnes *_before
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
const PREVIEW_CSV = 'reports/rpps-multi-siret-preview.csv';
const CLAIM_SKIP_CSV = 'reports/rpps-multi-siret-claim-skips.csv';
const ENSEIGNE_FIXES_JSON = 'references/enseigne-fixes.json';
const SOURCE_TAG_INSERT = 'rpps_multi_siret_2026-04-21';
const REDIRECT_REASON = 'rpps-multi-siret-rename';

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

// --- Title Case FR (identique Pass 1 — post fix particule après espace) ---
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

// --- Slug ---
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

function buildMultiSlug(enseigne, ville, siret, prenom, nom) {
  const base = enseigne
    ? `${slugify(enseigne)}-${slugify(ville)}`
    : `audioprothesiste-${slugify(ville)}`;
  const suffix = siret ? siret.slice(-4) : '';
  const proSuffix = `${slugify(prenom)}-${slugify(nom)}`;
  return [base, suffix, proSuffix].filter(Boolean).join('-');
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

function buildAdresseRaw(r) {
  return [r.num_voie, r.type_voie, r.voie]
    .filter((x) => x && String(x).trim())
    .join(' ')
    .trim();
}

function departementFromCp(cp) {
  if (!cp) return null;
  return (cp.startsWith('97') || cp.startsWith('98')) ? cp.substring(0, 3) : cp.substring(0, 2);
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
  console.log('[1/5] Chargement centres INSEE orphelins + pros multi-SIRET…');

  const centres = await fetchAll(
    supabase
      .from('centres_auditifs')
      .select('id, slug, nom, siret, cp, ville, adresse, rpps, audio_nom, tel, email, source, claimed, claim_status, claimed_by_email')
      .eq('source', 'insee-sirene')
      .is('rpps', null)
      .is('audio_nom', null)
      .not('siret', 'is', null)
      .neq('siret', ''),
    'centres',
  );

  const pros = await fetchAll(
    supabase
      .from('rpps_audioprothesistes')
      .select('rpps, siret, nom, prenom, enseigne, raison_sociale, num_voie, type_voie, voie, code_postal, commune, telephone, email')
      .not('siret', 'is', null)
      .neq('siret', ''),
    'rpps',
  );

  const bySiret = new Map();
  for (const p of pros) {
    const arr = bySiret.get(p.siret) ?? [];
    arr.push(p);
    bySiret.set(p.siret, arr);
  }

  const multiMatches = [];
  for (const c of centres) {
    const matches = bySiret.get(c.siret);
    if (!matches || matches.length < 2) continue;
    // Tri alphabétique déterministe par (nom, prenom)
    const sorted = [...matches].sort((a, b) => {
      const nameA = `${a.nom || ''}|${a.prenom || ''}`;
      const nameB = `${b.nom || ''}|${b.prenom || ''}`;
      return nameA.localeCompare(nameB);
    });
    multiMatches.push({ centre: c, pros: sorted });
  }

  console.log(`  Multi-SIRET cibles Pass 2b : ${multiMatches.length}`);
  const totalPros = multiMatches.reduce((sum, m) => sum + m.pros.length, 0);
  console.log(`  Total pros concernés : ${totalPros}`);
  console.log(`  Actions attendues : ${multiMatches.length} UPDATE + ${totalPros - multiMatches.length} INSERT`);
  return multiMatches;
}

// Selection Pro #1 pour un SIRET multi-pros.
// Regle robuste : si la fiche existante a deja un audio_nom rempli ET qu'il
// matche un pro du groupe RPPS, on garde ce pro (continuite SEO). Sinon
// fallback tri alphabetique par (nom, prenom).
function chooseProOne(centre, sortedPros) {
  const centreName = (centre.audio_nom || '').trim().toUpperCase();
  const centrePrenom = (centre.audio_prenom || '').trim().toUpperCase();
  if (centreName) {
    const match = sortedPros.find((p) => {
      const pNom = (p.nom || '').trim().toUpperCase();
      if (pNom !== centreName) return false;
      if (!centrePrenom) return true;
      const pPrenom = (p.prenom || '').trim().toUpperCase();
      return pPrenom === centrePrenom;
    });
    if (match) {
      return { pro: match, rule: 'continuite' };
    }
  }
  return { pro: sortedPros[0], rule: 'fallback-alpha' };
}

// --- Build diffs ---
function buildDiffs(multiMatches) {
  console.log('[2/5] Construction des diffs (UPDATE Pro #1 + INSERT Pros #2+)…');
  const updates = [];
  const inserts = [];
  const claimSkips = [];
  let ruleContinuite = 0;
  let ruleFallback = 0;

  for (const { centre, pros } of multiMatches) {
    // Safety claim : skip si déjà revendiqué
    const isClaimed = centre.claimed === true
      || (centre.claim_status && ['pending', 'approved'].includes(centre.claim_status))
      || centre.claimed_by_email;
    if (isClaimed) {
      claimSkips.push({
        centre_id: centre.id,
        centre_slug: centre.slug,
        claim_status: centre.claim_status,
        claimed: centre.claimed,
        claimed_by_email: centre.claimed_by_email,
        pros_count: pros.length,
        pros_list: pros.map((p) => `${p.rpps}:${p.prenom} ${p.nom}`).join(' | '),
      });
      continue;
    }

    // Selection Pro #1 (regle robuste)
    const { pro: pro1, rule: pro1Rule } = chooseProOne(centre, pros);
    if (pro1Rule === 'continuite') ruleContinuite++; else ruleFallback++;
    const otherPros = pros.filter((p) => p.rpps !== pro1.rpps);

    // Ville depuis RPPS si CP match, sinon INSEE Title Case
    const cpMatch = centre.cp && pro1.code_postal && centre.cp === pro1.code_postal;
    const villeMatch = centre.ville && pro1.commune
      && slugify(centre.ville) === slugify(pro1.commune);
    const villeSource = (cpMatch && villeMatch && pro1.commune) ? pro1.commune : centre.ville;
    const villeTitle = titleCaseFR(villeSource);

    // Adresse INSEE d'abord (fallback RPPS si [ND])
    const adresseInsee = cleanInseeText(centre.adresse);
    const adresseRpps = buildAdresseRaw(pro1);
    const adresseSource = adresseInsee || adresseRpps || centre.adresse;
    const adresseTitle = adresseSource ? titleCaseFR(adresseSource) : centre.adresse;

    const departement = departementFromCp(centre.cp || pro1.code_postal);
    const raisonSociale = cleanInseeText(centre.nom);

    // Pro #1 => UPDATE fiche existante
    {
      const enseigne = deriveEnseigne(pro1.enseigne, centre.nom);
      const newSlug = buildMultiSlug(enseigne, villeTitle, centre.siret, pro1.prenom, pro1.nom);
      updates.push({
        action: 'UPDATE',
        centre_id: centre.id,
        old_slug: centre.slug,
        new_slug: newSlug,
        rpps: pro1.rpps,
        audio_nom: pro1.nom || null,
        audio_prenom: pro1.prenom ? titleCaseFR(pro1.prenom) : null,
        enseigne,
        raison_sociale: raisonSociale,
        nom_before: centre.nom,
        nom_after: buildDisplayName(enseigne, villeTitle, pro1.prenom, pro1.nom),
        ville_before: centre.ville,
        ville_after: villeTitle,
        adresse_before: centre.adresse,
        adresse_after: adresseTitle,
        tel_before: centre.tel,
        tel_after: centre.tel || pro1.telephone || null,
        email_before: centre.email,
        email_after: centre.email || pro1.email || null,
        siret: centre.siret,
        departement,
        pro1_rule: pro1Rule,
      });
    }

    // Pros #2+ => INSERT nouvelles fiches
    for (const pro of otherPros) {
      const enseigne = deriveEnseigne(pro.enseigne, centre.nom);
      const newSlug = buildMultiSlug(enseigne, villeTitle, centre.siret, pro.prenom, pro.nom);
      inserts.push({
        action: 'INSERT',
        centre_id_sibling: centre.id,
        old_slug: null,
        new_slug: newSlug,
        legacy_id: `rpps-${pro.rpps}`,
        rpps: pro.rpps,
        audio_nom: pro.nom || null,
        audio_prenom: pro.prenom ? titleCaseFR(pro.prenom) : null,
        enseigne,
        raison_sociale: raisonSociale,
        nom_after: buildDisplayName(enseigne, villeTitle, pro.prenom, pro.nom),
        ville_after: villeTitle,
        adresse_after: adresseTitle,
        cp: centre.cp,
        tel_after: pro.telephone || null,
        email_after: pro.email || null,
        siret: centre.siret,
        departement,
      });
    }
  }

  console.log(`  UPDATE prêts                    : ${updates.length}`);
  console.log(`  INSERT prêts                    : ${inserts.length}`);
  console.log(`  Claim skips                     : ${claimSkips.length}`);
  console.log(`  Pro #1 rule [continuite SEO]    : ${ruleContinuite}`);
  console.log(`  Pro #1 rule [fallback alpha]    : ${ruleFallback}`);
  return { updates, inserts, claimSkips };
}

// --- Slug collision check ---
async function resolveSlugCollisions(updates, inserts) {
  console.log('[3/5] Résolution collisions slug…');
  const existingSlugs = new Set();
  const slugs = await fetchAll(
    supabase.from('centres_auditifs').select('slug, id'),
    'slugs',
  );
  // Exclure les slugs des centres à update (eux-mêmes)
  const ownSlugs = new Set(updates.map((u) => u.old_slug).filter(Boolean));
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

  const resolveOne = (item) => {
    let candidate = item.new_slug;
    let i = 2;
    while (existingSlugs.has(candidate) || generated.has(candidate)) {
      candidate = `${item.new_slug}-${i}`;
      i++;
      collisions++;
    }
    item.new_slug = candidate;
    generated.add(candidate);
  };

  for (const u of updates) resolveOne(u);
  for (const i of inserts) resolveOne(i);

  console.log(`  Collisions résolues : ${collisions}`);
}

// --- Preview CSV ---
function writePreviewCSV(updates, inserts, claimSkips) {
  console.log('[4/5] Écriture preview CSVs…');
  if (!existsSync(dirname(PREVIEW_CSV))) mkdirSync(dirname(PREVIEW_CSV), { recursive: true });

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'action', 'centre_id', 'centre_id_sibling', 'legacy_id',
    'old_slug', 'new_slug', 'siret', 'departement',
    'nom_before', 'nom_after',
    'ville_before', 'ville_after',
    'adresse_before', 'adresse_after',
    'tel_before', 'tel_after',
    'email_before', 'email_after',
    'enseigne', 'raison_sociale',
    'rpps', 'audio_nom', 'audio_prenom',
    'pro1_rule',
  ];
  const lines = [header.join(',')];
  for (const u of updates) lines.push(header.map((k) => esc(u[k])).join(','));
  for (const i of inserts) lines.push(header.map((k) => esc(i[k])).join(','));
  writeFileSync(PREVIEW_CSV, lines.join('\n'));
  console.log(`  ${PREVIEW_CSV} — ${updates.length + inserts.length} lignes`);

  if (claimSkips.length > 0) {
    const h = ['centre_id', 'centre_slug', 'claim_status', 'claimed', 'claimed_by_email', 'pros_count', 'pros_list'];
    const l = [h.join(',')];
    for (const s of claimSkips) l.push(h.map((k) => esc(s[k])).join(','));
    writeFileSync(CLAIM_SKIP_CSV, l.join('\n'));
    console.log(`  ${CLAIM_SKIP_CSV} — ${claimSkips.length} fiches claimed, hors Pass 2b`);
  }
}

// --- Console sample ---
function printSample(updates, inserts) {
  console.log('---');
  console.log('Échantillon 5 groupes multi-SIRET (UPDATE + INSERT associés) :');
  console.log('---');
  const groups = new Map();
  for (const u of updates) {
    groups.set(u.siret, { update: u, inserts: [] });
  }
  for (const i of inserts) {
    const g = groups.get(i.siret);
    if (g) g.inserts.push(i);
  }
  let shown = 0;
  for (const [siret, g] of groups) {
    if (shown >= 5) break;
    console.log(`\nSIRET ${siret} (${g.inserts.length + 1} fiches) :`);
    console.log(`  UPDATE ${g.update.old_slug}`);
    console.log(`       -> ${g.update.new_slug}`);
    console.log(`       nom: ${g.update.nom_after}`);
    for (const i of g.inserts) {
      console.log(`  INSERT ${i.new_slug}`);
      console.log(`       nom: ${i.nom_after}`);
    }
    shown++;
  }
  console.log('---');
}

// --- Apply ---
async function applyChanges(updates, inserts) {
  console.log('[5/5] APPLY : UPDATE + INSERT + redirects…');
  let updatedCount = 0;
  let insertedCount = 0;
  let redirectedCount = 0;
  let errors = 0;

  // UPDATE Pro #1 dans la fiche existante
  for (const u of updates) {
    const patch = {
      rpps: u.rpps,
      audio_nom: u.audio_nom,
      audio_prenom: u.audio_prenom,
      enseigne: u.enseigne,
      raison_sociale: u.raison_sociale,
      nom: u.nom_after,
      ville: u.ville_after,
      adresse: u.adresse_after,
      tel: u.tel_after,
      email: u.email_after,
      slug: u.new_slug,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('centres_auditifs')
      .update(patch)
      .eq('id', u.centre_id);
    if (error) {
      console.error(`  UPDATE ${u.centre_id} fail : ${error.message}`);
      errors++;
      continue;
    }
    updatedCount++;

    if (u.old_slug && u.old_slug !== u.new_slug) {
      const { error: redErr } = await supabase
        .from('centre_redirects')
        .upsert(
          { old_slug: u.old_slug, new_slug: u.new_slug, reason: REDIRECT_REASON },
          { onConflict: 'old_slug' },
        );
      if (redErr) {
        console.error(`  REDIRECT ${u.old_slug} fail : ${redErr.message}`);
        errors++;
      } else {
        redirectedCount++;
      }
    }
  }

  // INSERT Pros #2+
  const BATCH = 100;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const chunk = inserts.slice(i, i + BATCH).map((ins) => ({
      legacy_id: ins.legacy_id,
      slug: ins.new_slug,
      nom: ins.nom_after,
      adresse: ins.adresse_after,
      cp: ins.cp,
      ville: ins.ville_after,
      departement: ins.departement,
      siret: ins.siret,
      rpps: ins.rpps,
      plan: 'rpps',
      source: SOURCE_TAG_INSERT,
      enseigne: ins.enseigne,
      raison_sociale: ins.raison_sociale,
      audio_nom: ins.audio_nom,
      audio_prenom: ins.audio_prenom,
      tel: ins.tel_after,
      email: ins.email_after,
    }));
    const { error } = await supabase.from('centres_auditifs').insert(chunk);
    if (error) {
      console.error(`  INSERT batch fail : ${error.message}`);
      errors += chunk.length;
    } else {
      insertedCount += chunk.length;
    }
  }

  console.log(`  UPDATE ok   : ${updatedCount}`);
  console.log(`  INSERT ok   : ${insertedCount}`);
  console.log(`  REDIRECT ok : ${redirectedCount}`);
  console.log(`  Erreurs     : ${errors}`);
}

// --- Main ---
async function main() {
  console.log('=== ETL RPPS multi-SIRET (Pass 2b : 1 fiche par pro) ===');
  console.log(`Mode : ${APPLY ? 'APPLY (production)' : 'DRY-RUN'}`);
  console.log(`Source tag INSERT : ${SOURCE_TAG_INSERT}`);
  console.log('---');

  const multiMatches = await loadCandidates();
  if (multiMatches.length === 0) {
    console.log('Aucun multi-SIRET. Rien à faire.');
    return;
  }

  const { updates, inserts, claimSkips } = buildDiffs(multiMatches);
  if (updates.length === 0 && inserts.length === 0) {
    console.log('Tous les candidats sont claimed. Rien à faire.');
    return;
  }

  await resolveSlugCollisions(updates, inserts);
  writePreviewCSV(updates, inserts, claimSkips);
  printSample(updates, inserts);

  if (APPLY) {
    await applyChanges(updates, inserts);
    console.log('---');
    console.log(`Rollback INSERT : DELETE FROM centres_auditifs WHERE source = '${SOURCE_TAG_INSERT}';`);
    console.log(`Rollback UPDATE : consulter ${PREVIEW_CSV} et restaurer colonnes *_before.`);
  } else {
    console.log('---');
    console.log(`MODE DRY-RUN : aucune écriture.`);
    console.log(`Review : ${PREVIEW_CSV}`);
    console.log(`Si OK, relancer avec --apply.`);
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
