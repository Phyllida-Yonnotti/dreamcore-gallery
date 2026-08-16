// src/pages/gallery-api/delete-soft.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabase = createClient(
  process.env.SUPABASE_URL || import.meta.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || ''
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: '无效的 ID 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 将选中的图片在 Supabase 中更新 active_flag = false
    const { data, error } = await supabase
      .from('gallery_likes')
      .update({ active_flag: false })
      .in('img_url', ids);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, count: ids.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('删除 API 异常:', error);
    return new Response(
      JSON.stringify({ error: error.message || '数据库更新失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};