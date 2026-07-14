import type { APIRoute } from 'astro';
import { getKV } from '../../lib/kv';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) return new Response('Missing name', { status: 400 });
    const kv = await getKV();
    if (!kv) return new Response('KV unavailable', { status: 500 });
    const [data, mime] = await Promise.all([
      kv.get(`music:${name}:data`),
      kv.get(`music:${name}:mime`)
    ]);
    if (!data || !mime) return new Response('Not found', { status: 404 });
    const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    return new Response(binary, { headers: { 'Content-Type': mime } });
  } catch { return new Response('Error', { status: 500 }); }
};
