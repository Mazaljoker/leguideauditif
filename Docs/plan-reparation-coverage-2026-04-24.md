# Plan de réparation Coverage GSC — 2026-04-24

**Site** : leguideauditif.fr
**Source** : `leguideauditif.fr-Coverage-2026-04-24.xlsx` (rapport global GSC au 20/04)
**Vue d'ensemble** : 2 335 URLs indexées (+2 335 depuis 06/04) — 859 URLs non-indexées (–63% depuis pic du 14/04)
**Impressions/jour** : 1 168 (+215% en 2 jours)

## Contexte

La PR #78 (mergée 2026-04-24 10:30 UTC) a traité la catégorie "Page avec redirection" :
- `Astro.redirect(..., 301)` sur `/revendiquer/` et `/revendiquer-gratuit/`
- `robots.txt` : blocage crawl query strings `?centre=`
- `vercel.json` : 1 redirect `st-ouen-l-aumone → saint-ouen-l-aumone`

Le présent document plan les 7 catégories restantes.

---

## Tableau de bord — 8 catégories du rapport Coverage

| # | Raison | URLs | Statut GSC | Priorité | Action | Owner | Effort |
|---|---|---:|---|:---:|---|:---:|:---:|
| 1 | Page avec redirection | 64 | Commencé ✓ | — | **Traité en PR #78** — attendre validation J+14 | Fixé | 0 |
| 2 | Exclue par balise "noindex" | 419 | Échec | — | **Aucune** — c'est voulu (YMYL thin) | FO (GSC) | 5 min |
| 3 | Autre page balise canonique correcte | 51 | Échec | — | **Aucune** — canonical fonctionne, informatif | FO (GSC) | 0 |
| 4 | Introuvable (404) | 30 | Échec | **P1** | Inspection API + audit individuel → redirects 301 | Claude | 2 h |
| 5 | Explorée actuellement non indexée | 28 | Échec | **P2** | Analyse qualité → enrichir ou canonicaliser | Claude | 3 h |
| 6 | Erreur liée à des redirections | 3 | Commencé | **P3** | Identifier + fix (chain > 5 hops ou boucle) | Claude | 30 min |
| 7 | Bloquée par robots.txt | 2 | Non commencé | **P4** | Vérifier voulu vs accidentel | Claude | 10 min |
| 8 | Détectée actuellement non indexée | 262 | Commencé | **P5** | Pipeline Google en attente — pas d'action | — | 0 |

**Total URLs non-indexées : 859** — dont **63 actionnables côté code** (4-7) + **796 à laisser en état** (2, 3, 8) + **64 déjà traitées en PR #78** (1).

---

## P1 — 30 URLs "Introuvable (404)" — 2 h

### Hypothèses pré-audit

Origine probable des 30 URLs 404 :
- **Ancien import FINESS avril 2026** qui a modifié ~3 700 slugs de centres (cf. commentaire `[slug].astro:48`) → certaines URLs anciennes n'ont pas été ajoutées à `centre_redirects`
- **Liens internes brisés** dans le code (déjà 1 confirmé : `DashboardRevendicateur.astro:153` référence `/centre/le-guide-auditif-69630-chaponost/` qui est 404)
- **Anciens slugs villes** `/audioprothesiste/<slug>/` devenus obsolètes après refonte slugifyVille

### Bug déjà identifié

`src/components/audiopro/revendicateur/DashboardRevendicateur.astro:153` référence `/centre/le-guide-auditif-69630-chaponost/` qui retourne 404.
→ **Fix** : pointer vers un vrai centre démo existant (probablement `is_demo=true` en base) OU créer ce slug de démo Premium.

### Actions

1. **Récupérer la liste exacte des 30 URLs** via `inspect_url()` sur toutes les URLs connues (script `.claude/gsc_fast_audit.py` en cours)
2. **Classer chaque URL** :
   - Ancien slug centre → ajouter à `centre_redirects` Supabase OU à `vercel.json`
   - Ancien slug ville → si un équivalent existe, redirect 301 ; sinon laisser 404
   - Lien interne cassé dans le code → fix direct
   - Backlink externe orphelin → éventuellement page de remplacement ou 410 Gone
3. **Créer PR** avec la liste des redirects ajoutés

### Livrables
- CSV `.claude/gsc-cat-not-found-404.csv` (liste + action par URL)
- PR `fix(seo): redirects 404 post-import FINESS`

---

## P2 — 28 URLs "Explorée actuellement non indexée" — 3 h

Google a crawlé ces URLs mais a décidé de ne pas les indexer → **signal qualité**. Possibles raisons :
- Thin content (pages générées automatiquement sans valeur ajoutée)
- Duplication sémantique avec d'autres pages
- Page récente, en file d'attente de décision

### Actions

1. **Récupérer la liste** via URL Inspection API
2. **Par pattern** :
   - Si c'est `/audioprothesiste/<ville>/` avec ≥ 6 centres → enrichir le contenu (FAQ locale, conseil expert, zones desservies)
   - Si c'est `/centre/<slug>/` claimed/premium → vérifier richness (bio, appareils, horaires)
   - Si c'est une page guide/comparatif → vérifier que le contenu n'est pas trop similaire à une autre
3. **Pour chaque URL non-indexée utile** : enrichir + demander une nouvelle indexation manuelle dans GSC

### Livrables
- CSV `.claude/gsc-cat-crawled-not-indexed.csv`
- Plan d'enrichissement (pipeline GAN si > 5 pages à retravailler)

---

## P3 — 3 URLs "Erreur liée à des redirections" — 30 min

