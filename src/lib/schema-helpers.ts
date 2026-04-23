/**
 * Helpers JSON-LD partagés entre catalogue, comparatifs et articles.
 *
 * Contrainte Google : tout schema.org/Product doit porter au moins un
 * champ parmi offers, review, aggregateRating. Sinon l'URL est marquée
 * "non valide" dans GSC et perd l'éligibilité aux rich snippets.
 *
 * Contrainte projet (.claude/rules/affiliate.md) : fourchettes de prix
 * uniquement — jamais de prix exact dans le balisage.
 */

const AUTHOR_NAME = 'Franck-Olivier Chabbat';
const AUTHOR_JOB_TITLE = 'Audioprothésiste DE';
const SELLER_NAME = 'LeGuideAuditif.fr';

export interface PriceRange {
  lowPrice: number;
  highPrice: number;
}

/**
 * Extrait une fourchette de prix depuis une chaîne libre.
 * Supporte : "1500-2000€", "1 500 - 2 000 €", "À partir de 1500€",
 * "Dès 800 €", "Gratuit", "Sur devis".
 * Retourne null si aucun nombre exploitable n'est détecté ou si la
 * plage est invalide (high < low).
 */
export function parsePriceRange(range: string | undefined | null): PriceRange | null {
  if (!range) return null;
  const numbers = range
    .replace(/\s+/g, '')
    .match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;

  const parsed = numbers
    .map((n) => Number(n.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (parsed.length === 0) return null;
  if (parsed.length === 1) {
    // "À partir de 1500€" : on considère +25% comme borne haute par défaut.
    const [low] = parsed;
    return { lowPrice: low, highPrice: Math.round(low * 1.25) };
  }

  const lowPrice = Math.min(...parsed);
  const highPrice = Math.max(...parsed);
  if (highPrice < lowPrice) return null;
  return { lowPrice, highPrice };
}

export interface ProductSchemaInput {
  name: string;
  brand: string;
  description: string;
  category?: string;
  image?: string;
  url?: string;
  /** Fourchette déjà résolue (catalogue : prix.eur.min/max). */
  priceMin?: number;
  priceMax?: number;
  /** Fourchette en chaîne libre (comparatifs : priceRange). */
  priceRange?: string;
  /** Note expert /10. Si présente : émet aggregateRating + reviewRating. */
  score?: number;
  /** Corps du review. Fallback sur `description` si absent. */
  reviewBody?: string;
}

/**
 * Construit un objet schema.org/Product JSON-LD toujours valide
 * (review systématique signé Franck-Olivier DE — garantit la conformité
 * Google même sans score ni prix).
 */
export function buildProductSchema(input: ProductSchemaInput): Record<string, unknown> {
  const {
    name,
    brand,
    description,
    category,
    image,
    url,
    priceMin,
    priceMax,
    priceRange,
    score,
    reviewBody,
  } = input;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    brand: { '@type': 'Brand', name: brand },
    description,
  };

  if (category) schema.category = category;
  if (image) schema.image = image;
  if (url) schema.url = url;

  // ─── Review systématique (filet de sécurité Google + E-E-A-T YMYL) ───
  const review: Record<string, unknown> = {
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      jobTitle: AUTHOR_JOB_TITLE,
    },
    reviewBody: reviewBody ?? description,
  };
  if (typeof score === 'number' && score > 0) {
    review.reviewRating = {
      '@type': 'Rating',
      ratingValue: score,
      bestRating: 10,
      worstRating: 0,
    };
  }
  schema.review = review;

  // ─── aggregateRating si score disponible ───
  if (typeof score === 'number' && score > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: score,
      bestRating: 10,
      worstRating: 0,
      ratingCount: 1,
      reviewCount: 1,
    };
  }

  // ─── AggregateOffer (fourchette uniquement — règle affiliate) ───
  let lowPrice: number | undefined;
  let highPrice: number | undefined;
  if (typeof priceMin === 'number' && typeof priceMax === 'number') {
    lowPrice = priceMin;
    highPrice = priceMax;
  } else if (priceRange) {
    const parsed = parsePriceRange(priceRange);
    if (parsed) {
      lowPrice = parsed.lowPrice;
      highPrice = parsed.highPrice;
    }
  }

  if (typeof lowPrice === 'number' && typeof highPrice === 'number') {
    schema.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice,
      highPrice,
      offerCount: 1,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: SELLER_NAME },
    };
  }

  return schema;
}
