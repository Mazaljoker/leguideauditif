#!/usr/bin/env node
/**
 * Import script: CSV → JSON Content Collection files
 * Generates one JSON per SKU (Marque + Forme + Niveau + Puce)
 *
 * Usage: node scripts/import-catalogue.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'docs/catalogue-sources/hearingtracker-mysecondear-europe-2020-2026.csv');
const OUTPUT_DIR = join(ROOT, 'src/content/catalogue-appareils');

// ─── Brand mappings ──────────────────────────────────────────
const BRAND_SLUGS = {
  'Phonak': 'phonak', 'Signia': 'signia', 'ReSound': 'resound',
  'Oticon': 'oticon', 'Starkey': 'starkey', 'Widex': 'widex',
  'Unitron': 'unitron', 'Bernafon': 'bernafon', 'Philips': 'philips',
  'Rexton': 'rexton', 'Audio Service': 'audio-service', 'Hansaton': 'hansaton',
};

const BRAND_GROUPE = {
  'phonak': 'sonova', 'unitron': 'sonova', 'hansaton': 'sonova',
  'oticon': 'demant', 'philips': 'demant', 'bernafon': 'demant',
  'signia': 'ws-audiology', 'widex': 'ws-audiology', 'rexton': 'ws-audiology', 'audio-service': 'ws-audiology',
  'resound': 'gn',
  'starkey': 'starkey',
};

// ─── FormeType normalization ────────────────────────────────
function normalizeFormeType(csvType) {
  const t = csvType.trim();
  if (t === 'Slim RIC') return 'Slim RIC';
  if (t === 'Earbud') return 'Earbud';
  if (t.startsWith('RIC')) return 'RIC';
  if (t.startsWith('BTE')) return 'BTE';
  if (t === 'Custom ITE' || t === 'ITE') return 'ITE';
  if (t === 'CIC/IIC' || t === 'CIC') return 'CIC';
  if (t === 'IIC') return 'IIC';
  if (t.includes('RIC')) return 'RIC';
  if (t.includes('BTE')) return 'BTE';
  if (t.includes('ITE')) return 'ITE';
  return 'RIC';
}

// ─── Level cleaning ─────────────────────────────────────────
function cleanLevel(rawLevel) {
  return rawLevel
    .replace(/^[A-Z]/, '')
    .replace(/IX$/, '')
    .replace(/AX$/, '');
}

// ─── Niveau position (normalized 1=entry → 4/5=premium) ────
function getNiveauPosition(brand, cleanLvl) {
  const n = parseInt(cleanLvl);
  if (isNaN(n)) return 1;
  const brandSlug = BRAND_SLUGS[brand] || brand.toLowerCase();
  switch (brandSlug) {
    case 'phonak': return { 30: 1, 50: 2, 70: 3, 90: 4 }[n] || 1;
    case 'signia': return { 1: 1, 3: 2, 5: 3, 7: 4 }[n] || 1;
    case 'resound': return { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 7: 3, 9: 4, 61: 2, 62: 3 }[n] || 1;
    case 'oticon': return { 4: 1, 3: 2, 2: 3, 1: 4 }[n] || 1; // INVERTED
    case 'starkey': return { 16: 1, 20: 2, 24: 3 }[n] || 1;
    case 'widex': return { 110: 1, 220: 2, 330: 3, 440: 4 }[n] || 1;
    case 'unitron': return { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 }[n] || 1;
    case 'bernafon': return { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 }[n] || 1;
    default: return 1;
  }
}

function getMaxPosition(brand) {
  const brandSlug = BRAND_SLUGS[brand] || brand.toLowerCase();
  switch (brandSlug) {
    case 'phonak': return 4;
    case 'signia': return 4;
    case 'resound': return 4;
    case 'oticon': return 4;
    case 'starkey': return 3;
    case 'widex': return 4;
    case 'unitron': return 5;
    case 'bernafon': return 5;
    default: return 4;
  }
}

function slugify(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/charge\s*go/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getClasse(priceEur) {
  if (!priceEur || priceEur <= 0) return undefined;
  return priceEur <= 950 ? '1' : '2';
}

function interpolatePrice(minPrice, maxPrice, position, maxPosition) {
  if (!minPrice || !maxPrice || maxPosition <= 1) return undefined;
  const ratio = (position - 1) / (maxPosition - 1);
  return Math.round(minPrice + ratio * (maxPrice - minPrice));
}

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  });
}

function parseBool(val) {
  if (!val) return false;
  const v = val.toLowerCase().trim();
  return v === 'yes' || v.startsWith('yes') || v === 'true';
}

function buildModelSlug(brand, model) {
  const brandSlug = BRAND_SLUGS[brand] || slugify(brand);
  let cleanModel = model
    .replace(/Charge&Go\s*/gi, '')
    .replace(/\s+BCT$/i, '-bct')
    .replace(/\s+P-PR$/i, '')
    .replace(/Ultra Sphere/i, '')
    .replace(/\s+R$/i, '-r')
    .trim();
  return `${brandSlug}-${slugify(cleanModel)}`;
}