Très peu d'URLs, fix rapide. Probables causes :
- Chaîne de redirects > 5 hops (Google abandonne au-delà)
- Boucle de redirects
- Redirect vers URL 404

### Actions

1. Récupérer les 3 URLs via Inspection API
2. Tracer le chemin `curl -sIL` pour chacune
3. Simplifier la chaîne à 1 hop max vers URL 200

### Livrables
- Fix direct dans `vercel.json` ou code SSR

---

## P4 — 2 URLs "Bloquée par robots.txt" — 10 min

Probablement `/admin/` ou `/auth/` → voulu. À confirmer.

### Actions

1. Identifier les 2 URLs via Inspection API
2. Vérifier qu'elles correspondent aux `Disallow:` de `robots.txt` actuels
3. Si accidentelles, ajuster la règle ; sinon documenter

### Livrables
- Confirmation + éventuel patch `robots.txt`

---

## P5 — 262 URLs "Détectée actuellement non indexée" — 0 h

**Comportement normal** de Google : URLs découvertes (via sitemap + maillage) mais pas encore crawlées. Le pipeline d'indexation prend 2-8 semaines selon la trust du domaine.

### Signal à surveiller

Si ce compteur **ne descend pas** sous 100 dans 4 semaines → problème de crawl budget (sitemap trop gros, maillage insuffisant, site trop lent).

### Actions préventives (déjà en place)
- ✓ Sitemap `sitemap-pages-locales.xml` généré dynamiquement
- ✓ Sitemap `sitemap-centres.xml` filtré claimed/premium uniquement
- ✓ Liens internes depuis pages silo (ville → département)

---

## P6 — Actions Search Console (manuelles, 10 min)

### À faire tout de suite
1. **Ne pas valider** les 419 "Exclue par noindex" ni les 51 "Autre page canonique correcte" — feature, pas bug
2. **Renvoyer les 3 sitemaps** après merge PR #78 : `sitemap-index.xml`, `sitemap-centres.xml`, `sitemap-pages-locales.xml`
3. **Inspection URL** sur 5-10 URLs clés (hub, guides phares, catégorie meilleur-2026) → "Demander une indexation"

### À faire J+14 (2026-05-08)
1. Valider le correctif "Page avec redirection" → devrait passer de 64 à < 10
2. Exporter un nouveau rapport Coverage → comparer les 8 compteurs

---

## Courbe cible à 30 jours (prévisionnel)

| Métrique | Actuel (20/04) | Cible (20/05) | Delta |
|---|---:|---:|---:|
| URLs indexées | 2 335 | 2 900 | +565 |
| URLs non-indexées | 859 | 400 | −459 |
| Impressions/jour | 1 168 | 2 500 | +1 332 |
| "Page avec redirection" | 64 | 5 | −59 (PR #78) |
| "Introuvable (404)" | 30 | 5 | −25 (P1) |
| "Explorée non indexée" | 28 | 10 | −18 (P2) |

---

## Ordre d'exécution recommandé

1. ⚡ **MAINTENANT** : finir audit URL Inspection (background, ~10 min)
2. ⚡ **+10 min** : P3 (3 erreurs redirections) + P4 (2 bloquées robots)
3. 📅 **Aujourd'hui** : P1 (30 x 404) → PR de redirects
4. 📅 **Cette semaine** : P2 (28 non-indexées) → enrichissement
5. 📅 **J+14 (2026-05-08)** : validation GSC + nouveau rapport
6. 📅 **J+30 (2026-05-22)** : mesure écart vs courbe cible

---

## Résultats audit URL Inspection API (1 354 URLs inspectées)

Sources : 886 URLs SearchAnalytics 90j + 419 URLs validation XLSX + 64 URLs drilldown XLSX = 1 368 uniques, 1 354 inspectées.

| coverageState | URLs | Commentaire |
|---|---:|---|
| Submitted and indexed | 965 | ✅ OK |
| Excluded by noindex | 320 | 313 `/centre/*` (RPPS) + 7 `/audioprothesiste/*` (thin < 6 centres) — **voulu** |
| Page with redirect | 64 | Dernière exploration 18/04 (avant PR #78) — **fix auto au prochain crawl** |
| Crawled - currently not indexed | 3 | 3 villes < 6 centres — 200 + noindex — **voulu** |
| Alternate page canonical | 2 | `www.leguideauditif.fr/` → apex — **voulu** |

**Conclusion critique** : **aucune URL à corriger côté code** parmi celles auditées.

### Les 30 "Not found (404)", 3 "Redirect error", 2 "Blocked by robots.txt" NE sont PAS dans ma liste auditée

Les URLs en 404 pur n'apparaissent pas dans SearchAnalytics (0 impression → non listées par l'API). Il faut un export GSC manuel pour les identifier.

**Demande à Franck** : GSC → Indexation → Pages → clic sur chaque catégorie ci-dessous → bouton **Exporter** → XLSX → me partager les 3 fichiers :
- Introuvable (404) — 30 URLs
- Erreur liée à des redirections — 3 URLs
- Bloquée par robots.txt — 2 URLs

Une fois reçus, j'identifie les vrais bugs code et produis la PR de fix.

## Notes techniques

- **API URL Inspection** : ajoutée à `.claude/google_api.py` (`inspect_url()`)
- **Script audit** : `.claude/gsc_fast_audit.py` + `inspect_suspects.py` (4 threads, rate-limited)
- **Données 90j** : `.claude/gsc-known-urls.txt` (886 URLs avec ≥ 1 impression)
- **Par catégorie** : `.claude/gsc-cat-<slug>.csv`
- **Résultats bruts** : `.claude/gsc-inspection-results.csv` (1 354 lignes)
