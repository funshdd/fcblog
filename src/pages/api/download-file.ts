import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    const kv = (locals as any).runtime?.env?.BLOG_KV;
    const [data, mime, name] = await Promise.all([
      kv.get(`download:${id}:data`),
      kv.get(`download:${id}:mime`),
      kv.get(`download:${id}:name`)
    ]);
    if (!data || !mime) return new Response('Not found', { status: 404 });
    const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    return new Response(binary, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${name || 'download'}"`
      }
    });
  } catch { return new Response('Error', { status: 500 }); }
};
