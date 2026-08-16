// src/pages/gallery-api/upload.ts
import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customBaseName = (formData.get('name') as string)?.trim();

    if (!file || !customBaseName) {
      return new Response(
        JSON.stringify({ error: '缺少图片文件或名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 显式校验环境变量 Token 是否存在
    const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ error: '环境变量未配置: 找不到 BLOB_PUBLIC_READ_WRITE_TOKEN，请前往 Vercel Redeploy 项目。' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 清理文件名中的多余扩展名
    let cleanBaseName = customBaseName;
    const userDotIndex = cleanBaseName.lastIndexOf('.');
    if (userDotIndex !== -1) {
      cleanBaseName = cleanBaseName.substring(0, userDotIndex);
    }

    // 3. 校验英数字及符号
    const validFileNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validFileNameRegex.test(cleanBaseName)) {
      return new Response(
        JSON.stringify({ error: '文件名只能包含英文字母、数字、半角横杠(-)和下划线(_)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. 拼接原始后缀名
    const lastDotIndex = file.name.lastIndexOf('.');
    const originalExt = lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : '';
    const finalFileName = originalExt ? `${cleanBaseName}.${originalExt}` : cleanBaseName;

    // 5. 显式传入 token 进行上传
    const blob = await put(`thai/${finalFileName}`, file, {
      access: 'public',
      addRandomSuffix: false,
      token: token
    });

    return new Response(
      JSON.stringify({ success: true, url: blob.url, fileName: finalFileName }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // 6. 捕捉真实底层错误，打印到前端页面上
    console.error('上传 API 内部崩溃:', error);
    return new Response(
      JSON.stringify({ error: `[服务端错误] ${error.name || 'Error'}: ${error.message || '未知异常'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};