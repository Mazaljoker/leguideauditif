---
globs: ["src/**/*.astro", "src/**/*.tsx", "src/**/*.ts", "src/**/*.mdx", "src/**/*.md"]
---
# Interdiction des emojis

- JAMAIS d'emoji Unicode dans le code source (pas de HTML entities &#xNNNN;, pas de caracteres emoji directs)
- Utiliser exclusivement astro-icon avec Iconify (set Lucide) pour les icones
- Fichiers .astro : `import { Icon } from 'astro-icon/components'; <Icon name="lucide:nom" />`
- Fichiers .tsx/.jsx : SVG inline depuis Lucide (pas de caractere emoji)
- Les symboles typographiques standards sont autorises : € & rarr; etc.
- Les caracteres simples de ponctuation (fleches HTML entities comme &rarr;) sont autorises
