// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server', // 开启 SSR 服务端渲染，支持 API 路由
  adapter: vercel(),
});