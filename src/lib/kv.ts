function getKV(context: any): KVNamespace | null {
  try { return context?.locals?.runtime?.env?.BLOG_KV || null; } catch { return null; }
}

export function env(ctx: any) { return getKV(ctx); }

// ---- Posts ----

export async function getPostList(kv: KVNamespace) {
  const raw = await kv.get('posts:list', 'json');
  return (raw as any[]) || [];
}

export async function getPost(kv: KVNamespace, slug: string) {
  const [meta, content] = await Promise.all([
    kv.get(`post:${slug}:meta`, 'json'),
    kv.get(`post:${slug}:content`),
  ]);
  if (!meta || !content) return null;
  return { ...(meta as any), content };
}

export async function savePost(kv: KVNamespace, meta: any, content: string) {
  await kv.put(`post:${meta.slug}:meta`, JSON.stringify(meta));
  await kv.put(`post:${meta.slug}:content`, content);
  let list = await getPostList(kv);
  const idx = list.findIndex((p: any) => p.slug === meta.slug);
  const item = { slug: meta.slug, title: meta.title, date: meta.date, description: meta.description || '', cover: meta.cover || '', tags: meta.tags || '', author: meta.author || '', pinned: meta.pinned || false };
  if (idx >= 0) list[idx] = item; else list.push(item);
  await kv.put('posts:list', JSON.stringify(list));
}

export async function deletePost(kv: KVNamespace, slug: string) {
  await kv.delete(`post:${slug}:meta`);
  await kv.delete(`post:${slug}:content`);
  let list = await getPostList(kv);
  list = list.filter((p: any) => p.slug !== slug);
  await kv.put('posts:list', JSON.stringify(list));
}

// ---- Comments ----

export async function getComments(kv: KVNamespace, slug: string) {
  return (await kv.get(`comment:${slug}`, 'json')) as any[] || [];
}

export async function addComment(kv: KVNamespace, slug: string, comment: any) {
  const comments = await getComments(kv, slug);
  comments.push(comment);
  await kv.put(`comment:${slug}`, JSON.stringify(comments));
}

export async function deleteComment(kv: KVNamespace, slug: string, id: string) {
  let comments = await getComments(kv, slug);
  comments = comments.filter((c: any) => c.id !== id);
  if (comments.length) await kv.put(`comment:${slug}`, JSON.stringify(comments));
  else await kv.delete(`comment:${slug}`);
}

export async function getAllComments(kv: KVNamespace) {
  const posts = await getPostList(kv);
  const result: any[] = [];
  for (const p of posts) {
    const c = await getComments(kv, p.slug);
    if (c.length) result.push({ slug: p.slug, comments: c });
  }
  return result;
}

// ---- Covers ----

export async function saveCover(kv: KVNamespace, id: string, buffer: ArrayBuffer, mime: string) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  await kv.put(`cover:${id}:data`, b64);
  await kv.put(`cover:${id}:mime`, mime);
  return `/api/cover?id=${id}`;
}

export async function getCover(kv: KVNamespace, id: string) {
  const [data, mime] = await Promise.all([kv.get(`cover:${id}:data`), kv.get(`cover:${id}:mime`)]);
  if (!data || !mime) return null;
  return { data, mime };
}

// ---- Footprints ----

export async function getFootprints(kv: KVNamespace) {
  return (await kv.get('footprints:list', 'json')) as any[] || [];
}

export async function addFootprint(kv: KVNamespace, fp: any) {
  const list = await getFootprints(kv);
  list.push(fp);
  await kv.put('footprints:list', JSON.stringify(list));
}

export async function deleteFootprint(kv: KVNamespace, id: string) {
  let list = await getFootprints(kv);
  list = list.filter((f: any) => f.id !== id);
  await kv.put('footprints:list', JSON.stringify(list));
}

// ---- Map ----

export async function getMapMarkers(kv: KVNamespace, markerId?: string) {
  const all = (await kv.get('map:markers', 'json')) as any[] || [];
  if (markerId) return all.find((m: any) => m.id === markerId) || null;
  return all;
}

export async function saveMapMarker(kv: KVNamespace, marker: any) {
  const list = await getMapMarkers(kv);
  const idx = list.findIndex((m: any) => m.id === marker.id);
  if (idx >= 0) list[idx] = marker; else list.push(marker);
  await kv.put('map:markers', JSON.stringify(list));
}

export async function deleteMapMarker(kv: KVNamespace, markerId: string, photoId?: string) {
  const list = await getMapMarkers(kv);
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

// ---- Downloads ----

export async function getDownloads(kv: KVNamespace) {
  return (await kv.get('downloads:list', 'json')) as any[] || [];
}

export async function addDownload(kv: KVNamespace, item: any) {
  const list = await getDownloads(kv);
  list.push(item);
  await kv.put('downloads:list', JSON.stringify(list));
}

export async function deleteDownload(kv: KVNamespace, id: string) {
  let list = await getDownloads(kv);
  list = list.filter((d: any) => d.id !== id);
  await kv.put('downloads:list', JSON.stringify(list));
}

// ---- Music ----

export async function getMusicSongs(kv: KVNamespace) {
  return (await kv.get('music:songs', 'json')) as any[] || [];
}

export async function getMusicMeta(kv: KVNamespace) {
  return (await kv.get('music:meta', 'json')) as Record<string, any> || {};
}

export async function saveMusicMeta(kv: KVNamespace, meta: Record<string, any>) {
  await kv.put('music:meta', JSON.stringify(meta));
}

export async function addMusicSong(kv: KVNamespace, song: any) {
  const list = await getMusicSongs(kv);
  list.push(song);
  await kv.put('music:songs', JSON.stringify(list));
}

export async function deleteMusicSong(kv: KVNamespace, filename: string) {
  let list = await getMusicSongs(kv);
  list = list.filter((s: any) => s.filename !== filename);
  await kv.put('music:songs', JSON.stringify(list));
  const meta = await getMusicMeta(kv);
  delete meta[filename];
  await saveMusicMeta(kv, meta);
}
