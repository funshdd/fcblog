import type { APIRoute } from 'astro';
import { getDownloads, addDownload, deleteDownload } from '../../lib/kv';

function getKv(locals: any) { try { return locals.runtime.env.BLOG_KV; } catch { return null; } }

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  const kv = getKv(locals); if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const data = await getDownloads(kv);
  data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (cookies.get('auth')?.value !== 'funsh') return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const fd = await request.formData(); const name = fd.get('name')?.toString().trim(); const desc = fd.get('description')?.toString().trim();
    const file = fd.get('file') as File | null;
    if (!name || !file || !file.size) return new Response(JSON.stringify({ error: '请填写名称并选择文件' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (file.size > 100 * 1024 * 1024) return new Response(JSON.stringify({ error: '文件不能超过100MB' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const b64 = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
    await kv.put(`download:${id}:data`, b64);
    await kv.put(`download:${id}:mime`, file.type || 'application/octet-stream');
    await kv.put(`download:${id}:name`, file.name);
    const item = { id, name: name.slice(0, 100), description: (desc || '').slice(0, 300), filename: file.name, size: file.size, date: new Date().toISOString() };
    await addDownload(kv, item);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '上传失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (cookies.get('auth')?.value !== 'funsh') return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { id } = await request.json();
    await kv.delete(`download:${id}:data`); await kv.delete(`download:${id}:mime`); await kv.delete(`download:${id}:name`);
    await deleteDownload(kv, id);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
