# LeGuideAuditif.fr

> Site indépendant d'information santé auditive et plateforme de mise en relation avec un réseau d'audioprothésistes partenaires.

[![Production](https://img.shields.io/badge/prod-leguideauditif.fr-1B2E4A?style=flat-square)](https://leguideauditif.fr)
[![Astro](https://img.shields.io/badge/Astro-6.1-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Node](https://img.shields.io/badge/node-%3E%3D22.12-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

---

## À propos

LeGuideAuditif est un site éditorial **indépendant** dédié à la santé auditive en France, pensé pour une audience senior (65+). Il combine :

- **Contenu YMYL conforme** : guides experts, comparatifs d'aides auditives, fiches produits — tous validés via une chaîne de revue éditoriale (humanisation + double gate qualité + conformité E-E-A-T).
- **Annuaire géolocalisé** de **7 654 centres d'audioprothésistes** (carte interactive, recherche par code postal et département).
- **Espace pro** pour les audioprothésistes partenaires : dashboard, gestion de leads, annonces, abonnements premium.
- **Outils interactifs** : analyseur d'audiogramme, simulateur de perte auditive, calculateur de remboursement.

Auteur principal : **Franck-Olivier Chabbat**, audioprothésiste diplômé d'État (28 ans d'expérience, 3 000+ patients accompagnés).

---

## Stack technique

| Couche | Technos |
|---|---|
| **Framework** | Astro 6.1 (SSR Vercel), React 19.2, MDX |
| **Style** | Tailwind v4, astro-icon (Lucide), Inter + Merriweather |
| **Backend** | Supabase (auth, DB, storage), Resend (emails), Stripe (paiements) |
| **Cartographie** | Leaflet + react-leaflet 5 |
| **Recherche** | Pagefind 1.5 (index statique post-build) |
| **CMP / RGPD** | tarteaucitron 1.32 (self-hosted, conforme CNIL) |
| **Tracking** | GA4 Measurement Protocol serveur, attribution `lga_attr` 90 j |
| **Tests E2E** | Playwright (avec seed Supabase) |
| **Génération assets** | `@vercel/og` (OG images), Gemini Imagen (illustrations) |

---

## Démarrage rapide

### Prérequis
- Node **>= 22.12**
- Compte Supabase (URL + clés)
- Compte Stripe (test mode pour le dev)
- Variables d'environnement renseignées dans `.env` (voir `.env.example`)

### Installation

```bash
git clone <repo>
cd leguideauditif
npm install
```

### Développement

```bash
npm run dev          # Lance Astro en dev (port 4321 par défaut)
npm run build        # Build production : prebuild tarteaucitron + astro build + index Pagefind
npm run preview      # Preview du build local
```

### Tests E2E

```bash
npm run test:e2e:seed    # Crée un centre test (CP 99999) dans Supabase
npm run test:e2e         # Suite rapide (sans @full)
npm run test:e2e:full    # Suite complète (incluant flux Stripe live test mode)
npm run test:e2e:ui      # Mode interactif Playwright UI
```

---

## Architecture

```
leguideauditif/
├── src/
│   ├── pages/              # Routes Astro (public, admin, audiopro, annonces, api)
│   ├── content/            # 4 collections MDX/JSON
│   │   ├── guides/         # Articles informationnels (8 clusters)
│   │   ├── comparatifs/    # Comparatifs produits affiliés
│   │   ├── catalogue-appareils/  # Fiches produits (JSON)
│   │   └── plateformes/    # Pages plateformes (Lyric, Audifon, etc.)
│   ├── components/         # 30+ composants .astro et .tsx
│   ├── layouts/            # 5 layouts (Base, Article, Guide, Comparatif, Audiopro)
│   ├── lib/                # 25+ helpers (auth, supabase, stripe, attribution, ga4-mp...)
│   └── middleware.ts       # Auth gate SSR (admin + audiopro)
├── scripts/                # ETL RPPS, génération images, seed E2E, copy CMP
├── public/                 # Assets statiques + tarteaucitron (copié au prebuild)
├── tests/                  # Specs Playwright
├── Docs/                   # PRDs, specs, configs (voir Docs/README.md)
└── .claude/                # Configuration Claude Code (rules, agents, hooks)
```

Détails complets : [`.claude/rules/architecture.md`](.claude/rules/architecture.md).

---

## Documentation

| Document | Public | Sujet |
|---|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Claude Code | Instructions opérationnelles, règles transverses, chaîne GAN |
| [`Docs/README.md`](Docs/README.md) | Équipe | Sommaire des PRDs, specs et archives |
| [`.claude/rules/`](.claude/rules/) | Claude Code | 9 règles modulaires (YMYL, RGPD, auth, tests, etc.) |
| [`Docs/pdf anthropic/`](Docs/pdf%20anthropic/) | Référence | 4 PDFs officiels Anthropic (Advanced Patterns, Skills, Trends 2026) |

---

## Conformité éditoriale (YMYL santé)

Le contenu santé suit une **double validation obligatoire** :

1. **content-evaluator** (score >= 70 / 100) — qualité éditoriale, terrain, différenciation
2. **eeat-compliance** (score >= 80 / 100) — Expertise, Expérience, Autorité, Confiance (Trust pondéré x1.75 pour l'auteur DE)

Règles non-négociables :
- Toute affirmation médicale est sourcée (HAS, INSERM, OMS, PubMed) avec sources < 3 ans
- Aucune promesse thérapeutique (« guérir », « éliminer », « 100% efficace » sont bannis)
- `HealthDisclaimer` et `AuthorBox` obligatoires sur chaque page contenu
- Vouvoiement systématique (audience seniors), Flesch FR cible 60–80

Détail : [`.claude/rules/ymyl.md`](.claude/rules/ymyl.md).

---

## Conformité RGPD

- **CMP self-hosted** (tarteaucitron) — bandeau de consentement conforme CNIL
- **Aucun event GA4** ne part sans consentement explicite (`!gtag=true` cookie gate, client + serveur)
- **Attribution `lga_attr` 90 j** : cookie technique de mesure de conversion (donnée strictement nécessaire au service)
- Pas de Google Tag Manager (tracking direct via gtag client + Measurement Protocol serveur)

Détail : [`.claude/rules/rgpd-tracking.md`](.claude/rules/rgpd-tracking.md).

---

## Accessibilité

Conception orientée **seniors 65+** :
- Taille de base 18 px, line-height 1.75
- Contraste WCAG AA (marine `#1B2E4A` sur crème `#F8F5F0`)
- Focus visible 3 px orange sur tous les éléments interactifs
- Touch targets min 44×44 px
- Skip-to-content, alt text obligatoire, labels explicites

Détail : [`.claude/rules/accessibility.md`](.claude/rules/accessibility.md).

---

## Auteur

**Franck-Olivier Chabbat**
Audioprothésiste DE — 28 ans d'expérience
Parcours : Amplifon, Audika, 18 centres Afflelou, 5 ans Auzen.com — 3 000+ patients accompagnés.

- Page auteur : [/auteur/franck-olivier/](https://leguideauditif.fr/auteur/franck-olivier/)
- Email : `franckolivierchabbat@gmail.com`

---

## Statut & Licence

Projet **propriétaire**, propriété de **NPOSTS ADVERTISING SERVICES — FZCO** (Dubai, IFZA).
Tous droits réservés. Reproduction et redistribution interdites sans autorisation écrite.

Le code source est fourni à des fins de revue interne uniquement et n'est pas open source.

---

## Liens

- **Production** : https://leguideauditif.fr
- **Repo** : (privé)
- **Auteur** : https://leguideauditif.fr/auteur/franck-olivier/
- **Contact pro / partenariats** : via `/contact` ou email direct
