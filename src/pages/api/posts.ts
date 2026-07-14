import type { APIRoute } from 'astro';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }
function slugify(text: string): string { return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post'; }

function getKV(locals: any) {
  return (globalThis as any).__BLOG_KV__ || null;
}

export const GET: APIRoute = async ({ locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKV(locals);
  if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const list = (await kv.get('posts:list', 'json') as any[]) || [];
  list.sort((a: any, b: any) => b.date.localeCompare(a.date));
  return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKV(locals);
  if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!title || !content) return new Response(JSON.stringify({ error: '标题和内容不能为空' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const slug = slugify(title) + '-' + Date.now().toString(36);
    const date = customDate || new Date().toISOString().split('T')[0];
    const meta = { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' };
    await kv.put(`post:${slug}:meta`, JSON.stringify(meta));
    await kv.put(`post:${slug}:content`, content);
    let list = (await kv.get('posts:list', 'json') as any[]) || [];
    list.push({ slug, title, date, description: description || '', cover: cover || '', tags: tags || '', author: author || '' });
    await kv.put('posts:list', JSON.stringify(list));
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKV(locals);
  if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { slug, title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!slug || !title || !content) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const existingMeta = await kv.get(`post:${slug}:meta`, 'json') as any || {};
    const date = customDate || existingMeta.date || new Date().toISOString().split('T')[0];
    const meta = { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' };
    await kv.put(`post:${slug}:meta`, JSON.stringify(meta));
    await kv.put(`post:${slug}:content`, content);
    let list = (await kv.get('posts:list', 'json') as any[]) || [];
    const idx = list.findIndex((p: any) => p.slug === slug);
    const item = { slug, title, date, description: description || '', cover: cover || '', tags: tags || '', author: author || '' };
    if (idx >= 0) list[idx] = item; else list.push(item);
    await kv.put('posts:list', JSON.stringify(list));
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKV(locals);
  if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { filename } = await request.json();
    const slug = filename ? filename.replace('.md', '') : '';
    await kv.delete(`post:${slug}:meta`);
    await kv.delete(`post:${slug}:content`);
    let list = (await kv.get('posts:list', 'json') as any[]) || [];
    list = list.filter((p: any) => p.slug !== slug);
    await kv.put('posts:list', JSON.stringify(list));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
