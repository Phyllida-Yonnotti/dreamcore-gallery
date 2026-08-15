// src/pages/test-api.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ message: "Astro SSR 正常工作！" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};