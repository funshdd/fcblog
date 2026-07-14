import type { APIRoute } from 'astro';
import { marked } from 'marked';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { content } = await request.json();
    if (!content) {
      return new Response('无内容', { status: 400 });
    }

    const html = await marked.parse(content);
    const styled = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;color:#c9d1d9;line-height:1.7;margin:0;padding:0;}h1,h2,h3{color:#f0f6fc;}a{color:#58a6ff;}img{max-width:100%;}code{background:#21262d;padding:0.2em 0.4em;border-radius:4px;font-size:0.9em;}pre{background:#0d1117;padding:1rem;border-radius:6px;overflow-x:auto;}pre code{background:none;padding:0;}blockquote{border-left:3px solid #58a6ff;margin:0;padding:0.5rem 1rem;color:#8b949e;}</style></head><body>${html}</body></html>`;

    return new Response(styled, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return new Response('预览失败', { status: 500 });
  }
};
