import { defineCollection, z } from 'astro:content';

const workCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    sector: z.string(),
    role: z.string(),
    duration: z.string(),
    stack: z.array(z.string()),
    results: z.array(z.object({
      metric: z.string(),
      value: z.string(),
    })),
    order: z.number().default(0),
    lang: z.enum(['en', 'zh']),
    translationKey: z.string(),
    draft: z.boolean().default(false),
  }),
});

const referenceCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lastReviewed: z.string(),
    relatedCaseStudy: z.string().optional(),
    relatedCaseStudySlug: z.string().optional(),
    order: z.number().default(0),
    lang: z.enum(['en', 'zh']),
    translationKey: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  work: workCollection,
  reference: referenceCollection,
};
