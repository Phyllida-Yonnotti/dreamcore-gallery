import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename') || 'avatar.jpg';

    // 🌟 1. 拦截空请求体检查，防止类型为 null 报错
    if (!request.body) {
      return new Response(JSON.stringify({ error: '请求体不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;

    // 🌟 2. 此时 request.body 已经被收窄（Type Narrowing），不再为 null
    const blob = await put(`thai/${filename}`, request.body, {
      access: 'public',
      token: customToken,
    });

    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};