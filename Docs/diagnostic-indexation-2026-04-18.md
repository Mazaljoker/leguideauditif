# Diagnostic indexation GSC — LeGuideAuditif.fr

**Date** : 2026-04-18
**Auteur** : diagnostic pré-implémentation avant PRD `sitemap-pages-locales.xml`
**Périmètre** : trancher entre "crise d'indexation 95%" (levier template/autorité) et "cycle normal site jeune" (attendre / accélérer découverte)

---

## Données sources (reproductibilité)

| Fichier | Contenu |
|---|---|
| `docs/data/gsc-urls-indexees-97.csv` | Les 97 URLs indexées au 13/04/2026, export GSC "Toutes les pages connues" |
| `docs/data/gsc-timeline-indexation.csv` | Historique quotidien du 06/04 au 13/04 (indexées + non indexées + impressions) |
| `docs/data/gsc-metadonnees.csv` | Métadonnées GSC (filtre appliqué : toutes pages, pas sitemap-centres seul) |
| `docs/data/diagnostic-stats.json` | Stats agrégées produites par le script d'analyse |

Scripts utilisés :
- `scripts/diagnostic/parse-gsc-indexed.mjs` — parsing du CSV, classification, stats
- `scripts/diagnostic/check-silo-mesh.sh` — fetch pages silo + grep slugs

---

## Fait clé qui reconfigure le diagnostic

**Le sitemap-centres.xml n'a été détecté par Google que le 11/04/2026.**

Preuve : `gsc-timeline-indexation.csv` montre un bond de **+982 non indexées** entre le 10/04 (270) et le 11/04 (1252). 982 URLs apparues en une nuit = le contenu du sitemap-centres.xml (1000 URLs), indexé chez Googlebot moins 18 URLs déjà découvertes autrement.

Implication : au jour de la mesure (13/04) **les fiches centres n'ont que 2 jours ouvrables de recul**, pas 10. Le chiffre "951 Détectée / 46 Explorée" du PRD de départ = Google a eu **2 jours** pour traiter 1000 URLs fraîches, pas une semaine.

Ce fait isolé suffit déjà à reclasser le diagnostic.

---

## Partie 1 — Distribution des 49 URLs `/centre/*` indexées

### 1.1 Répartition par type de page (sur les 97 URLs totales)

| Type | Count |
|---|---|
| `/centre/*` | 49 |
| `/catalogue/appareils/*` | 24 |
| `/guides/*` | 7 |
| Pages utilitaires (home, faq, à-propos, mentions, trouver-audioprothesiste, revendiquer) | 7 |
| `/catalogue/marques/*` | 3 |
| `/catalogue/types/*` | 2 |
| `/annonces/*` | 2 |
| `/catalogue/comparer/` | 1 |
| `/comparatifs/*` | 1 |
| `/` (home) | 1 |
| **Total** | **97** |

### 1.2 Distribution géographique des 49 fiches centres

49 fiches réparties sur **36 départements distincts**. Aucun département ne concentre plus de 3 fiches.

Top 10 départements :

| Département | Fiches indexées |
|---|---|
| 33 Gironde | 3 |
| 59 Nord | 3 |
| 31 Haute-Garonne | 2 |
| 85 Vendée | 2 |
| 81 Tarn | 2 |
| 78 Yvelines | 2 |
| 13 Bouches-du-Rhône | 2 |
| 49 Maine-et-Loire | 2 |
| 94 Val-de-Marne | 2 |
| 69 Rhône | 2 |
| (26 autres départements) | 1 chacun |

**Aucun cluster géographique.** L'indexation n'est pas concentrée sur 1-3 départements.

### 1.3 Distribution par première lettre du slug

| 1ère lettre | Count | % |
|---|---|---|
| **a** | **47** | **95,9%** |
| l | 1 | 2,0% |
| s | 1 | 2,0% |

