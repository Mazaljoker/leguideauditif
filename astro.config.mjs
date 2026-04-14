// @ts-check
// build-cache-bust: 2026-04-14
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://leguideauditif.fr',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        ![
          'https://leguideauditif.fr/auth/callback/',
          'https://leguideauditif.fr/auth/login/',
          'https://leguideauditif.fr/auth/register/',
          'https://leguideauditif.fr/auth/profil/',
          'https://leguideauditif.fr/annonces/alertes/',
          'https://leguideauditif.fr/annonces/mes-annonces/',
          'https://leguideauditif.fr/revendiquer/confirmation/',
          'https://leguideauditif.fr/revendiquer-gratuit/confirmation/',
        ].includes(page),
    }),
    mdx(),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
  },
});