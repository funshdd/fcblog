import type { APIRoute } from 'astro';
import { getDownloads } from '../../lib/kv';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    const items = await getDownloads();
    const item = items.find((d: any) => d.id === id);
    if (!item?.r2key) return new Response('Not found', { status: 404 });
    const r2 = (globalThis as any).__BLOG_R2__;
    if (!r2) return new Response('R2 unavailable', { status: 500 });
    const obj = await r2.get(item.r2key);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${item.filename || 'download'}"`,
        'Cache-Control': 'public, max-age=31536000',
      }
    });
  } catch { return new Response('Error', { status: 500 }); }
};
