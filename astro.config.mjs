// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  env: {
    schema: {
      BLOB_READ_WRITE_TOKEN: envField.string({ 
        context: 'server', 
        access: 'secret',
        optional: true,
      }),
    }
  },
  vite: {
    ssr: {
      external: ['@neondatabase/serverless']
    }
  }
});