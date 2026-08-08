import { list } from '@vercel/blob';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // 获取 thai/ 文件夹下的所有文件
    const { blobs } = await list({ prefix: 'thai/' });
    
    // 提取图片 URL 列表
    const imageUrls = blobs
      .map((blob) => blob.url)
      .filter((url) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url));

    return new Response(JSON.stringify(imageUrls), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};