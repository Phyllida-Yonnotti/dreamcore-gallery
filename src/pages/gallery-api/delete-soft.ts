// src/pages/gallery-api/delete-soft.ts
import type { APIRoute } from 'astro';
// 💡 根据你实际使用的数据库客户端导入（例如 @vercel/postgres, drizzle, pg 等）
import { sql } from '@vercel/postgres';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json(); // 接收需要软删除的 ID 数组: [1, 2, 3] 或 URL 数组

    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: '无效的 ID 列表' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 💡 将 gallery-likes 表里的 active_flag 状态更新为 false (或 0)
    // 示例 1: 使用 @vercel/postgres 批量更新 SQL
    await sql`
      UPDATE "gallery-likes"
      SET active_flag = false
      WHERE id = ANY(${ids})
    `;

    // 如果你的表主键是 url 或路径，可以写成:
    // UPDATE "gallery-likes" SET active_flag = false WHERE img_url = ANY(${ids})

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