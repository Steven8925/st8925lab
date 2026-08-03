import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://lab.st8925lab.com',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    tailwind(),
  ],
  build: {
    assets: '_assets',
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
      rollupOptions: {
        output: {
          assetFileNames: '_assets/[hash][extname]',
        },
      },
    },
  },
});
