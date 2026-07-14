import type { APIRoute } from 'astro';
import { getCover } from '../../lib/kv';

export const GET: APIRoute = async ({ url, locals }) => {
  const kv = (locals as any).runtime?.env?.BLOG_KV; if (!kv) return new Response('Not Found', { status: 404 });
  const id = url.searchParams.get('id'); if (!id) return new Response('Not Found', { status: 404 });
  const c = await getCover(kv, id); if (!c) return new Response('Not Found', { status: 404 });
  const buf = Uint8Array.from(atob(c.data), c2 => c2.charCodeAt(0));
  return new Response(buf, { headers: { 'Content-Type': c.mime, 'Cache-Control': 'public, max-age=31536000' } });
};
