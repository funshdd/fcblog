let _env: any = undefined;

async function resolveEnv(): Promise<any> {
  if (_env !== undefined) return _env;
  try {
    const mod = await import('cloudflare:workers');
    _env = mod.env;
  } catch {
    _env = null;
  }
  return _env;
}

export async function getKV(): Promise<KVNamespace | null> {
  const env = await resolveEnv();
  return env?.BLOG_KV || null;
}

export async function getPostList(_kv?: KVNamespace) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  const raw = await kv.get('posts:list', 'json');
  return (raw as any[]) || [];
}

export async function getPost(_kv: KVNamespace | null, slug: string) {
  const kv = _kv || await getKV();
  if (!kv) return null;
  const [meta, content] = await Promise.all([
    kv.get(`post:${slug}:meta`, 'json'),
    kv.get(`post:${slug}:content`),
  ]);
  if (!meta || !content) return null;
  return { ...(meta as any), content };
}

export async function savePost(_kv: KVNamespace | null, meta: any, content: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  await kv.put(`post:${meta.slug}:meta`, JSON.stringify(meta));
  await kv.put(`post:${meta.slug}:content`, content);
  let list = await getPostList(kv);
  const idx = list.findIndex((p: any) => p.slug === meta.slug);
  const item = { slug: meta.slug, title: meta.title, date: meta.date, description: meta.description || '', cover: meta.cover || '', tags: meta.tags || '', author: meta.author || '', pinned: meta.pinned || false };
  if (idx >= 0) list[idx] = item; else list.push(item);
  await kv.put('posts:list', JSON.stringify(list));
}

export async function deletePost(_kv: KVNamespace | null, slug: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  await kv.delete(`post:${slug}:meta`);
  await kv.delete(`post:${slug}:content`);
  let list = await getPostList(kv);
  list = list.filter((p: any) => p.slug !== slug);
  await kv.put('posts:list', JSON.stringify(list));
}

export async function getComments(_kv: KVNamespace | null, slug: string) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  return (await kv.get(`comment:${slug}`, 'json')) as any[] || [];
}

export async function addComment(_kv: KVNamespace | null, slug: string, comment: any) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const comments = await getComments(kv, slug);
  comments.push(comment);
  await kv.put(`comment:${slug}`, JSON.stringify(comments));
}

export async function deleteComment(_kv: KVNamespace | null, slug: string, id: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  let comments = await getComments(kv, slug);
  comments = comments.filter((c: any) => c.id !== id);
  if (comments.length) await kv.put(`comment:${slug}`, JSON.stringify(comments));
  else await kv.delete(`comment:${slug}`);
}

export async function getAllComments(_kv?: KVNamespace | null) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  const posts = await getPostList(kv);
  const result: any[] = [];
  for (const p of posts) {
    const c = await getComments(kv, p.slug);
    if (c.length) result.push({ slug: p.slug, comments: c });
  }
  return result;
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i += 1024) {
    str += String.fromCharCode(...bytes.slice(i, i + 1024));
  }
  return btoa(str);
}

export async function saveCover(_kv: KVNamespace | null, id: string, buffer: ArrayBuffer, mime: string) {
  const kv = _kv || await getKV();
  if (!kv) return `/covers/${id}`;
  const b64 = bufferToBase64(buffer);
  await kv.put(`cover:${id}:data`, b64);
  await kv.put(`cover:${id}:mime`, mime);
  return `/api/cover?id=${id}`;
}

export async function getCover(_kv: KVNamespace | null, id: string) {
  const kv = _kv || await getKV();
  if (!kv) return null;
  const [data, mime] = await Promise.all([kv.get(`cover:${id}:data`), kv.get(`cover:${id}:mime`)]);
  if (!data || !mime) return null;
  return { data, mime };
}

export async function getFootprints(_kv?: KVNamespace | null) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  return (await kv.get('footprints:list', 'json')) as any[] || [];
}

export async function addFootprint(_kv: KVNamespace | null, fp: any) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const list = await getFootprints(kv);
  list.push(fp);
  await kv.put('footprints:list', JSON.stringify(list));
}

export async function deleteFootprint(_kv: KVNamespace | null, id: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  let list = await getFootprints(kv);
  list = list.filter((f: any) => f.id !== id);
  await kv.put('footprints:list', JSON.stringify(list));
}

export async function getMapMarkers(_kv?: KVNamespace | null, markerId?: string) {
  const kv = _kv || await getKV();
  if (!kv) return markerId ? null : [];
  const all = (await kv.get('map:markers', 'json')) as any[] || [];
  if (markerId) return all.find((m: any) => m.id === markerId) || null;
  return all;
}

export async function saveMapMarker(_kv: KVNamespace | null, marker: any) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const list = await getMapMarkers(kv) as any[];
  const idx = list.findIndex((m: any) => m.id === marker.id);
  if (idx >= 0) list[idx] = marker; else list.push(marker);
  await kv.put('map:markers', JSON.stringify(list));
}

export async function deleteMapMarker(_kv: KVNamespace | null, markerId: string, photoId?: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const list = await getMapMarkers(kv) as any[];
  const marker = list.find((m: any) => m.id === markerId);
  if (!marker) return;
  if (photoId) {
    marker.photos = marker.photos.filter((p: any) => p.id !== photoId);
    if (!marker.photos.length) { const i = list.indexOf(marker); if (i >= 0) list.splice(i, 1); }
  } else {
    const i = list.indexOf(marker); if (i >= 0) list.splice(i, 1);
  }
  await kv.put('map:markers', JSON.stringify(list));
}

export async function getDownloads(_kv?: KVNamespace | null) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  return (await kv.get('downloads:list', 'json')) as any[] || [];
}

export async function addDownload(_kv: KVNamespace | null, item: any) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const list = await getDownloads(kv);
  list.push(item);
  await kv.put('downloads:list', JSON.stringify(list));
}

export async function deleteDownload(_kv: KVNamespace | null, id: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  let list = await getDownloads(kv);
  list = list.filter((d: any) => d.id !== id);
  await kv.put('downloads:list', JSON.stringify(list));
}

export async function getMusicSongs(_kv?: KVNamespace | null) {
  const kv = _kv || await getKV();
  if (!kv) return [];
  return (await kv.get('music:songs', 'json')) as any[] || [];
}

export async function getMusicMeta(_kv?: KVNamespace | null) {
  const kv = _kv || await getKV();
  if (!kv) return {};
  return (await kv.get('music:meta', 'json')) as Record<string, any> || {};
}

export async function saveMusicMeta(_kv: KVNamespace | null, meta: Record<string, any>) {
  const kv = _kv || await getKV();
  if (!kv) return;
  await kv.put('music:meta', JSON.stringify(meta));
}

export async function addMusicSong(_kv: KVNamespace | null, song: any) {
  const kv = _kv || await getKV();
  if (!kv) return;
  const list = await getMusicSongs(kv);
  list.push(song);
  await kv.put('music:songs', JSON.stringify(list));
}

export async function deleteMusicSong(_kv: KVNamespace | null, filename: string) {
  const kv = _kv || await getKV();
  if (!kv) return;
  let list = await getMusicSongs(kv);
  list = list.filter((s: any) => s.filename !== filename);
  await kv.put('music:songs', JSON.stringify(list));
  const meta = await getMusicMeta(kv);
  delete meta[filename];
  await saveMusicMeta(kv, meta);
}
