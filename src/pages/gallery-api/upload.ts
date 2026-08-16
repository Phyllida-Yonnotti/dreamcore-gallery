// src/pages/gallery-api/upload.ts
import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL || import.meta.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || ''
);

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

    const token = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ error: '环境变量未配置: 找不到 BLOB_PUBLIC_READ_WRITE_TOKEN' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 清理文件名与拼接后缀
    let cleanBaseName = customBaseName.replace(/\.[^/.]+$/, "");
    const lastDotIndex = file.name.lastIndexOf('.');
    const originalExt = lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : '';
    const finalFileName = originalExt ? `${cleanBaseName}.${originalExt}` : cleanBaseName;

    // 2. 上传到 Vercel Blob (thai/ 目录下)
    const blob = await put(`thai/${finalFileName}`, file, {
      access: 'public',
      allowOverwrite: true,
      addRandomSuffix: false,
      token: token
    });

    // 3. 写入 Supabase 数据库
    const { data: existing } = await supabase
      .from('gallery_likes')
      .select('id')
      .eq('img_url', blob.url)
      .maybeSingle();

    let dbError;

    if (existing) {
      const { error } = await supabase
        .from('gallery_likes')
        .update({ active_flag: true })
        .eq('id', existing.id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('gallery_likes')
        .insert({
          img_url: blob.url,
          count: 0,
          active_flag: true
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase 写入失败细节:', dbError);
      throw new Error(`数据库写入失败: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, url: blob.url, fileName: finalFileName }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('上传 API 异常:', error);
    return new Response(
      JSON.stringify({ error: `[服务端错误] ${error.name || 'Error'}: ${error.message || '未知异常'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};