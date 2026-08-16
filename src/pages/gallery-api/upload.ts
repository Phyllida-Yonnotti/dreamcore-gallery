// src/pages/gallery-api/upload.ts
import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

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

    // 显式校验环境变量 Token 是否存在
    const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ error: '环境变量未配置: 找不到 BLOB_PUBLIC_READ_WRITE_TOKEN，请前往 Vercel Redeploy 项目。' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 清理文件名中的多余扩展名
    let cleanBaseName = customBaseName;
    const userDotIndex = cleanBaseName.lastIndexOf('.');
    if (userDotIndex !== -1) {
      cleanBaseName = cleanBaseName.substring(0, userDotIndex);
    }

    // 校验英数字及符号
    const validFileNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validFileNameRegex.test(cleanBaseName)) {
      return new Response(
        JSON.stringify({ error: '文件名只能包含英文字母、数字、半角横杠(-)和下划线(_)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 拼接原始后缀名
    const lastDotIndex = file.name.lastIndexOf('.');
    const originalExt = lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : '';
    const finalFileName = originalExt ? `${cleanBaseName}.${originalExt}` : cleanBaseName;

    // 传入 token 进行上传
    const blob = await put(`thai/${finalFileName}`, file, {
      access: 'public',
      addRandomSuffix: false,
      token: token
    });

    // 将数据插入到数据库中 (以 Neon 为例)
    let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
    if (dbUrl) {
      if (dbUrl.startsWith('prisma://')) {
        dbUrl = dbUrl.replace('prisma://', 'postgresql://');
      }
      const sql = neon(dbUrl);

      // 向数据库插入初始点赞和状态记录
      await sql`
        INSERT INTO "gallery-likes" (img_url, count, active_flag)
        VALUES (${blob.url}, 0, true)
        ON CONFLICT (img_url) DO UPDATE SET active_flag = true
      `;
    }

    return new Response(
      JSON.stringify({ success: true, url: blob.url, fileName: finalFileName }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('上传 API 内部崩溃:', error);
    return new Response(
      JSON.stringify({ error: `[服务端错误] ${error.name || 'Error'}: ${error.message || '未知异常'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};