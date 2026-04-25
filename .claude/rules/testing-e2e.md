---
globs: ["tests/**", "playwright.config.*", "scripts/seed-test-centre.mjs"]
---
# Tests E2E Playwright

## Modes

```bash
npm run test:e2e         # Sans @full (tags) — rapide CI
npm run test:e2e:full    # Tout (incluant Stripe live test mode)
npm run test:e2e:ui      # Mode UI interactif
npm run test:e2e:seed    # Seed seul (centre test CP 99999)
```

`test:e2e` lance `seed` puis `playwright test --grep-invert=@full`.

## Seed

`scripts/seed-test-centre.mjs` cree (idempotent) un centre test :
- CP : `99999` (reserve aux tests, jamais collision avec donnees prod)
- Email audiopro : defini dans script
- Token de claim genere

A relancer en cas de DB reset / branch nouvelle.

## Stripe test mode

Suite premium / annonces utilise Stripe en test mode :
- Cles dans `.env.test` (jamais commit)
- Test cards : 4242 4242 4242 4242 (succes), 4000 0025 0000 3155 (3DS)
- Webhook de test : forwarder via `stripe listen --forward-to localhost:4321/api/webhook`

Reference : skill `stripe:test-cards`.

## Specs critiques (deployment-blocking)
- Auth password (cookies SSR)
- Magic link callback
- Claim centre (token + verification admin)
- Premium checkout + webhook -> activation audiopro
- Dashboard audiopro acces leads claimed uniquement
- Annonces Stripe checkout
- Attribution `lga_attr` first-touch + last-touch
- Tarteaucitron consent gate (events bloques sans consent)

## Tags
- `@full` — suite complete (Stripe live, MP serveur, longues anims)
- `@a11y` — checks accessibilite axe-core
- `@premium` — flow audiopro premium
- `@claim` — revendication centre

## Pieges connus
- **Seed pas relance** : si DB reset, le centre 99999 n'existe plus -> tous les tests claim/audiopro echouent.
- **Cookies cross-test** : Playwright reset les cookies par contexte. Bien utiliser `test.use({ storageState: ... })` pour persister une session entre tests d'une meme suite.
- **Webhook Stripe** : sans `stripe listen`, le webhook `purchase` ne fire jamais en local -> activation audiopro bloquee. Lancer le forwarder avant `test:e2e:full`.
- **Vercel preview** : ne pas lancer E2E contre une preview prod (cree de la donnee bruyante). Toujours en local ou en CI dedie.
