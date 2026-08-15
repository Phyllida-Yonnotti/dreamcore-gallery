// src/pages/gallery-api/likes.ts
import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

export const prerender = false;

const supabase = createClient(
  import.meta.env.SUPABASE_URL || '',
  import.meta.env.SUPABASE_ANON_KEY || ''
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: '缺少图片 ID' }), { status: 400 });

    // 查询当前点赞数
    const { data } = await supabase.from('gallery_likes').select('count').eq('id', id).single();
    const newCount = (data?.count || 0) + 1;

    // 更新点赞数
    const { error } = await supabase.from('gallery_likes').update({ count: newCount }).eq('id', id);
    if (error) throw error;

    return new Response(JSON.stringify({ count: newCount }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};