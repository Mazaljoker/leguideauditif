# Plan d'exécution — 14 actions SEO restantes (mai → décembre 2026)

**Source** : [synthese-audits-concurrents.md](./synthese-audits-concurrents.md) — 19 actions initialement recommandées, dont 5 bouclées (ou jugées hors scope) le 20 avril 2026 (cf. [execution-sprint-2026-04-20.md](./execution-sprint-2026-04-20.md)).

## Statut des 19 actions

| # | Action | Statut | Date de bouclage |
|:---:|---|:---:|:---:|
| 1 | Guide pilier "appareils auditifs" (27 100 vol) | À faire | mai 2026 |
| 2 | Reconquête FS commerciaux | **BOUCLÉE** | 2026-04-20 |
| 3 | Guide labyrinthique | **BOUCLÉE** | 2026-04-20 |
| 4 | Cluster 8 guides ORL YMYL | **2/8 bouclés** | voir ci-dessous |
| 5 | 8 pages enseignes | **EN ATTENTE POLITIQUE** | cf. branche `feat/enseignes` |
| 6 | Contact francemedicale.net | À faire | J+7 |
| 7 | 7 guides marques fabricants | À faire | juin-juillet 2026 |
| 8 | Guide Roger On/Select/Table | À faire | juin 2026 |
| 9 | Cluster acouphènes variantes | À faire | J+14 à J+28 |
| 10 | 20 pages locales | **PARTIEL** (branche `feat/enseignes` contient un silo local 96 dép + villes dynamiques) | à auditer |
| 11 | BL blogs seniors (9 cibles) | À faire | juin-juillet |
| 12 | Audit schema.org complet | **BOUCLÉE** (auto-injection layout) | 2026-04-20 |
| 13 | BL institutions audiologie | À faire | juillet 2026 |
| 14 | Comparatif enseignes audioprothésistes | Dépend Action 5 | — |
| 15 | Extension pages locales à 50-100 villes | Dépend Action 10 | août-déc 2026 |
| 16 | Surveillance mensuelle chute concurrents | À setup | mai 2026 |
| 17 | Guides niches ORL rares | À faire | sept-oct 2026 |
| 18 | Vidéos face caméra | À faire | oct-nov 2026 |
| 19 | Outreach presse santé | À faire | continu |

## Calendrier détaillé

### Sprint J+1 à J+8 — 6 guides Action 4 restants

| Jour cible | Guide | Volume | Concurrent dominant | Cluster |
|:---:|---|:---:|---|---|
| J+1 | `oreille-bouchee.mdx` (consolidé avec arbre décisionnel cerumen/rhume/eau/trompe Eustache) | 14 800 | Ideal pos 1 (-41 %), Audika pos 11 | perte-auditive |
| J+2 | `otite.mdx` (guide principal + liens vers otite-sereuse et otite-externe) | 40 500 | Audika pos 4 (-11 %), Unisson top 5 | perte-auditive |
| J+3 | `otite-externe.mdx` | 14 800 | Audika pos 7 | perte-auditive |
| J+4 | `trompe-eustache-bouchee.mdx` | 14 800 | Audika pos 2-8 | perte-auditive |
| J+5 | `cerumen-nettoyage.mdx` (consolidé) | 40 000 cumulé | Amplifon pos 1-7 (-47 %), Ideal pos 1 (-41 %) | prevention |
| J+6 | `auriculotherapie.mdx` | 14 800 | Unisson pos 2 (-31 %) | appareils-auditifs (angle thérapie liée) |
| J+7 | `sonotone.mdx` (définition + lien appareil auditif moderne) | 8 100 | Unisson pos 1 (-31 %) | appareils-auditifs |
| J+8 | Review + adjustments 6 guides via `me-design-checker` + schema validator | — | — | — |

**Pipeline par guide** : brief → me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator ≥70 → me-eeat-compliance ≥80 → nposts-seo-fixer → me-image-generator hero → me-design-checker → publish.

### Semaine +1 — Actions court terme

- **J+7** : Action 6 — Soumission LGA à francemedicale.net (BL triple-lien). 1 soumission + tracking Notion.
- **J+10** : Setup Action 16 — monitoring mensuel positions concurrents via DataForSEO MCP. Cron à créer dans `.claude/scripts/monitor_concurrents.py`. Seuils d'alerte : perte concurrent >10 pts sur kw où LGA est top 20 → priorité optimisation.
- **J+14** : Action 9 — audit cluster acouphènes existant (9 guides) via me-snippet-pipeline. Enrichissement variantes (oreille qui siffle, bourdonnement, sifflement oreille droite/gauche, pulsatile, nocturne). ~40 k vol cumulé.

### Semaine +2 — Rollout schema final et checks

- **J+21** : Action 10 audit — examiner branche `feat/enseignes` pour silo local 96 dép + villes dynamiques. Si qualité OK, merger la partie silo local sans les 3 pages enseignes (qui restent politiquement en attente).
- **J+28** : Google Rich Results Test sur les 5 URLs modifiées le 20 avril + 6 nouveaux guides ORL. Lighthouse mobile sur les 11 URLs.

### Mai 2026 — Action 1 (guide pilier)

**Action 1 : guide pilier `/guides/appareils-auditifs/` (27 100 vol, Ideal pos 1)**

Enrichir `src/content/guides/appareils-auditifs/index.mdx` existant :
- Structure pilier 2 500-3 500 mots
- QuickAnswer ATF
- Maillage massif vers les 8 sous-guides du cluster + comparatif 2026 + catalogue
- Schema MedicalWebPage + HowTo (étapes choix) + FAQPage
- Image hero dédiée via Imagen 4

