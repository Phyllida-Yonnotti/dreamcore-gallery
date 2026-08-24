// src/pages/gallery-api/images.ts
import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

export const prerender = false;

const supabase = createClient(
  import.meta.env.SUPABASE_URL || '',
  import.meta.env.SUPABASE_ANON_KEY || ''
);

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('gallery_likes')
      .select('id, display_index, img_url, count')
      .eq('active_flag', true)
      .order('display_index', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};