import type { APIRoute } from 'astro';
import { getComments, addComment, deleteComment, getAllComments, getKV } from '../../lib/kv';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  const kv = await getKV(); if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const slug = url.searchParams.get('slug');
  if (slug) return new Response(JSON.stringify(await getComments(null, slug)), { headers: { 'Content-Type': 'application/json' } });
  if (url.searchParams.get('all') === '1') {
    if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(await getAllComments(null)), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { slug, name, content } = await request.json();
    if (!slug || !name || !content) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const comment = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: name.trim().slice(0, 50), content: content.trim().slice(0, 2000), date: new Date().toISOString() };
    await addComment(null, slug, comment);
    return new Response(JSON.stringify({ success: true, comment }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { slug, id } = await request.json();
    if (!slug || !id) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    await deleteComment(null, slug, id);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
