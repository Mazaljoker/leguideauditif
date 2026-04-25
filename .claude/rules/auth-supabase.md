---
globs: ["src/middleware.ts", "src/pages/audioprothesiste-pro/**", "src/pages/admin/**", "src/pages/api/auth/**", "src/pages/api/admin/**", "src/pages/api/audiopro/**", "src/lib/auth.ts", "src/lib/admin-guard.ts", "src/lib/audiopro*.ts"]
---
# Auth Supabase + middleware SSR

## 3 methodes d'authentification (espace pro)

1. **Magic link** — email avec lien Supabase (default, low friction)
2. **Password** — login classique email/password
3. **Token claim** — token signe a usage unique pour onboarding (revendication centre)

## Cookies SSR (CRITIQUE)

**Le login password DOIT ecrire les cookies cote serveur** sinon le middleware SSR ne reconnait pas la session.

Pattern obligatoire dans toute API route d'auth :
```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// Ecrire les cookies sb-access-token et sb-refresh-token sur la reponse
cookies.set('sb-access-token', data.session.access_token, { httpOnly: true, secure: true, sameSite: 'lax' });
cookies.set('sb-refresh-token', data.session.refresh_token, { httpOnly: true, secure: true, sameSite: 'lax' });
```

Sans ces cookies : `Astro.locals.user` reste `null` cote middleware -> 302 vers connexion.

## Middleware (`src/middleware.ts`)

Gates :
- `/admin/**` -> requiert role admin (`is_admin = true` dans Supabase)
- `/audioprothesiste-pro/**` -> requiert session valide + `audiopro_id` lie
- `/api/admin/**` -> meme gate admin (401 si non auth)
- `/api/audiopro/**` -> meme gate audiopro (401 si non auth)

Le middleware lit les cookies, valide la session via Supabase, attache `Astro.locals.user` et `Astro.locals.audiopro`.

## Variables d'environnement

CRITIQUE : `import.meta.env` est inline au build sur Vercel. Pour les secrets dynamiques :
- Cote build (publics) : `import.meta.env.PUBLIC_*` (prefix obligatoire)
- Cote serveur (secrets) : `process.env.*` (jamais expose au client)
- Cote session : passer via `Astro.locals` (rempli par le middleware)

Variables critiques :
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — client public
- `SUPABASE_SERVICE_ROLE_KEY` — server-only (admin queries)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — paiements
- `RESEND_API_KEY` — emails
- `GA4_MP_API_SECRET` — Measurement Protocol serveur (cf. rgpd-tracking.md)

Edition `.env*` bloquee par le hook `block-env-edit.sh` — modifier manuellement uniquement.

## Helpers a privilegier

- `src/lib/admin-guard.ts` — wrapper API routes admin (retourne 401 sinon)
- `src/lib/admin-token.ts` — generation/verification token signe (revendication)
- `src/lib/fetchAdmin.ts` — fetch cote client avec cookies
- `src/lib/audiopro-lifecycle.ts` — creation/activation/desactivation compte audiopro
- `src/lib/audiopro-signup.ts` — flow signup multi-step

## Pieges connus
- `import.meta.env` sur Vercel : valeur inline au BUILD, pas resolue runtime. Utiliser `process.env` cote serveur si besoin runtime.
- Supabase RLS : verifier les policies avant query cote serveur, sinon `service_role` bypasse tout (danger).
- Cookie `sb-access-token` httpOnly : impossible a lire en JS client (par design). Pour exposer l'user au client, le rendre via SSR dans le HTML.
- Magic link en env preview Vercel : configurer redirect URLs Supabase pour chaque preview branch sinon callback 404.
