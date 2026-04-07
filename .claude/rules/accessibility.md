---
globs: ["src/**/*.astro", "src/**/*.tsx"]
---
# Accessibilite seniors (65+)

- Taille police minimum 18px (deja configure en global.css a 112.5%)
- Contraste WCAG AA minimum — marine (#1B2E4A) sur creme (#F8F5F0) = OK
- Focus visible : outline 3px orange (#D97B3D) sur tous les elements interactifs
- Pas d'animation rapide : respecter prefers-reduced-motion
- Labels explicites sur tous les champs de formulaire (pas de placeholder-only)
- aria-label sur les sections aside et nav
- Touch targets minimum 44x44px pour les boutons
- Skip-to-content link en debut de page (deja dans BaseLayout.astro)
- Alt text obligatoire sur toutes les images
- Line-height minimum 1.75 pour le corps de texte
