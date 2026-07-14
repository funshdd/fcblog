import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    slug: z.string(),
    description: z.string().optional(),
    cover: z.string().optional(),
    tags: z.string().optional(),
    author: z.string().optional(),
  }),
});

export const collections = { blog };
