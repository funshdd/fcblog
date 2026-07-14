import type { APIRoute } from 'astro';
import { getMusicSongs, getMusicMeta, getKV } from '../../lib/kv';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const kv = getKV(locals);
    const songs = await getMusicSongs(kv);
    const meta = await getMusicMeta(kv);
    const result = songs.map((s: any) => {
      const m = meta[s.filename] || {};
      return {
        name: m.name || s.name || s.filename?.replace('.mp3', ''),
        artist: m.artist || s.artist || '',
        cover: m.cover || s.cover || '',
        src: `/api/music-file?name=${encodeURIComponent(s.filename)}`
      };
    });
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); }
};
