import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: 获取指定图片的点赞数
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('imageUrl');

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: '缺少 imageUrl 参数' }), { status: 400 });
  }

  try {
    const { data } = await supabase
      .from('gallery_likes')
      .select('count')
      .eq('image_url', imageUrl)
      .single();

    return new Response(JSON.stringify({ count: data?.count || 0 }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ count: 0 }), { status: 200 }); // 若未找到点赞记录默认返回 0
  }
};

// POST: 给指定图片点赞 +1
export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: '缺少 imageUrl' }), { status: 400 });
    }

    // 调用 Supabase upsert/rpc 实现点赞增加
    const { data, error } = await supabase.rpc('increment_image_like', { image_id: imageUrl });

    if (error) throw error;

    return new Response(JSON.stringify({ count: data }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};