function cleanObj(obj) {
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '' || v === null) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const nested = cleanObj(v);
      if (Object.keys(nested).length > 0) clean[k] = nested;
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function main() {
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csv);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalFiles = 0;
  const allSlugs = new Set();

  for (const row of rows) {
    const brand = row.brand;
    const model = row.model;
    const brandSlug = BRAND_SLUGS[brand] || slugify(brand);
    const groupe = BRAND_GROUPE[brandSlug] || 'unknown';
    const formeType = normalizeFormeType(row.type || 'RIC');

    const eurMin = row.price_eur_min ? parseFloat(row.price_eur_min) : undefined;
    const eurMax = row.price_eur_max ? parseFloat(row.price_eur_max) : undefined;
    const usdMin = row.price_usd_pair_min ? parseFloat(row.price_usd_pair_min) : undefined;
    const usdMax = row.price_usd_pair_max ? parseFloat(row.price_usd_pair_max) : undefined;

    // Skip "N levels" patterns
    let techLevels = [];
    if (row.tech_levels && !/^\d+\s+levels?$/i.test(row.tech_levels.trim())) {
      techLevels = row.tech_levels.split('|').map(l => l.trim()).filter(Boolean);
    }

    const modelSlugBase = buildModelSlug(brand, model);

    const commonData = {
      marque: brandSlug,
      marqueLabel: brand,
      groupe,
      modele: model,
      formeType,
      formesDisponibles: row.form_factors || '',
      puce: row.chip || '',
      annee: parseInt(row.release_year) || 2024,
      specs: {
        canaux: row.channels_processing ? parseInt(row.channels_processing) || undefined : undefined,
        bandes: row.bands_adjustment ? parseInt(row.bands_adjustment) || undefined : undefined,
        batterie: row.battery_type || undefined,
        autonomie: row.battery_life_hours || undefined,
        ip: row.ip_rating || undefined,
        reductionBruit: row.noise_reduction_db ? parseFloat(row.noise_reduction_db) || undefined : undefined,
        plageAdaptation: row.fitting_range || undefined,
      },
      connectivite: {
        bluetooth: row.bluetooth || undefined,
        auracast: parseBool(row.auracast),
        application: row.app_name || undefined,
        mainLibre: parseBool(row.hands_free_calling),
      },
      fonctionnalites: {
        rechargeable: parseBool(row.rechargeable),
        bobineT: parseBool(row.telecoil),
        acouphenes: parseBool(row.tinnitus),
        antiFeedback: row.feedback_cancellation || undefined,
        micDirectionnels: row.directional_mics || undefined,
        capteursSante: row.health_sensors || undefined,
      },
      couleurs: row.colors_count ? parseInt(row.colors_count) || undefined : undefined,
      sourceUrl: row.source || undefined,
      venduEnEurope: parseBool(row.sold_in_europe),
    };

    if (techLevels.length > 0) {
      const maxPos = getMaxPosition(brand);
      for (const rawLevel of techLevels) {
        const cleanLvl = cleanLevel(rawLevel);
        const position = getNiveauPosition(brand, cleanLvl);
        const slug = `${modelSlugBase}-${cleanLvl}`;
        if (allSlugs.has(slug)) { console.warn(`⚠️  Duplicate: ${slug}`); continue; }
        allSlugs.add(slug);

        let levelEurPrice = undefined;
        if (eurMin && eurMax && techLevels.length > 1) {
          levelEurPrice = interpolatePrice(eurMin, eurMax, position, maxPos);
        } else if (eurMin && !eurMax) {
          levelEurPrice = eurMin;
        } else if (eurMin && eurMax && techLevels.length === 1) {
          levelEurPrice = eurMin;
        }

        const classe = getClasse(levelEurPrice);
        const skuData = cleanObj({
          ...commonData, slug, niveau: cleanLvl, niveauRaw: rawLevel,
          niveauPosition: position, classe, rac0: classe === '1',
          prix: {
            eur: levelEurPrice ? { unitaire: levelEurPrice } : undefined,
            usd: usdMin && usdMax ? { min: interpolatePrice(usdMin, usdMax, position, maxPos) } : undefined,
          },
        });
        if (skuData.prix?.usd?.min === undefined) delete skuData.prix?.usd;
        if (skuData.prix && Object.keys(skuData.prix).length === 0) delete skuData.prix;

        writeFileSync(join(OUTPUT_DIR, `${slug}.json`), JSON.stringify(skuData, null, 2), 'utf-8');
        totalFiles++;
      }
    } else {
      const slug = modelSlugBase;
      if (allSlugs.has(slug)) { console.warn(`⚠️  Duplicate: ${slug}`); continue; }
      allSlugs.add(slug);
      const classe = getClasse(eurMin);
      const skuData = cleanObj({
        ...commonData, slug, niveauPosition: 1, classe, rac0: classe === '1',
        prix: {
          eur: eurMin ? { min: eurMin, max: eurMax || undefined } : undefined,
          usd: usdMin ? { min: usdMin, max: usdMax || undefined } : undefined,
        },
      });
      if (skuData.prix && Object.keys(skuData.prix).length === 0) delete skuData.prix;
      writeFileSync(join(OUTPUT_DIR, `${slug}.json`), JSON.stringify(skuData, null, 2), 'utf-8');
      totalFiles++;
    }
  }
  console.log(`\n✅ ${totalFiles} fichiers JSON générés dans ${OUTPUT_DIR}`);
  console.log(`   ${allSlugs.size} SKUs uniques`);
}

main();
