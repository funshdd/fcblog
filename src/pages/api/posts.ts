import type { APIRoute } from 'astro';
import { getKV, getPostList, savePost, deletePost } from '../../lib/kv';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }
function slugify(text: string): string { return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post'; }

export const GET: APIRoute = async ({ cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const list = await getPostList();
  list.sort((a: any, b: any) => b.date.localeCompare(a.date));
  return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const { title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!title || !content) return new Response(JSON.stringify({ error: '标题和内容不能为空' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const slug = slugify(title) + '-' + Date.now().toString(36);
    const date = customDate || new Date().toISOString().split('T')[0];
    await savePost(null, { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' }, content);
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const { slug, title, description, content, cover, tags, author, date: customDate } = await request.json();
    if (!slug || !title || !content) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const date = customDate || new Date().toISOString().split('T')[0];
    await savePost(null, { title, date, slug, description: description || '', cover: cover || '', tags: tags || '', author: author || '' }, content);
    return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const { filename } = await request.json();
    const slug = filename ? filename.replace('.md', '') : '';
    await deletePost(null, slug);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
