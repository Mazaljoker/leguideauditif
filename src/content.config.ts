import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().max(60),
    description: z.string().max(155),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum([
      'perte-auditive',
      'appareils-auditifs',
      'acouphenes',
      'prevention',
      'remboursement',
      'vie-quotidienne',
    ]),
    author: z.string().default('Franck-Olivier, Audioprothésiste DE'),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    lang: z.literal('fr').default('fr'),
    alternate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    schema: z.object({
      type: z.enum(['Article', 'FAQPage', 'HowTo']).default('Article'),
      datePublished: z.string(),
      dateModified: z.string(),
      author: z.string().default('Franck-Olivier'),
      publisher: z.string().default('LeGuideAuditif.fr'),
    }),
    draft: z.boolean().default(false),
  }),
});

const comparatifs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/comparatifs' }),
  schema: z.object({
    title: z.string().max(60),
    description: z.string().max(155),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum([
      'appareils-auditifs',
      'protections-auditives',
      'accessoires',
      'aides-ecoute',
    ]),
    author: z.string().default('Franck-Olivier, Audioprothésiste DE'),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    lang: z.literal('fr').default('fr'),
    alternate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    productsCompared: z.number().min(2),
    affiliateDisclosure: z.boolean().default(true),
    schema: z.object({
      type: z.literal('Article').default('Article'),
      datePublished: z.string(),
      dateModified: z.string(),
      author: z.string().default('Franck-Olivier'),
      publisher: z.string().default('LeGuideAuditif.fr'),
    }),
    products: z.array(z.object({
      brand: z.string(),
      model: z.string(),
      type: z.enum(['contour', 'intra', 'RIC', 'invisible']),
      class: z.enum(['1', '2']),
      priceRange: z.string(),
      channels: z.number(),
      bluetooth: z.boolean(),
      rechargeable: z.boolean(),
      warrantyYears: z.number(),
      verdict: z.string(),
      bestFor: z.string(),
      affiliateUrl: z.string().nullable().optional(),
    })).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides, comparatifs };