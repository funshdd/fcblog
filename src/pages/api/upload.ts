import type { APIRoute } from 'astro';
import { saveCover, getKV } from '../../lib/kv';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  if (cookies.get('auth')?.value !== 'funsh') return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKV(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const fd = await request.formData(); const file = fd.get('file') as File | null;
    if (!file || !file.size) return new Response(JSON.stringify({ error: '请选择文件' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (file.size > 3 * 1024 * 1024) return new Response(JSON.stringify({ error: '文件不能超过3MB' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return new Response(JSON.stringify({ error: '仅支持jpg/png/webp' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.' + ext;
    const url = await saveCover(kv, id, await file.arrayBuffer(), file.type || 'image/' + ext);
    return new Response(JSON.stringify({ success: true, url }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '上传失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
