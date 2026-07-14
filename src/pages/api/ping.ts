import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ status: 'ok', time: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
