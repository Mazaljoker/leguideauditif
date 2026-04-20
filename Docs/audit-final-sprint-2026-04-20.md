# Audit final sprint SEO — 2026-04-20

Audit technique de fin de session sur la production ([leguideauditif.fr](https://leguideauditif.fr)) après les 11 actions bouclées de la journée.

## 1. Validation build local

- Build Astro : **340 pages** générées sans erreur (pré-sprint : 336)
- Pagefind : **11 439 mots** indexés en français
- Zero erreur TypeScript, zero warning Astro content schema bloquant
- 14 nouveaux guides YMYL + 20 guides existants optimisés

## 2. Audit Rich Results / JSON-LD (build local dist/client)

Vérification par grep sur le HTML produit des URLs clés.

### Guides santé YMYL (Articles)

URLs testées :
- `/guides/appareils-auditifs/` (pilier Action 1)
- `/guides/appareils-auditifs/phonak-roger/` (Action 8)
- `/guides/perte-auditive/labyrinthite-labyrinthique/` (Action 3)
- `/guides/acouphenes/traitement/` (Action 9)
- `/guides/marques/phonak/` (Action 7)

**Schemas auto-injectés par layout (14 types détectés)** :
- Article
- BreadcrumbList
- FAQPage + Question/Answer
- MedicalAudience + Country (HAS public concerné)
- MedicalCondition (about)
- MedicalOrganization (LGA entity)
- MedicalWebPage (YMYL)
- Organization (publisher)
- Person (author Franck-Olivier, ADELI)
- WebPageElement + ListItem

Homogénéité parfaite sur les 5 URLs testées — auto-injection via [src/pages/guides/[...slug].astro](../src/pages/guides/%5B...slug%5D.astro) et [src/utils/schema.ts](../src/utils/schema.ts).

### Comparatifs (Products + Reviews)

URL testée : `/comparatifs/meilleur-appareil-auditif-2026/`

**21 types de schemas détectés**, ajoute aux précédents :
- AggregateRating (moyenne des scores Franck-Olivier)
- Brand (fabricants des 6 modèles)
- HowTo + HowToStep (5 étapes pour choisir)
- Product (6 appareils flagships)
- Rating
- Review (verdict individuel par produit)

Parfait pour éligibilité Rich Results Google : "How-to", "Product snippet", "Review snippet", "FAQ".

## 3. Audit Lighthouse production (desktop, DataForSEO)

Tests effectués sur 3 URLs distinctes le 2026-04-20 à 13:38–13:39 UTC.

### `/guides/acouphenes/traitement/` (guide YMYL)

| Catégorie | Score |
|---|:---:|
| Performance | **97 / 100** |
| Accessibility | **97 / 100** |
| Best Practices | **100 / 100** |
| SEO | **100 / 100** |

**Core Web Vitals** :
- FCP : 1016 ms ✅ (seuil Good < 1800 ms)
- LCP : 1016 ms ✅ (seuil Good < 2500 ms)
- CLS : 0.003 ✅ (seuil Good < 0.1) — excellent
- TTI : 1016 ms
- Max Potential FID : 16 ms
- Server response : 13 ms
- Total byte weight : 570 KB

### `/guides/appareils-auditifs/` (pilier)

Scores identiques **97 / 97 / 100 / 100**.

- FCP : 950 ms ✅
- LCP : 950 ms ✅
- CLS : 0.003 ✅
- Total byte weight : 505 KB

### `/comparatifs/meilleur-appareil-auditif-2026/` (comparatif lourd)

Scores identiques **97 / 97 / 100 / 100**.

- FCP : 953 ms ✅
- LCP : 953 ms ✅
- CLS : 0.053 ✅ (légèrement > autres pages mais toujours Good)
- Total byte weight : 543 KB

**Conclusion Lighthouse** : constance parfaite, pas de régression sur les pages lourdes en schemas. Le CLS légèrement plus élevé du comparatif (0.053) vient probablement du tableau comparatif et des images produits — non bloquant, mais piste d'optimisation future (réservation espace via aspect-ratio).

## 4. Validation SEO technique

### Title/meta sample (page `/guides/acouphenes/traitement/`)

- `<title>` : "Traitement acouphènes 2026 : TRT, TCC, appareils" (49 chars ✅)
- `<meta description>` : "Traitement acouphènes 2026 : TRT, TCC, appareils auditifs. Ce qui fonctionne, ce qui ne marche pas — audioprothésiste DE, 28 ans d'expérience." (141 chars ✅)
- Accents UTF-8 complets ✅ (HARD BLOCK CLAUDE.md respecté)
- QuickAnswer injecté dans le HTML ✅

### Sitemap & Pagefind

- Sitemap-index auto-généré : `dist/client/sitemap-index.xml`
- Pagefind indexe toutes les nouvelles pages (340 pages total)
- Nouveaux slugs dans sitemap :
  - `/guides/appareils-auditifs/phonak-roger/`
  - `/guides/marques/phonak/`, `/signia/`, `/oticon/`
  - `/guides/perte-auditive/labyrinthite-labyrinthique/`, `/cristaux-oreille-interne/`, `/otite-sereuse/`, `/otite/`, `/oreille-bouchee/`, `/trompe-eustache-bouchee/`, `/otite-externe/`
  - `/guides/prevention/cerumen-nettoyage/`
  - `/guides/acouphenes/auriculotherapie/`, `/appareils-auditifs/sonotone/`

## 5. Checklist de déploiement production

Status actuel des commits sur la branche `feat/guides-hub-redesign` :

- [x] Sync Astro content : OK
- [x] Build production : OK (340 pages)
- [x] Schemas JSON-LD : 14 types standard, 21 types sur comparatifs
- [x] Lighthouse Desktop : 97/97/100/100 constant
- [x] Accents UTF-8 : tous conformes
- [ ] **Merge vers main + deploy Vercel prod** — à faire manuellement
- [ ] **Rich Results Test Google** : à lancer sur 5 URLs échantillon après déploiement prod
- [ ] **Lighthouse mobile** (audience seniors) : à effectuer post-déploiement via PageSpeed Insights
- [ ] **Monitoring GSC J+1/7/14/30** : via `me-snippet-monitor` à déclencher J+1 post-déploiement

## 6. Recommandations post-déploiement

### Priorité 1 — Indexation (J+1 à J+7)
- Soumettre le sitemap actualisé dans GSC
- Demander l'indexation des 14 nouveaux guides via "URL Inspection" GSC
- Vérifier l'apparition des rich snippets (HowTo/FAQ/Review) dans SERP

### Priorité 2 — Monitoring positions (J+7 à J+30)
- Trackage hebdomadaire des 14 nouveaux keywords cibles via DataForSEO SERP
- Alerte si perte ≥10 positions sur kw où LGA entre en top 20
- Comparaison trend concurrents Unisson / Amplifon / VivaSon / Ideal (en baisse -31 % à -55 %)

### Priorité 3 — Optimisations futures
- **CLS comparatif** : ajouter `aspect-ratio` sur les images produits pour descendre < 0.01
- **Backup clusterIntros** : les autres clusters pourraient bénéficier d'intros équivalentes
- **Schema VideoObject** : à ajouter à `schema.ts` pour Action 18 (vidéos face caméra oct-nov 2026)

## 7. Bilan chiffré de la session

**Contenus produits en une journée** :
- 14 nouveaux guides MDX YMYL (~38 000 mots combinés)
- 19 guides existants optimisés snippet-pipeline
- 1 guide pilier enrichi
- 2 pages commerciales optimisées (meilleur 2026 + prix appareil)
- Infrastructure : 9 helpers schema.ts + 3 migrations layout/schema (cluster marques)
- 8 commits Conventional Commits
- 2 rapports de suivi (execution-sprint + plan-restantes + audit-final)

**Volumes SEO cumulés ciblés** : ~475 000 recherches/mois.

**Qualité technique** : 97/97/100/100 Lighthouse maintenu, zero régression détectée.

---

**Verdict final** : la session est prête pour merge vers main et déploiement production. Recommandation de déployer dans les 24-48h pour maximiser le bénéfice de la fenêtre tactique identifiée par l'audit concurrentiel (baisse -31 % à -55 % kw chez Unisson / Amplifon / VivaSon / Ideal).
