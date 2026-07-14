import type { APIRoute } from 'astro';
import { getPostList, getPost, savePost, deletePost } from '../../lib/kv';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }
function slugify(text: string): string { return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post'; }
function getKv(locals: any) {
  try {
    if (locals.runtime?.env?.BLOG_KV) return locals.runtime.env.BLOG_KV;
    if ((globalThis as any).BLOG_KV) return (globalThis as any).BLOG_KV;
    return null;
  } catch { return null; }
}

export const GET: APIRoute = async ({ locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const list = await getPostList(kv);
  const result = [];
  for (const p of list) {
    const post = await getPost(kv, p.slug);
    if (post) result.push({ ...p, filename: p.slug + '.md', content: post.content });
  }
  result.sort((a: any, b: any) => b.date.localeCompare(a.date));
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals);
  if (!kv) {
    console.error('KV not available. locals:', JSON.stringify(Object.keys(locals || {})));
    return new Response(JSON.stringify({ error: 'KV不可用，请确认 Workers 已绑定 BLOG_KV' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!title || !content) return new Response(JSON.stringify({ error: '标题和内容不能为空' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const slug = slugify(title) + '-' + Date.now().toString(36);
    const date = customDate || new Date().toISOString().split('T')[0];
    const meta = { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' };
    await savePost(kv, meta, content);
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { slug, title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!slug || !title || !content) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const existing = await getPost(kv, slug);
    const date = customDate || existing?.date || new Date().toISOString().split('T')[0];
    const meta = { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' };
    await savePost(kv, meta, content);
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { filename } = await request.json();
    const slug = filename ? filename.replace('.md', '') : '';
    if (!slug) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    await deletePost(kv, slug);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
