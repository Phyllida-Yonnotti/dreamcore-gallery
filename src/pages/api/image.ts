import { list } from '@vercel/blob';
import type { APIRoute } from 'astro';

export const prerender = false; // 确保是 SSR 动态渲染

export const GET: APIRoute = async () => {
  try {
    // 1. 获取 Token（优先读取自定义 Token，若无则读取默认 Token）
    const token = import.meta.env.BLOB_PUBLIC_READ_WRITE_TOKEN || import.meta.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error('❌ 未找到 Vercel Blob Token，请检查环境变量设置');
      return new Response(JSON.stringify({ error: 'Token missing' }), { status: 500 });
    }

    // 2. 查询 thai/ 目录下的图片
    const { blobs } = await list({
      prefix: '', // 如果图片没有在 thai/ 文件夹下，可以尝试改成 '' 测试
      token: token
    });

    // 3. 过滤出图片格式
    const imageUrls = blobs
      .map((blob) => blob.url)
      .filter((url) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url));

    console.log(`✅ 成功获取到 ${imageUrls.length} 张图片`);

    return new Response(JSON.stringify(imageUrls), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ 获取 Blob 列表失败:', error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to fetch images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};