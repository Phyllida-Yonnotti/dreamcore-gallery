import { list } from '@vercel/blob';
import type { APIRoute } from 'astro';

// 强制此 API 为服务端动态渲染，不进行构建期预渲染
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // 在这里显式传入 token 参数，使用 import.meta.env 读取你的自定义变量
    const token = import.meta.env.BLOB_PUBLIC_WEBHOOK_PUBLIC_KEY;

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