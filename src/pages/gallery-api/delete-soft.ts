// src/pages/gallery-api/delete-soft.ts
import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json(); // 接收前端传过来的 URL 或 ID 数组

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: '无效的 ID 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 初始化 sql 客户端
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL!;
    const sql = neon(dbUrl);

    // 使用 sql`...` 执行批量更新（Neon 模板字符串天然支持数组解析）
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
    console.error('软删除 API 异常:', error);
    return new Response(
      JSON.stringify({ error: error.message || '数据库更新失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};