// src/pages/gallery-api/delete-soft.ts
import type { APIRoute } from 'astro';
import { sql } from '@vercel/postgres';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids }: { ids: number[] } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: '无效的 ID 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 使用 @vercel/postgres 批量更新 SQL
    await sql`
      UPDATE "gallery-likes"
      SET active_flag = false
      WHERE id = ANY(${ids as any})
    `;

    return new Response(
      JSON.stringify({ success: true, count: ids.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('软删除 API 异常:', error);
    return new Response(
      JSON.stringify({ error: error.message || '数据库更新失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};