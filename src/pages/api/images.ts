import { list } from '@vercel/blob';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // 读取自定义 Token 或 默认 Token
    const token = import.meta.env.BLOB_PUBLIC_READ_WRITE_TOKEN || import.meta.env.BLOB_READ_WRITE_TOKEN;

    const { blobs } = await list({
      prefix: 'thai/',
      token: token,
    });

    const imageUrls = blobs
      .map((blob) => blob.url)
      .filter((url) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url));

    return new Response(JSON.stringify(imageUrls), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Failed to fetch images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};