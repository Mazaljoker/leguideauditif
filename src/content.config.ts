import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    metaDescription: z.string().max(155),
    cluster: z.enum([
      'perte-auditive',
      'appareils-auditifs',
      'acouphenes',
      'prevention',
      'remboursement',
      'vie-quotidienne',
      'audioprothesiste',
    ]),
    isPillar: z.boolean().default(false),
    publishDate: z.coerce.date(),
    updateDate: z.coerce.date().optional(),
    author: z.string().default('Franck-Olivier'),
    authorTitle: z.string().default("Audioprothesiste DE"),
    readingTime: z.number().optional(),
    sources: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
        }),
      )
      .optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .optional(),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    relatedGuides: z.array(z.string()).optional(),
    relatedComparatifs: z.array(z.string()).optional(),
  }),
});

const comparatifs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/comparatifs' }),
  schema: z.object({
    title: z.string(),
    metaDescription: z.string().max(155),
    category: z.enum([
      'appareils-auditifs',
      'protections-auditives',
      'accessoires',
      'aides-ecoute',
    ]),
    publishDate: z.coerce.date(),
    updateDate: z.coerce.date().optional(),
    author: z.string().default('Franck-Olivier'),
    authorTitle: z.string().default("Audioprothesiste DE"),
    products: z
      .array(
        z.object({
          brand: z.string(),
          model: z.string(),
          type: z.enum(['contour', 'RIC', 'intra', 'invisible']).optional(),
          class: z.enum(['1', '2']).optional(),
          priceRange: z.string(),
          channels: z.number().optional(),
          bluetooth: z.boolean().default(false),
          rechargeable: z.boolean().default(false),
          warrantyYears: z.number().default(4),
          verdict: z.string(),
          bestFor: z.string(),
          affiliateUrl: z.string().url().optional(),
        }),
      )
      .optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .optional(),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    relatedGuides: z.array(z.string()).optional(),
  }),
});

// ─── Catalogue Appareils Auditifs ───────────────────────────
// Nomenclature fabricant : Marque + Forme + Niveau + Puce
// Ex: Phonak Audéo Lumity 90, Signia Styletto IX 7, Oticon Intent 1
// Chaque SKU = un niveau technologique d'un modèle
// ~139 SKUs, 58 modèles, 12 marques, 4 groupes industriels

const catalogueAppareils = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/catalogue-appareils' }),
  schema: z.object({
    // ── Nomenclature Marque + Forme + Niveau + Puce ──
    slug: z.string(),
    marque: z.enum([
      'phonak', 'signia', 'resound', 'oticon', 'starkey', 'widex',
      'unitron', 'bernafon', 'philips', 'rexton', 'audio-service', 'hansaton',
    ]),
    marqueLabel: z.string(),
    groupe: z.enum(['sonova', 'demant', 'ws-audiology', 'gn', 'starkey']),
    modele: z.string(),                  // Nom commercial: "Audéo Lumity"
    formeType: z.enum(['RIC', 'BTE', 'ITE', 'ITC', 'CIC', 'IIC', 'Slim RIC', 'Earbud', 'CROS']),
    formesDisponibles: z.string().optional(), // "RIC R|RIC RT|Slim"
    puce: z.string().optional(),          // "IX Platform", "Sirius", "ERA"

    // ── Niveau technologique ──
    niveau: z.string().optional(),        // "90", "7", "440"
    niveauRaw: z.string().optional(),     // "L90", "7IX", "440"
    niveauPosition: z.number().min(1).max(5), // 1=entrée → 4-5=premium (normalisé)

    // ── Classification française ──
    classe: z.enum(['1', '2']).optional(),
    rac0: z.boolean().default(false),     // Reste à Charge 0 (100% Santé)

    // ── Prix ──
    prix: z.object({
      eur: z.object({
        unitaire: z.number().optional(),  // Prix unitaire estimé EUR
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      usd: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
    }).optional(),

    // ── Année de sortie ──
    annee: z.number(),

    // ── Specs techniques ──
    specs: z.object({
      canaux: z.number().optional(),
      bandes: z.number().optional(),
      batterie: z.string().optional(),       // "Li-ion", "312", "675"
      autonomie: z.string().optional(),      // "16-18", "39"
      ip: z.string().optional(),             // "IP68"
      reductionBruit: z.number().optional(), // dB
      plageAdaptation: z.string().optional(),// "Mild to severe"
      poids: z.string().optional(),
    }).optional(),

    // ── Connectivité ──
    connectivite: z.object({
      bluetooth: z.string().optional(),      // "BLE LE Audio"
      auracast: z.boolean().default(false),
      application: z.string().optional(),    // "myPhonak"
      mainLibre: z.boolean().default(false),
    }).optional(),

    // ── Fonctionnalités ──
    fonctionnalites: z.object({
      rechargeable: z.boolean().default(false),
      bobineT: z.boolean().default(false),
      acouphenes: z.boolean().default(false),
      antiFeedback: z.string().optional(),
      micDirectionnels: z.string().optional(),
      capteursSante: z.string().optional(),
    }).optional(),

    // ── Meta ──
    couleurs: z.number().optional(),
    image: z.string().optional(),
    sourceUrl: z.string().optional(),
    venduEnEurope: z.boolean().default(true),

    // ── Editorial ──
    descriptionCourte: z.string().optional(),
    pointsForts: z.array(z.string()).optional(),
    pointsFaibles: z.array(z.string()).optional(),
    noteExpert: z.number().min(0).max(10).optional(),
    enAvant: z.boolean().default(false),

    // ── SEO ──
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }),
});

export const collections = { guides, comparatifs, catalogueAppareils };
