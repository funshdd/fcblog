import type { APIRoute } from 'astro';
import { getMapMarkers, saveMapMarker, deleteMapMarker } from '../../lib/kv';

function getKv(locals: any) { try { return locals.runtime.env.BLOG_KV; } catch { return null; } }
function checkAuth(c: any) { return c.get('auth')?.value === 'funsh'; }

export const GET: APIRoute = async ({ url, locals }) => {
  const kv = getKv(locals); if (!kv) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  const id = url.searchParams.get('id');
  if (id) { const m = await getMapMarkers(kv, id); return new Response(JSON.stringify(m || null), { headers: { 'Content-Type': 'application/json' } }); }
  const all = await getMapMarkers(kv);
  const summary = all.map((m: any) => ({ id: m.id, lat: m.lat, lng: m.lng, title: m.title, count: m.photos.length, color: m.color || '#f85149' }));
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const fd = await request.formData();
    const lat = parseFloat(fd.get('lat')?.toString() || ''); const lng = parseFloat(fd.get('lng')?.toString() || '');
    const title = fd.get('title')?.toString().trim() || ''; const markerId = fd.get('markerId')?.toString() || '';
    const uploader = fd.get('uploader')?.toString().trim() || '匿名'; const note = fd.get('note')?.toString().trim() || '';
    const customDate = fd.get('date')?.toString() || ''; const color = fd.get('color')?.toString() || '#f85149';
    const file = fd.get('photo') as File | null;
    if (isNaN(lat) || isNaN(lng) || !file || !file.size) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (file.size > 5 * 1024 * 1024) return new Response(JSON.stringify({ error: '图片不能超过5MB' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const photoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
    await kv.put(`cover:${photoId}:data`, b64);
    await kv.put(`cover:${photoId}:mime`, file.type || 'image/' + ext);
    const photo = { id: photoId, src: '/api/cover?id=' + photoId, uploader: uploader.slice(0, 30), date: customDate || new Date().toISOString(), note: note.slice(0, 200) };
    const all = await getMapMarkers(kv);
    if (markerId) {
      const m = all.find((x: any) => x.id === markerId);
      if (m) m.photos.push(photo);
    } else {
      all.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lat, lng, title: title.slice(0, 100), photos: [photo], color });
    }
    await kv.put('map:markers', JSON.stringify(all));
    const result = all.find((m: any) => markerId ? m.id === markerId : m.photos.some((p: any) => p.id === photoId));
    return new Response(JSON.stringify({ success: true, marker: result }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '上传失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { markerId, photoId } = await request.json();
    await deleteMapMarker(kv, markerId, photoId);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const kv = getKv(locals); if (!kv) return new Response(JSON.stringify({ error: 'KV不可用' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  try {
    const { markerId, photoId, uploader, note, date: customDate } = await request.json();
    const all = await getMapMarkers(kv); const m = all.find((x: any) => x.id === markerId);
    if (!m) return new Response(JSON.stringify({ error: '不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    const p = m.photos.find((x: any) => x.id === photoId);
    if (!p) return new Response(JSON.stringify({ error: '不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    if (uploader !== undefined) p.uploader = uploader.slice(0, 30);
    if (note !== undefined) p.note = note.slice(0, 200);
    if (customDate) p.date = customDate;
    await kv.put('map:markers', JSON.stringify(all));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '更新失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
