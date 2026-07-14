import type { APIRoute } from 'astro';
import { getMusicSongs, getMusicMeta, saveMusicMeta, addMusicSong, deleteMusicSong, getKV } from '../../lib/kv';

function checkAuth(cookies: any) { return cookies.get('auth')?.value === 'funsh'; }

export const GET: APIRoute = async ({ cookies, locals }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const kv = getKV(locals);
    const songs = await getMusicSongs(kv);
    const meta = await getMusicMeta(kv);
    const data = songs.map((s: any) => {
      const m = meta[s.filename] || {};
      return { filename: s.filename, name: m.name || s.name || s.filename?.replace('.mp3', ''), artist: m.artist || s.artist || '', cover: m.cover || s.cover || '', size: s.size || 0 };
    });
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); }
};

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.size) return new Response(JSON.stringify({ error: '请选择文件' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (file.size > 50 * 1024 * 1024) return new Response(JSON.stringify({ error: '文件不能超过50MB' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mp3') return new Response(JSON.stringify({ error: '仅支持 MP3 格式' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    let name = file.name.replace(/[^\w\u4e00-\u9fff\-\.\s]/g, '').replace(/\s+/g, '-') || 'music.mp3';
    const kv = getKV(locals);
    const songs = await getMusicSongs(kv);
    if (songs.some((s: any) => s.filename === name)) name = Date.now().toString(36) + '-' + name;
    const buffer = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    await kv.put(`music:${name}:data`, b64);
    await kv.put(`music:${name}:mime`, file.type || 'audio/mpeg');
    await addMusicSong(kv, { filename: name, size: file.size });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '上传失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const { name } = await request.json();
    if (!name) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const kv = getKV(locals);
    await kv.delete(`music:${name}:data`);
    await kv.delete(`music:${name}:mime`);
    await deleteMusicSong(kv, name);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '删除失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const PUT: APIRoute = async ({ request, cookies, locals }) => {
  if (!checkAuth(cookies)) return new Response(JSON.stringify({ error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  try {
    const { filename, name, artist, cover } = await request.json();
    if (!filename) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const kv = getKV(locals);
    const meta = await getMusicMeta(kv);
    meta[filename] = { name: name || '', artist: artist || '', cover: cover || '' };
    await saveMusicMeta(kv, meta);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response(JSON.stringify({ error: '更新失败' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
