import type { APIRoute } from 'astro';
import { getDownloads, addDownload, deleteDownload, getKV } from '../../lib/kv';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }

async function getR2(env: any) { return env?.BLOG_R2 || null; }

export const GET: APIRoute = async () => {
  const data = await getDownloads();
  data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const r2 = await getR2((globalThis as any).__BLOG_R2__);
    if (!r2) return new Response(JSON.stringify({ error: 'R2不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const fd = await request.formData(); const name = fd.get('name')?.toString().trim(); const desc = fd.get('description')?.toString().trim();
    const file = fd.get('file') as File | null;
    if (!name || !file || !file.size) return new Response(JSON.stringify({ error: '请填写名称并选择文件' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const key = `downloads/${id}.${ext}`;
    await r2.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
    const item = { id, name: name.slice(0, 100), description: (desc || '').slice(0, 300), filename: file.name, size: file.size, date: new Date().toISOString(), r2key: key };
    await addDownload(null, item);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '上传失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const r2 = await getR2((globalThis as any).__BLOG_R2__);
    const { id } = await request.json();
    const items = await getDownloads();
    const item = items.find((d: any) => d.id === id);
    if (item?.r2key && r2) await r2.delete(item.r2key);
    await deleteDownload(null, id);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
