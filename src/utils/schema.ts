/**
 * Schema.org helpers — LeGuideAuditif.fr
 *
 * Fonctions pures de construction de JSON-LD. Utilisées par ArticleLayout,
 * GuideLayout et pages [...slug].astro pour émettre les schemas structurés
 * attendus par Google (MedicalWebPage, HowTo, Review, AggregateRating,
 * Person, MedicalOrganization, FAQPage, BreadcrumbList, LocalBusiness).
 *
 * Avantage durable vs concurrents : 9/9 concurrents audités n'ont pas de
 * schema santé complet — LGA doit systématiser pour tirer le maximum des
 * Rich Results Google 2026 sur requêtes YMYL.
 */

const SITE_URL = 'https://leguideauditif.fr';
const AUTHOR_ID = `${SITE_URL}/#author`;
const AUTHOR_URL = `${SITE_URL}/auteur/franck-olivier/`;
const ORG_ID = `${SITE_URL}/#organization`;

export type SchemaObject = Record<string, unknown>;

/** Person schema — Franck-Olivier (unique, réutilisé partout via @id) */
export function buildPersonSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': AUTHOR_ID,
    name: 'Franck-Olivier Chabbat',
    givenName: 'Franck-Olivier',
    familyName: 'Chabbat',
    jobTitle: "Audioprothésiste diplômé d'État",
    description:
      "Audioprothésiste DE, 28 ans d'expérience — Amplifon, Audika, 18 centres Afflelou, 5 ans Auzen.com, 3 000+ patients équipés.",
    url: AUTHOR_URL,
    sameAs: ['https://www.linkedin.com/in/franck-olivier-chabbat-/'],
    knowsAbout: [
      'Audiologie',
      'Audioprothèse',
      'Perte auditive',
      'Acouphènes',
      'Aides auditives',
      'Presbyacousie',
      '100 % Santé Audition',
    ],
  };
}

/** MedicalOrganization — LGA */
export function buildMedicalOrganizationSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    '@id': ORG_ID,
    name: 'LeGuideAuditif.fr',
    url: SITE_URL,
    logo: `${SITE_URL}/logo-lga.svg`,
    description:
      "Guide indépendant de l'audition par un audioprothésiste diplômé d'État. Conseils experts, comparatifs d'appareils auditifs, annuaire de centres référencés RPPS et INSEE/SIRENE.",
    areaServed: { '@type': 'Country', name: 'France' },
    medicalSpecialty: 'Audiology',
    founder: { '@id': AUTHOR_ID },
  };
}

/** MedicalWebPage — pages santé YMYL (guides + comparatifs appareils auditifs) */
export function buildMedicalWebPageSchema(options: {
  title: string;
  description: string;
  url: string;
  lastReviewed: Date;
  aboutCondition?: string;
  medicalAudience?: 'Patient' | 'MedicalResearch';
}): SchemaObject {
  const { title, description, url, lastReviewed, aboutCondition = 'Perte auditive', medicalAudience = 'Patient' } = options;
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: title,
    description,
    url,
    lastReviewed: lastReviewed.toISOString(),
    reviewedBy: { '@id': AUTHOR_ID },
    about: { '@type': 'MedicalCondition', name: aboutCondition },
    audience: { '@type': 'MedicalAudience', audienceType: medicalAudience },
    mainContentOfPage: { '@type': 'WebPageElement', cssSelector: '.article-content' },
  };
}

/** FAQPage — auto depuis frontmatter.faq */
export function buildFAQPageSchema(faqItems: { question: string; answer: string }[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** HowTo — étapes pour choisir / acheter / entretenir */
export function buildHowToSchema(options: {
  name: string;
  description: string;
  steps: { name: string; text: string; image?: string }[];
  totalTime?: string; /* ISO 8601 duration, ex: PT30M */
  estimatedCost?: { currency: string; value: string };
}): SchemaObject {
  const { name, description, steps, totalTime, estimatedCost } = options;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    ...(estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: estimatedCost.currency,
        value: estimatedCost.value,
      },
    }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  };
}

/** Review — pour un produit comparatif avec note expert */
export function buildReviewSchema(options: {
  itemName: string;
  itemBrand: string;
  reviewBody: string;
  rating: number;
  ratingMax?: number;
}): SchemaObject {
  const { itemName, itemBrand, reviewBody, rating, ratingMax = 10 } = options;
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: itemName,
      brand: { '@type': 'Brand', name: itemBrand },
    },
    author: { '@id': AUTHOR_ID },
    reviewBody,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: ratingMax,
      worstRating: 0,
    },
  };
}

/** AggregateRating — pour un comparatif avec notes multiples */
export function buildAggregateRatingSchema(ratings: number[], ratingMax = 10): SchemaObject | null {
  if (!ratings.length) return null;
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: Math.round(avg * 10) / 10,
    bestRating: ratingMax,
    worstRating: 0,
    ratingCount: ratings.length,
  };
}

/** BreadcrumbList */
export function buildBreadcrumbListSchema(trail: { label: string; url?: string }[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.url && { item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}` }),
    })),
  };
}

/** LocalBusiness — fiches centre (Action 10 future) */
export function buildLocalBusinessSchema(centre: {
  name: string;
  slug: string;
  address: { street?: string; postalCode: string; city: string };
  phone?: string;
  email?: string;
  geo?: { lat: number; lng: number };
  openingHours?: string[];
  priceRange?: string;
}): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HealthAndBeautyBusiness'],
    name: centre.name,
    url: `${SITE_URL}/centre/${centre.slug}/`,
    address: {
      '@type': 'PostalAddress',
      ...(centre.address.street && { streetAddress: centre.address.street }),
      postalCode: centre.address.postalCode,
      addressLocality: centre.address.city,
      addressCountry: 'FR',
    },
    ...(centre.phone && { telephone: centre.phone }),
    ...(centre.email && { email: centre.email }),
    ...(centre.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: centre.geo.lat,
        longitude: centre.geo.lng,
      },
    }),
    ...(centre.openingHours && { openingHours: centre.openingHours }),
    ...(centre.priceRange && { priceRange: centre.priceRange }),
  };
}

/** Article schema — post éditorial standard (déjà dans ArticleLayout mais exposé ici pour réutilisation) */
export function buildArticleSchema(options: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishDate: Date;
  updateDate?: Date;
  author: string;
  authorTitle: string;
}): SchemaObject {
  const { title, description, url, image, publishDate, updateDate, author, authorTitle } = options;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    ...(image && { image: image.startsWith('http') ? image : `${SITE_URL}${image}` }),
    author: {
      '@type': 'Person',
      '@id': AUTHOR_ID,
      name: author,
      jobTitle: authorTitle,
      url: AUTHOR_URL,
      sameAs: ['https://www.linkedin.com/in/franck-olivier-chabbat-/'],
    },
    datePublished: publishDate.toISOString(),
    ...(updateDate && { dateModified: updateDate.toISOString() }),
    publisher: {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'LeGuideAuditif.fr',
      url: SITE_URL,
    },
  };
}
