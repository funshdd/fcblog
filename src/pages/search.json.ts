import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');
  const data = posts.map((p) => ({
    title: p.data.title,
    slug: p.data.slug,
    description: p.data.description || '',
    date: p.data.date.toISOString().split('T')[0],
  }));
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
