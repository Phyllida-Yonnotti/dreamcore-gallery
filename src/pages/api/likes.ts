import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: 获取当前点赞数
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('gallery_likes')
      .select('count')
      .eq('id', 'global')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ count: data?.count || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// POST: 点赞数 +1
export const POST: APIRoute = async () => {
  try {
    const { data, error } = await supabase.rpc('increment_likes', { row_id: 'global' });

    if (error) throw error;

    return new Response(JSON.stringify({ count: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};