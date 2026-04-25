---
globs: ["src/lib/attribution.ts", "src/lib/ga4-mp.ts", "src/lib/track*.ts", "src/lib/tracking.ts", "src/components/**/Newsletter*", "src/components/**/LeadForm*", "src/pages/api/**", "scripts/copy-tarteaucitron.mjs", "public/tarteaucitron/**"]
---
# RGPD, CMP, Tracking attribution

## CMP tarteaucitron (self-hosted)

LeGuideAuditif utilise tarteaucitron 1.32 self-hosted (RGPD/CNIL conforme).

- Source : `node_modules/tarteaucitronjs/` -> copie au prebuild via `scripts/copy-tarteaucitron.mjs`
- Cible : `public/tarteaucitron/` (chemin sert directement)
- Init : dans `BaseLayout.astro` (charge avant tout autre script tracking)

## Cookie de gating GA4

Cookie magique `!gtag=true` : si **absent ou false**, AUCUN event GA4 ne doit partir (client ou serveur).

Pattern client (lib/track.ts, lib/tracking.ts) :
```ts
if (!hasConsent('gtag')) return; // No-op si pas de consentement
gtag('event', name, params);
```

Pattern serveur (lib/ga4-mp.ts) :
```ts
// Lire les cookies de la requete entrante
const consent = cookies.get('!gtag')?.value === 'true';
if (!consent) return { ok: false, reason: 'no_consent' };
// Sinon -> POST vers Measurement Protocol
```

**Exception unique** : le cookie `lga_attr` (attribution) reste exempt — c'est de la donnee strictement necessaire au service (mesure de conversion sortante), pas du tracking comportemental.

## Attribution `lga_attr` (90 jours)

Cookie technique pour attribuer les conversions multi-sessions :

- **Nom** : `lga_attr`
- **Duree** : 90 jours (rolling)
- **Contenu** : JSON signe `{ utm_source, utm_medium, utm_campaign, first_touch_at, last_touch_at, landing_page, referrer }`
- **First-touch** : ne s'ecrase JAMAIS apres le 1er enregistrement
- **Last-touch** : refresh a chaque visite avec UTM
- **Storage** : cookie + miroir Supabase table `claim_attributions` (au moment du claim/lead)

Helper : `src/lib/attribution.ts` — toujours passer par lui (jamais lire/ecrire le cookie en raw).

## GA4 Measurement Protocol serveur

Quand un evenement critique arrive cote serveur (Stripe webhook, claim, lead converti), envoyer un event server-side via le MP.

- Lib : `src/lib/ga4-mp.ts`
- Endpoint : `https://www.google-analytics.com/mp/collect?measurement_id=...&api_secret=...`
- API secret : `process.env.GA4_MP_API_SECRET` (server-only)
- Conditions : consent `!gtag=true` valide cote requete utilisateur (cf. ci-dessus)

Custom dimensions declarees (cf. memoire `reference_ga4_custom_dimensions.md`) :
- `transaction_id` — pour deduplication
- `event_source` — `client` | `server`
- `utm_source` — first-touch attribution
- `centre_slug` — contexte centre

## Key events GA4 (provisionnes)
- `book_call_initiated` / `book_call_completed`
- `claim_started` / `claim_completed`
- `lead_submitted`
- `purchase` (annonces Stripe)

Provisionning : script `.claude/ga4_provision.py` (idempotent). Reference complete : memoire `reference_ga4_admin_provisioning.md`.

## Pieges connus
- **GA4 displayName** : pas de parentheses. `book_call_initiated` OK, `book_call (initiated)` REJECT API.
- **Tarteaucitron self-hosted** : si oubli du `prebuild`, le CMP est absent en prod -> bandeau jamais affiche.
- **lga_attr cross-domain** : si page de claim sert depuis sous-domaine, attention au cookie domain (utiliser `.leguideauditif.fr`).
- **Vercel preview env** : MP API secret doit etre defini sur Production ET Preview, sinon les events de test ne partent pas.
- **GTM vs GA4 direct** : LGA n'utilise PAS GTM (plus de couches inutiles). Tracking direct via gtag client + MP serveur.
