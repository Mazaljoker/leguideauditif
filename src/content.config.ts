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
    relatedGuides: z.array(z.string()).optional(),
  }),
});

export const collections = { guides, comparatifs };