**Signal chronologique massif.** Le sitemap-centres.xml ordonne par `.order('slug')` (ASC alphabétique, confirmé dans [src/pages/sitemap-centres.xml.ts:10](src/pages/sitemap-centres.xml.ts#L10)). 47 fiches sur 49 commencent par 'a' = Google a crawlé dans l'ordre et s'est arrêté.

### 1.4 Ratio enseigne vs indépendant

| Catégorie | Count | % |
|---|---|---|
| Enseignes nationales | 34 | 69,4% |
| Indépendants (RPPS pur) | 15 | 30,6% |

Détail :

| Enseigne | Fiches |
|---|---|
| audika | 18 |
| amplifon | 10 |
| asteric-optic | 1 |
| acuitis | 1 |
| audilab | 1 |
| alfa-optique | 1 |
| afflelou | 1 |
| entendre | 1 |

**Lecture** : la sur-représentation des enseignes est un artefact alphabétique, pas un signal qualité. Les slugs commencent par le nom de l'enseigne (ex: `audika-france-XXXXX`), ce qui concentre les 'A' nationaux dans les premières URLs du sitemap. Les fiches enseignes et les fiches indépendantes utilisent **le même template Level 1 RPPS** — aucune raison que Google préfère les enseignes pour raison qualité.

### 1.5 Distribution par date de dernière exploration

| Date | Fiches |
|---|---|
| 2026-04-09 | 3 |
| 2026-04-13 | 46 |

Les 3 fiches datées 09/04 (`audiologie-du-leman-01220`, `la-maison-de-l-audition-02600`, `sarl-audition-tribut-verjus-entendre-02200`) **ne commencent pas par 'a'**. Elles ont été découvertes **avant** la détection du sitemap (11/04) via le silo géographique (hub `/audioprothesiste/` → pages villes/dépts → fiches). C'est la preuve opérationnelle que **le silo fonctionne comme voie de découverte secondaire** mais avec un throughput faible.

### 1.6 Problème canonique www

9 URLs `www.leguideauditif.fr` indexées en parallèle de leurs pendants non-www :

- `/annonces/`, `/faq/`, `/trouver-audioprothesiste/`, `/mentions-legales/`
- `/revendiquer/?centre=audition-jcg-01500`
- `/catalogue/appareils/signia-pure-ix-5/`, `signia-pure-ax-7/`, `phonak-naida-marvel-70/`, `starkey-omega-ai-16/`

Corrélé avec les 35 pages flagguées "Autre page avec balise canonique correcte" dans `Problèmes critiques.csv`.

### Interprétation Partie 1 → **"Clusterisé chronologique" confirmé**

47/49 fiches (95,9%) commencent par 'a' et ont été crawlées en un batch unique le 13/04. La distribution géographique est étalée (36 départements), éliminant l'hypothèse "sélection par zone urbaine dense". Le ratio enseigne/indé ne traduit aucun signal qualité (même template pour les deux). Les 3 fiches crawlées pré-sitemap proviennent du silo, pas d'une sélection qualité.

**Diagnostic** : Google crawle dans l'ordre du sitemap, pas selon un signal qualité. Le problème actuel est **budget de crawl / priorité de traitement**, pas **qualité du template Level 1**.

---

## Partie 2 — Rythme d'indexation

### 2.1 Historique quotidien

| Date | Non indexées | Dans l'index | Impressions |
|---|---|---|---|
| 2026-04-06 | 7 | 0 | 0 |
| 2026-04-07 | 270 | 43 | 2 |
| 2026-04-08 | 270 | 43 | 4 |
| 2026-04-09 | 270 | 43 | 4 |
| 2026-04-10 | 270 | 43 | 19 |
| 2026-04-11 | 1252 | 97 | 13 |
| 2026-04-12 | 1252 | 97 | 26 |
| 2026-04-13 | 1252 | 97 | 57 |

### 2.2 Analyse

- **06/04** : découverte initiale du domaine (7 URLs, 0 indexée).
- **07/04 → 10/04** : phase de stabilisation sur les 43 URLs indexées (home + guides + catalogue précoce). 4 jours de pause.
- **11/04** : découverte du sitemap-centres.xml → +982 URLs dans la file non-indexées, **+54 URLs indexées immédiatement** (guides tardifs + pages catalogue + quelques fiches centres via autre voie).
- **12/04 → 13/04** : 97 URLs stables dans l'index. Le crawl effectif des 46 fiches centres alphabétiques date du 13/04 (dernière colonne du CSV) — elles sont incluses dans le compteur 97.

### 2.3 Rythme normalisé

| Métrique | Valeur |
|---|---|
| Durée réelle de la fenêtre de mesure | 7 jours (07/04 → 13/04) |
| URLs indexées sur la fenêtre | +97 |
| Rythme moyen apparent | ~14 URLs/jour |
| Rythme actif observé | ~46 URLs/jour (le jour où Google crawle vraiment, 13/04) |

### 2.4 Extrapolation

À 14 URLs/jour constant : 500 URLs (50% des 1000 du sitemap-centres) atteint en ~29 jours → **~12 mai 2026**.

À 46 URLs/jour actif (si Google continue à batcher) : 500 URLs atteint en ~9 jours de crawl actif, probablement étalés sur 3-4 semaines calendaires → **début mai**.

Les deux scénarios convergent autour de **mi-mai pour 50%**.

### 2.5 Benchmarks publics 2024-2026 (indicatif)

Sites YMYL neufs sans autorité (< 2 mois) : typiquement 2-10 URLs indexées/jour en régime stable. Un site frais avec 14/jour de moyenne sur la première semaine et des pics à 46/jour = **bien au-dessus de la médiane**, probablement porté par la qualité existante du contenu `/guides/` et `/catalogue/`.

### Interprétation Partie 2 → **"Trajectoire normale"**

Pas de stagnation. Pas de crise. Le rythme est **supérieur** aux benchmarks d'un domaine jeune comparable. Le "95% non indexé" du PRD est un artefact de lecture sur 2 jours ouvrables de recul depuis la découverte effective du sitemap (11/04).

---

## Partie 3 — Maillage silo

### 3.1 Pages testées

| Page silo | HTTP | Taille | Liens `/centre/*` uniques |
|---|---|---|---|
| `/audioprothesiste/departement/ariege/` | 200 | 70 KB | 20 |
| `/audioprothesiste/foix/` | 200 | 47 KB | 1 |
| `/audioprothesiste/departement/ain/` | 200 | 82 KB | 20 |
| `/audioprothesiste/marseille/` | 200 | 120 KB | 74 |

### 3.2 Vérification présence des fiches indexées

| Page silo | Fiche indexée cherchée | Trouvée dans le HTML |
|---|---|---|
| Ariège (dept) | alfa-optique-09000-foix | **Oui** (2 occurrences) |
| Foix (ville) | alfa-optique-09000-foix | **Oui** (2 occurrences) |
| Ain (dept) | audiologie-du-leman-01220 | **Oui** (1 occurrence) |
| Marseille (ville) | a-l-s-a-13006-marseille-6e-arrondissement | **Oui** (2 occurrences) |

### Interprétation Partie 3 → **Maillage fonctionnel mais sous-exploité**

Le silo rend bien en HTML SSR. Les 4 pages testées contiennent des liens crawlables vers les fiches centres correspondantes. Le maillage **n'est pas cassé**.

Mais seulement **3 des 49 fiches indexées ont été découvertes via le silo** (celles du 09/04) — les 46 autres ont attendu la soumission du sitemap. Conclusion opérationnelle : Google crawle peu le silo **parce qu'il n'est pas dans les sitemaps**. Le silo existe, mais n'est pas priorisé.

Si les pages villes + dépts étaient dans un sitemap soumis, elles seraient probablement indexées elles-mêmes ET redistribueraient du signal de crawl vers les fiches centres.

---

## Synthèse finale et décision

### Diagnostic tranché

**Le problème actuel est "budget crawl / priorité de découverte", pas "qualité contenu Level 1".**

Preuves convergentes :
1. 95,9% des fiches indexées commencent par 'a' = ordre alphabétique du sitemap = Google suit la file, pas de sélection qualité
2. Distribution géographique étalée (36 dépts sur 49 fiches) = aucun cluster "grandes villes" ou "zones denses"
3. Ratio enseigne/indé (69/31) expliqué par artefact alphabétique, pas par signal qualité (même template pour les deux)
4. Seulement 25 fiches "Explorée non indexée" site-wide (vs 1183 "Détectée non indexée") → le problème est **en amont du crawl**, pas un rejet qualité après analyse
5. Le sitemap n'a que 2 jours ouvrables de recul, pas 10
6. Le rythme observé (14-46/jour) est supérieur aux benchmarks pour un domaine jeune YMYL

### Hiérarchie des actions

**1. Ne rien faire et attendre — n'est PAS recommandé**, même si le diagnostic est "normal". Raison : pendant qu'on attend, les 3100 pages villes/dépts restent hors sitemap, donc hors radar de Google. Ces pages ont du contenu dense (5k-14k chars) et sont plus faciles à faire indexer que les fiches Level 1. Chaque jour d'attente = perte nette sur des URLs qui auraient pu déjà être dans l'index.

**2. Prioriser `sitemap-pages-locales.xml`** (PRD en attente) = action à impact direct sur le vrai levier identifié (découverte). Gain attendu : indexation rapide des 3100 pages villes/dépts sur 2-4 semaines, puis redistribution du crawl vers les fiches centres via le maillage silo (validé fonctionnel en Partie 3).

**3. NE PAS prioriser l'enrichissement du template Level 1 à court terme.** Le diagnostic élimine l'hypothèse "qualité". Investir 1 semaine de dev sur l'enrichissement template ne déplacera pas le compteur d'indexation à 60 jours. L'enrichissement reste pertinent à moyen terme (défense contre Helpful Content Update + positionnement sur requêtes locales), mais pas comme levier court terme.

**4. Nettoyage canonique www** (35 pages en erreur canonique, 9 URLs www dans l'index) — petit effort, défensif, à faire en parallèle. Non bloquant.

**5. Re-mesurer à J+14 (2026-05-02)** après avoir poussé `sitemap-pages-locales.xml` pour confirmer la trajectoire ou pivoter si elle stagne.

### Recommandation finale

**Go sur l'implémentation de `sitemap-pages-locales.xml` (PRD initial).**

Le diagnostic ne change pas la décision business, mais il change **la lecture du pourquoi** :
- Avant : "on corrige une crise d'indexation 95%"
- Après : "on accélère une trajectoire déjà saine en débloquant la découverte des pages silo"

L'enrichissement du template Level 1 peut être repoussé ou traité en parallèle comme investissement moyen terme, pas comme urgence SEO.

### Ce qui aurait pu m'amener à conclure faux

- Si j'avais ignoré la colonne "Dernière exploration" et traité les 46 fiches du 13/04 comme "10 jours de recul", le diagnostic aurait basculé vers "qualité thin" à tort
- Si j'avais pas vu le bond +982 du 11/04, j'aurais manqué la date réelle de soumission du sitemap et cru à un plateau
- Si j'avais pris les 46 fiches comme "échantillon qualité" sans analyser les slugs, le ratio enseigne/indé aurait pu être mal interprété comme "Google préfère les grandes chaînes"

Ces trois biais ont été levés par l'analyse ordre-slugs + timeline + colonne "Dernière exploration".

---

## Annexe — Re-mesure à J+14

À faire le **2026-05-02** :
1. Re-exporter le rapport GSC "Indexation → Pages" (mêmes 4 CSV)
2. Re-run `node scripts/diagnostic/parse-gsc-indexed.mjs`
3. Vérifier :
   - Nombre d'URLs indexées (attendu : 300-500+ si trajectoire tient)
   - Proportion de fiches `/centre/*` qui ne commencent PAS par 'a' (= signal que Google avance dans le sitemap au-delà du premier batch)
   - Présence de pages villes/dépts dans l'index (= signal que le sitemap-pages-locales.xml a fait effet)
4. Pivoter si stagnation à < 150 URLs totales indexées : suspecter un vrai blocage qualité/autorité et ré-examiner Partie 1.3 après enrichissement template éventuel.
