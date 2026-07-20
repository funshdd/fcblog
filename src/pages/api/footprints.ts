import type { APIRoute } from 'astro';
import { getFootprints, addFootprint, deleteFootprint, getKV, bufferToBase64 } from '../../lib/kv';

export const GET: APIRoute = async ({ locals }) => {
  const kv = await getKV(); if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const data = await getFootprints(null);
  data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const fd = await request.formData();
    const username = fd.get('username')?.toString().trim(); const message = fd.get('message')?.toString().trim();
    const color = fd.get('color')?.toString() || '#ffffff'; const avatarFile = fd.get('avatar') as File | null;
    if (!username || !message) return new Response(JSON.stringify({ error: '请填写用户名和留言' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    let avatar = '';
    if (avatarFile && avatarFile.size > 0 && avatarFile.size < 2 * 1024 * 1024) {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const id = 'fp-' + Date.now().toString(36) + '.' + ext;
      const b64 = bufferToBase64(await avatarFile.arrayBuffer());
      await kv.put(`cover:${id}:data`, b64);
      await kv.put(`cover:${id}:mime`, avatarFile.type || 'image/' + ext);
      avatar = '/api/cover?id=' + id;
    }
    const fp = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), username: username.slice(0, 30), message: message.slice(0, 500), date: new Date().toISOString(), color, avatar };
    await addFootprint(null, fp);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '提交失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (cookies.get('auth')?.value !== 'funsh') return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { id } = await request.json();
    await deleteFootprint(null, id);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (cookies.get('auth')?.value !== 'funsh') return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = await getKV(); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const fd = await request.formData();
    const id = fd.get('id')?.toString();
    const username = fd.get('username')?.toString().trim();
    const message = fd.get('message')?.toString().trim();
    const color = fd.get('color')?.toString().trim();
    const avatarFile = fd.get('avatar') as File | null;
    if (!id) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const list = await getFootprints(null);
    const fp = list.find((f: any) => f.id === id);
    if (!fp) return new Response(JSON.stringify({ error: '不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    if (username !== undefined) fp.username = username.slice(0, 30);
    if (message !== undefined) fp.message = message.slice(0, 500);
    if (color !== undefined) fp.color = color;
    if (avatarFile && avatarFile.size > 0 && avatarFile.size < 2 * 1024 * 1024) {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const imgId = 'fp-' + Date.now().toString(36) + '.' + ext;
      const b64 = bufferToBase64(await avatarFile.arrayBuffer());
      await kv.put(`cover:${imgId}:data`, b64);
      await kv.put(`cover:${imgId}:mime`, avatarFile.type || 'image/' + ext);
      fp.avatar = '/api/cover?id=' + imgId;
    }
    await kv.put('footprints:list', JSON.stringify(list));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || '更新失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
