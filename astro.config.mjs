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
  adapter: vercel(),
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        if (page.startsWith('https://leguideauditif.fr/admin/')) return false;
        if (page.startsWith('https://leguideauditif.fr/auth/')) return false;
        return ![
          'https://leguideauditif.fr/annonces/alertes/',
          'https://leguideauditif.fr/annonces/mes-annonces/',
          'https://leguideauditif.fr/revendiquer/confirmation/',
          'https://leguideauditif.fr/revendiquer-gratuit/confirmation/',
          'https://leguideauditif.fr/revendiquer/',
          'https://leguideauditif.fr/revendiquer-gratuit/',
          'https://leguideauditif.fr/connexion-pro/',
        ].includes(page);
      },
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