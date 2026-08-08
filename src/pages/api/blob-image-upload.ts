import type { APIRoute } from 'astro';
import { list } from '@vercel/blob';

export const GET: APIRoute = async () => {
  try {
    // 关键：从 process.env 显式获取你指定的 Token 变量
    const customToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;

    // 将 token 明确传递给 list 方法
    const { blobs } = await list({ 
      prefix: 'thai/',
      token: customToken // <--- 指定要使用的第二个数据库 Token[cite: 1]
    });

    const imageUrls = blobs.map((blob) => blob.url);

    return new Response(JSON.stringify({ success: true, images: imageUrls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};