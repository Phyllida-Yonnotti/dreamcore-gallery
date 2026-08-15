import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  adapter: vercel(),

  env: {
    schema: {
      BLOB_PUBLIC_READ_WRITE_TOKEN: envField.string({ 
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