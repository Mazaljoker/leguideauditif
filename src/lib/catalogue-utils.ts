/**
 * Utilitaires pour le catalogue d'aides auditives
 * Nomenclature : Marque + Forme + Niveau + Puce
 */

// ─── Labels marques ──────────────────────────────────
export const BRAND_LABELS: Record<string, string> = {
  'phonak': 'Phonak', 'signia': 'Signia', 'resound': 'ReSound',
  'oticon': 'Oticon', 'starkey': 'Starkey', 'widex': 'Widex',
  'unitron': 'Unitron', 'bernafon': 'Bernafon', 'philips': 'Philips',
  'rexton': 'Rexton', 'audio-service': 'Audio Service', 'hansaton': 'Hansaton',
};

export const GROUPE_LABELS: Record<string, string> = {
  'sonova': 'Sonova', 'demant': 'Demant',
  'ws-audiology': 'WS Audiology', 'gn': 'GN', 'starkey': 'Starkey',
};

export const GROUPE_BRANDS: Record<string, string[]> = {
  'sonova': ['phonak', 'unitron', 'hansaton'],
  'demant': ['oticon', 'philips', 'bernafon'],
  'ws-audiology': ['signia', 'widex', 'rexton', 'audio-service'],
  'gn': ['resound'],
  'starkey': ['starkey'],
};

// ─── Types d'appareils ───────────────────────────────
export const FORME_TYPE_LABELS: Record<string, string> = {
  'RIC': 'Contour à écouteur déporté (RIC)',
  'BTE': 'Contour classique (BTE)',
  'ITE': 'Intra-auriculaire (ITE)',
  'ITC': 'Intra-canal (ITC)',
  'CIC': 'Complètement dans le conduit (CIC)',
  'IIC': 'Invisible (IIC)',
  'Slim RIC': 'Slim RIC ultra-discret',
  'Earbud': 'Format écouteur (Earbud)',
  'CROS': 'Système CROS',
};

export const FORME_TYPE_SHORT: Record<string, string> = {
  'RIC': 'RIC', 'BTE': 'Contour', 'ITE': 'Intra',
  'ITC': 'Intra-canal', 'CIC': 'Mini intra', 'IIC': 'Invisible',
  'Slim RIC': 'Slim RIC', 'Earbud': 'Écouteur', 'CROS': 'CROS',
};

// ─── Niveaux technologiques ──────────────────────────
export const NIVEAU_LABELS: Record<number, string> = {
  1: 'Essentiel',
  2: 'Confort',
  3: 'Avancé',
  4: 'Premium',
  5: 'Excellence',
};

// ─── Prix ────────────────────────────────────────────
export function formatPrice(price: number | undefined): string {
  if (!price) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

export function getProductPrice(product: any): number | undefined {
  return product.prix?.eur?.unitaire ?? product.prix?.eur?.min;
}

// ─── Classe française ────────────────────────────────
export function getClasseLabel(classe?: string): string {
  if (classe === '1') return 'Classe 1 — RAC 0€';
  if (classe === '2') return 'Classe 2';
  return '';
}

export function isClasse1(product: any): boolean {
  return product.classe === '1' || product.rac0 === true;
}

// ─── Tri et filtres ──────────────────────────────────
export type SortOption = 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc' | 'niveau-desc';

export function sortProducts(products: any[], sort: SortOption): any[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => (getProductPrice(a) ?? Infinity) - (getProductPrice(b) ?? Infinity));
    case 'price-desc':
      return sorted.sort((a, b) => (getProductPrice(b) ?? 0) - (getProductPrice(a) ?? 0));
    case 'year-desc':
      return sorted.sort((a, b) => (b.annee ?? 0) - (a.annee ?? 0));
    case 'name-asc':
      return sorted.sort((a, b) => `${a.marqueLabel} ${a.modele}`.localeCompare(`${b.marqueLabel} ${b.modele}`));
    case 'niveau-desc':
      return sorted.sort((a, b) => (b.niveauPosition ?? 0) - (a.niveauPosition ?? 0));
    default:
      return sorted;
  }
}

// ─── Grouper par modèle ─────────────────────────────
export function groupByModel(products: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const p of products) {
    const key = `${p.marque}-${p.modele}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  // Trier chaque groupe par niveauPosition
  for (const key of Object.keys(groups)) {
    groups[key].sort((a: any, b: any) => (a.niveauPosition ?? 0) - (b.niveauPosition ?? 0));
  }
  return groups;
}

// ─── URL helpers ─────────────────────────────────────
export function productUrl(slug: string): string {
  return `/catalogue/appareils/${slug}/`;
}

export function brandUrl(brand: string): string {
  return `/catalogue/marques/${brand}/`;
}

export function typeUrl(type: string): string {
  return `/catalogue/types/${type.toLowerCase().replace(/\s+/g, '-')}/`;
}

// ─── Schéma JSON-LD (Product) ────────────────────────
export function productJsonLd(product: any): Record<string, unknown> {
  const price = getProductPrice(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.marqueLabel} ${product.modele}${product.niveau ? ' ' + product.niveau : ''}`,
    brand: { '@type': 'Brand', name: product.marqueLabel },
    category: 'Aide auditive',
    description: `Aide auditive ${FORME_TYPE_SHORT[product.formeType] || product.formeType} ${product.marqueLabel} ${product.modele}`,
    ...(price && {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: price,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'LeGuideAuditif.fr' },
      },
    }),
  };
}