**Durée** : 3-4 jours. **KPI J+30** : top 20 sur "appareils auditifs".

### Juin-juillet 2026 — Actions 7, 8, 11

**Action 7 : 7 guides marques fabricants** (~17 k vol cumulé)

Créer nouveau cluster `src/content/guides/marques/` avec migration schema Zod (ajouter `marques` à l'enum cluster). Guides : phonak, signia, oticon, starkey, widex, resound, bernafon. 1 guide/semaine × 7 = 7 semaines.

**Action 8 : Guide Roger On/Select/Table** (accessoire Phonak, 33 100 vol Audika shop)

Soit enrichir `src/content/guides/appareils-auditifs/accessoires.md` existant, soit créer `accessoires-phonak-roger.mdx` dédié. Angle éditorial (vs Audika shop commercial).

**Action 11 : Campagne BL blogs seniors** (9 cibles)

- blog-des-acoupheniens.fr (9 BL vers 1001audios — prioritaire)
- seniors-actu.com, cercle-des-seniors.fr, guideseniors.fr, infoseniors.net, magazine-seniors.com, seniorsurfers.org, seniorweb.fr, femmemagazine.fr

1 outreach/jour via template 2 de [Docs/campagne-backlinks-vague1.md](./campagne-backlinks-vague1.md). Tracking Notion.

### Juillet 2026 — Action 13

**Action 13 : BL institutions audiologie** — college-nat-audio.fr (rank 189), audiologie-demain.com (rank 92, 41 BL vers annuaire-audition), association-nationale-audition.org (rank 81), sfetb.org (rank 72). Template 1 (réseau proche) adapté + proposition article invité signé Franck-Olivier.

### Août-décembre 2026 — Actions 14-19

- **Août** : Action 15 — extension silo local à 50-100 villes additionnelles (si Action 10 branche silo mergée et KPI OK)
- **Septembre-octobre** : Action 17 — 5 guides niches ORL rares (parotidite 9 900, mastoïdite 6 600, chéloïde 2 900, hydrops 3 600, manœuvre Valsalva 4 400 — Amplifon monopolise mais chute -47 %)
- **Octobre-novembre** : Action 18 — 3 à 5 vidéos face caméra Franck-Olivier (comment choisir appareil, classe 1 vs 2, audiogramme, essai 30 jours, pièges grandes enseignes). Embed via `VideoExpert.astro` existant. Schema `VideoObject` via nouveau helper à ajouter dans `schema.ts`.
- **Novembre-décembre** : Action 14 — comparatif enseignes audioprothésistes (dépend décision politique Action 5). Si décision favorable : comparatif global + 12 paires marque-vs-marque.
- **Continu** : Action 19 — outreach presse santé (Doctissimo, Top Santé, Bucodes, 60 Millions de Consommateurs). 5 médias × 2 relances / trimestre.

## Action 5 — Décision à prendre sur branche `feat/enseignes`

**Statut** : 3 pages enseignes (Amplifon, Audika, Afflelou) produites via pipeline GAN complet, disponibles sur branche `feat/enseignes`. **Décision politique actuelle** : ne pas publier pour l'instant.

**À revoir si** :
- Action 4 complète montre que le cluster YMYL ne suffit pas à capter le trafic projeté
- Concurrent mon-centre-auditif accélère sa dynamique pages enseignes au point de capter des kw que LGA pourrait prendre
- Opportunité commerciale directe identifiée (partenariat enseigne, annonceur)

**Échéance de revue** : J+60 (environ 20 juin 2026) — on mesure les KPI des 3 nouveaux guides ORL + des 2 optimisations FS et on décide.

## Infrastructure d'exécution

### Skills pipeline GAN à réactiver pour chaque guide
1. `me-affiliate-writer` (brief → brouillon MDX)
2. `nposts-seo-humanizer` (voix Franck-Olivier)
3. `nposts-content-evaluator` (gate 1 ≥70)
4. `me-detector-inverse` (gate 1.5)
5. `me-eeat-compliance` (gate 2 ≥80)
6. `nposts-seo-fixer` (patches)
7. `me-image-generator` (Imagen 4 hero)
8. `me-design-checker` (validation visuelle)
9. `nposts-seo-post-publish` (monitoring J+1/7/14/30)

### Pour les optimisations SEO structurelles
- `me-snippet-pipeline` (orchestre gsc-ingestor, query-mapper, title-auditor, title-writer, snippet-evaluator, eeat-snippet-check, snippet-fixer, snippet-monitor)

### Commit strategy
- Un commit par guide (facilite rollback)
- Convention : `feat(content): <cluster>/<slug> — cible <kw> <volume>`
- Conventional commits respectés (CLAUDE.md)

## KPI macro (fin 2026)

- **Sessions organiques / mois** : +40 000 à +80 000 vs baseline sandbox avril 2026
- **Keywords top 10** : 50-80 sur requêtes ciblées
- **Backlinks nouveaux** : 20+ éditoriaux (cible 300 RD total fin 2027)
- **Rank DataForSEO** : top 5 du marché FR audition (actuellement hors classement)
- **Rich snippets GSC** : 30+ pages LGA avec rich results actifs (FS, How-to, Review, FAQ)

## Budget macro

- Temps : ~6-9 mois à cadence ~15-20h/mois (soutenable avec auto-pipeline GAN)
- DataForSEO : ~15 €/mois monitoring (audit mensuel 9 concurrents + suivi positions LGA)
- Images Imagen 4 : ~5 €/mois (1 à 2 images par guide produit)
- Outreach BL : 0 € directs (network personnel Franck-Olivier + templates existants)

## Journal des décisions en cours de route

À tenir à jour dans ce fichier à chaque sprint pour traçabilité.
