// src/pages/gallery-api/delete-soft.ts
import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: '无效的 ID 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;

    if (!dbUrl) {
      throw new Error('未找到数据库连接环境变量 (DATABASE_URL / POSTGRES_URL)');
    }

    if (dbUrl.startsWith('prisma://')) {
      dbUrl = dbUrl.replace('prisma://', 'postgresql://');
    }

    const sql = neon(dbUrl);

    await sql`
      UPDATE "gallery-likes"
      SET active_flag = false
      WHERE img_url = ANY(${ids})
    `;

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