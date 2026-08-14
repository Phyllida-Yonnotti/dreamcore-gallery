import { put } from '@vercel/blob';
import type { APIRoute } from 'astro';

// 强制此 API 路径以服务端模式运行，不进行静态预渲染
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: '请选择要上传的文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = import.meta.env.BLOB_READ_WRITE_TOKEN || import.meta.env.BLOB_PUBLIC_READ_WRITE_TOKEN;

    if (!token) {
      return new Response(JSON.stringify({ error: '环境变量未配置 Blob Token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 将文件上传至 thai/ 目录下，使用时间戳避免重名覆盖
    const filename = `thai/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public',
      token: token,
    });

    return new Response(JSON.stringify({ success: true, url: blob.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || '上传失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};