# Spec — Pipeline Title/Snippet Editor Grade A

**Version** : 0.1 (draft — à valider par Franck-Olivier avant code)
**Date** : 2026-04-18
**Auteur** : Franck-Olivier Chabbat
**Objectif** : Skill « meilleur éditeur SEO title/snippet du monde » pour LeGuideAuditif.fr, aligné sur le pattern Grade A du pipeline produits/articles (contrats JSON stricts, double gate, orchestrateur, RETRY max 3, escalade humaine).

---

## 1. Pourquoi ce pipeline existe

### 1.1. Problème métier

GSC J+10 post-lancement LGA révèle :
- Pages éditoriales en page 1 Google (position 3-10 fréquent)
- **CTR non-brand ≈ 0%** (ex : `/guides/` pos 3.4, 58 impr, 0 clic)
- Cause : titles génériques + suffixe `— LGA` parasite + différenciateur « audioprothésiste DE 28 ans » absent des snippets

### 1.2. Pourquoi pas juste un one-shot

1. **85+ pages à auditer** + 7 146 fiches centres RPPS à venir → besoin de rejouer le workflow en batch
2. **YMYL santé** : toute proposition title/meta doit passer un gate E-E-A-T (pas de promesse thérapeutique, DE surfacé, source auteur)
3. **Boucle d'apprentissage** : CTR J+7/J+14 post-patch doit nourrir les propositions futures (A/B implicite)
4. **Budget DataForSEO** : plafond 100 queries enrichies par run → orchestrateur doit prioriser

### 1.3. Recherche terrain (avril 2026)

Données clés collectées avant rédaction de ce spec (sources en annexe §12) :

| Fait | Source | Impact sur le pipeline |
|---|---|---|
| CTR position 1 : **19%** (2025, -32% YoY) | GrowthSRC 200K keywords | Strike-zone pos 4-10 est le **vrai** sweet spot, pas pos 1-3 |
| CTR positions 6-10 : **+30% YoY** | GrowthSRC | LGA est précisément dans cette zone → levier maximal |
| AI Overview divise CTR pos 1 **par 2+** | MailOnline (13% → 5%) | Meta doit donner la réponse différenciée, pas redire l'AIO |
| Google réécrit **61-76%** des titles | Portent Q1 2025 | Title **et** H1 **et** meta doivent s'aligner sur l'intent (sinon rewrite pénalisant) |
| Titles **40-60 chars (6-9 mots)** : +8.9% CTR | Backlinko 4M résultats | Budget strict pixel 500-600px |
| **Sentiment positif** : +4.1% CTR vs négatif | Backlinko | Bannir « erreurs », « arnaque » ; préférer « guide », « expert », « vérifié » |
| Paragraph FS : **70%** des featured snippets, 40-60 mots | Earnifyhub 2026 | Meta doit être formatée « réponse directe 40-60 mots » |
| YMYL QRG Sept 2025 : auteur clinicien **identifié** obligatoire | Google SQRG v2025 | Title/meta doivent surfacer « audioprothésiste DE » ou « expert DE 28 ans » |
| Formule Ahrefs **ABC** : Adjective + Benefit + Confidence booster | Ahrefs | Gabarit de génération par défaut |

---

## 2. Architecture du pipeline (chaîne Grade A)

```
                                   ┌────────────────────────────────────┐
                                   │      me-snippet-pipeline           │
                                   │  (orchestrateur, machine à états)  │
                                   └────────────────────────────────────┘
                                                    │
                                                    ▼
  [1] lga-gsc-ingestor         Parse XLSX GSC, normalise URLs, filtre brand
        │
        ▼
  [2] lga-query-mapper         Map query↔page (sémantique + DataForSEO SERP)
        │
        ▼
  [3] lga-title-auditor        Mismatch Score + ROI strike-zone → top N priorité
        │
        ▼
  [4] lga-title-writer         Génère 3 variantes title/meta/H1 par page (ABC + YMYL)
        │
        ▼                      ┌────────────────────── RETRY si REVISE ──────────────────────┐
  [5] lga-snippet-evaluator    GATE 1 : score ≥ 75 (pertinence + CTR predict + pixel + clarté)
        │                                                                                     │
        ▼                                                                                     │
  [6] me-eeat-snippet-check    GATE 2 : score ≥ 80 (YMYL, DE surfacé, pas de promesse)        │
        │                                                                                     │
        ▼                                                                                     │
  [7] lga-snippet-fixer        Applique patchs (frontmatter + layout props), crée PR batch ──┘
        │
        ▼
  [8] lga-snippet-monitor      CTR A/B J+7/J+14/J+30 via GSC, rollback auto si régression
```

**Règle d'or** : chaque skill est **single-responsibility**. L'évaluateur juge, n'écrit jamais. Le writer propose, ne patch jamais. Le fixer patch, n'évalue jamais.

---

## 3. Contrats JSON inter-skills

> Pattern identique à `nposts-content-evaluator` : tout skill déclare un `type` + `payload`, consommé par le skill aval.

### 3.1. Skill 1 — `lga-gsc-ingestor`

**Input** (humain ou orchestrateur) :

```json
{
  "gsc_export_path": "leguideauditif_fr-Performance-on-Search-2026-04-18.xlsx",
  "period": { "start": "2026-03-21", "end": "2026-04-16" },
  "brand_exclusions": ["leguideauditif", "guide auditif", "franck-olivier", "chabbat"],
  "min_impressions_per_page": 5
}
```

**Output** :

```json
{
  "type": "lga-gsc-ingestor",
  "payload": {
    "period": { "start": "...", "end": "..." },
    "total_pages": 85,
    "pages_with_impressions": 14,
    "pages_filtered_out_brand": 23,
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "url_normalized": "leguideauditif.fr/guides/audiogramme/",
        "gsc": {
          "impressions": 93,
          "clicks": 1,
          "ctr": 0.0108,
          "avg_position": 7.23
        },
        "top_queries_probable": [
          { "q": "audiogramme normal 50 ans", "impr": 6, "pos": 9.83 }
        ]
      }
    ],
    "queries_unmapped": [
      { "q": "...", "impr": 42, "reason": "ambiguous_page_match" }
    ]
  }
}
```

### 3.2. Skill 2 — `lga-query-mapper`

**Input** : output de `lga-gsc-ingestor`.

**Output** : ajoute `query_bucket` (head/mid/long_tail/unknown) + `serp_features` + confirme mapping via DataForSEO.

```json
{
  "type": "lga-query-mapper",
  "payload": {
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "gsc": { "...": "..." },
        "mapped_queries": [
          {
            "q": "audiogramme normal 50 ans",
            "impr": 6,
            "pos": 9.83,
            "bucket": "mid",
            "monthly_volume": 170,
            "serp_features": ["featured_snippet", "people_also_ask"],
            "ai_overview_present": false,
            "confidence": 0.92
          }
        ]
      }
    ],
    "dataforseo_budget_consumed": 47,
    "dataforseo_budget_cap": 100
  }
}
```

### 3.3. Skill 3 — `lga-title-auditor`

**Input** : output de `lga-query-mapper` + lecture fichiers Astro (title/meta/H1 actuels).

**Output** : Mismatch Score + ROI → priorité.

```json
{
  "type": "lga-title-auditor",
  "payload": {
    "pages_audited": 14,
    "pages_with_mismatch": 11,
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "source_file": "src/content/guides/perte-auditive/audiogramme.mdx",
        "current": {
          "title": "Audiogramme : lire et comprendre vos résultats — LGA",
          "meta": "Comment lire un audiogramme...",
          "h1": "Audiogramme : lire et comprendre vos résultats",
          "title_chars": 52,
          "title_pixels": 487,
          "meta_chars": 148
        },
        "mismatch": {
          "score": 65,
          "reasons": [
            { "code": "primary_query_absent", "weight": 30, "detail": "'audiogramme normal' absent" },
            { "code": "credibility_DE_absent", "weight": 15, "detail": "Ni DE ni 28 ans dans title" },
            { "code": "suffix_parasitic", "weight": 10, "detail": "'— LGA' gaspille 7 chars" },
            { "code": "long_tail_ignored", "weight": 15, "detail": "'par âge' (13 impr) absent" }
          ]
        },
        "roi": {
          "score": 12.87,
          "formula": "impr × (1/pos) × strike_zone_factor",
          "strike_zone_factor": 1.0,
          "strike_zone_bucket": "sweet_spot_4_10",
          "priority": "high"
        }
      }
    ]
  }
}
```

### 3.4. Skill 4 — `lga-title-writer`

**Input** : pages priorisées par `lga-title-auditor`.

**Output** : 3 variantes par page (A/B/C), chacune avec rationale + pixel_width + CTR prediction.

```json
{
  "type": "lga-title-writer",
  "payload": {
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "variants": [
          {
            "id": "A",
            "formula": "ABC_Ahrefs",
            "title": "Audiogramme normal : seuils par âge (expert DE 28 ans)",
            "title_chars": 55,
            "title_pixels": 512,
            "meta": "Comment lire un audiogramme à 50, 60, 70 ans ? Seuils normaux BIAP expliqués par un audioprothésiste DE, 28 ans d'expérience, 3 000 patients.",
            "meta_chars": 151,
            "h1_suggested": "Audiogramme normal : quels seuils à 50, 60, 70 ans ?",
            "predicted_ctr_delta_pct": "+3.2",
            "sentiment": "neutral_positive",
            "rationale": "Requête primaire intégrée, DE surfacé, long-tail 'par âge' capté, suffixe LGA retiré, sentiment positif ('expert')"
          },
          { "id": "B", "formula": "question_format", "...": "..." },
          { "id": "C", "formula": "number_benefit", "...": "..." }
        ],
        "recommended_variant_id": "A"
      }
    ]
  }
}
```

### 3.5. Skill 5 — `lga-snippet-evaluator` (GATE 1)

**Score 0-100 sur 6 axes** (grille détaillée §5).

```json
{
  "type": "lga-snippet-evaluator",
  "payload": {
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "variant_evaluated": "A",
        "score_total": 82,
        "scores": {
          "relevance_query": 90,
          "ctr_prediction": 80,
          "pixel_width_compliance": 100,
          "clarity_non_clickbait": 85,
          "coherence_title_h1_meta": 75,
          "differentiation_vs_serp": 70
        },
        "verdict": "PASS",
        "iteration": 1,
        "issues": []
      }
    ]
  }
}
```

Seuils :
- **PASS** : score ≥ 75 **ET** `relevance_query` ≥ 80 **ET** `pixel_width_compliance` = 100
- **REVISE** : 55-74 → retour `lga-title-writer` avec `generator_instructions`
- **REJECT** : < 55 → escalade humaine

### 3.6. Skill 6 — `me-eeat-snippet-check` (GATE 2 YMYL)

Extension YMYL-spécifique du `me-eeat-compliance` existant, limitée au périmètre title/meta.

```json
{
  "type": "me-eeat-snippet-check",
  "payload": {
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "variant_evaluated": "A",
        "score_total": 88,
        "scores": {
          "no_therapeutic_promise": 100,
          "author_credential_surfaced": 100,
          "no_superclaim": 90,
          "vouvoiement_implicit": 80,
          "price_in_meta_if_product": "N/A",
          "no_medical_unsourced_claim": 90
        },
        "verdict": "PASS",
        "blocking_issues": []
      }
    ]
  }
}
```

Seuils :
- **PASS** : score ≥ 80 **ET** `no_therapeutic_promise` = 100 **ET** `author_credential_surfaced` ≥ 80
- **REJECT** bloquant si :
  - Promesse thérapeutique détectée (« guérir », « éliminer », « 100% »)
  - Prix absent de meta alors que `source_file` est dans `src/content/catalogue/appareils/`

### 3.7. Skill 7 — `lga-snippet-fixer`

Applique les patchs sur fichiers Astro (frontmatter MDX ou props du layout), crée la branche + PR batch.

```json
{
  "type": "lga-snippet-fixer",
  "payload": {
    "pages_patched": 14,
    "branch": "fix/seo-titles-batch-2026-04-18",
    "pr_url": "https://github.com/Mazaljoker/leguideauditif/pull/XX",
    "rollback_snapshot": "audit/title-audit-2026-04-18.snapshot.json",
    "changes": [
      {
        "file": "src/content/guides/perte-auditive/audiogramme.mdx",
        "field": "title",
        "before": "Audiogramme : lire et comprendre vos résultats — LGA",
        "after": "Audiogramme normal : seuils par âge (expert DE 28 ans)"
      }
    ]
  }
}
```

### 3.8. Skill 8 — `lga-snippet-monitor`

Étend `nposts-seo-post-publish` avec un mode « batch snippet » : compare CTR avant/après patch.

```json
{
  "type": "lga-snippet-monitor",
  "payload": {
    "batch_ref": "fix/seo-titles-batch-2026-04-18",
    "checkpoint": "J+14",
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "ctr_before": 0.0108,
        "ctr_after": 0.041,
        "ctr_delta_pct": "+280",
        "position_delta": "-2.1",
        "verdict": "WIN"
      }
    ],
    "rollback_candidates": []
  }
}
```

Si `ctr_after < ctr_before × 0.8` **ET** `position_delta > +3` à J+14 → **rollback auto** du patch individuel (pas du batch entier).

---

## 4. Orchestrateur `me-snippet-pipeline`

Pattern identique à `me-content-pipeline` (machine à états, RETRY max 3, timeouts, escalade).

### 4.1. Machine à états

| État | Skill | Condition de sortie |
|---|---|---|
| INIT | — | GSC XLSX reçu + période validée |
| INGESTING | `lga-gsc-ingestor` | JSON normalisé ≥ 5 pages |
| MAPPING | `lga-query-mapper` | Confidence ≥ 0.8 sur ≥ 80% des queries OU budget DataForSEO épuisé |
| AUDITING | `lga-title-auditor` | Top N pages priorisées (default N=20) |
| WRITING | `lga-title-writer` | 3 variantes/page générées |
| GATE_1 | `lga-snippet-evaluator` | Score ≥ 75 (PASS) |
| GATE_2 | `me-eeat-snippet-check` | Score ≥ 80 (PASS) |
| FIXING | `lga-snippet-fixer` | PR créée |
| MONITORING | `lga-snippet-monitor` | Checkpoints J+7/J+14/J+30 |
| DONE | — | Rapport final |
| BLOCKED | — | Escalade humaine |

### 4.2. Règles RETRY

- Max **3 iterations** WRITING → GATE_1 → GATE_2
- Après 3 REVISE successifs sur la même page → **escalade humaine** (skip cette page, continue le batch)
- Checkpoint humain **obligatoire** après AUDITING (afficher top 5 + patterns systémiques)
- Checkpoint humain **obligatoire** avant FIXING (valider la PR à créer)

### 4.3. Budget DataForSEO

- Cap hard : 100 queries enrichies par run
- Priorité : pages avec impressions ≥ 10 > pages 5-9 > pages 1-4
- Si budget épuisé → `bucket = "unknown"` sans invention

---

## 5. Grille de scoring `lga-snippet-evaluator` (GATE 1)

### Axe 1 — Relevance query (poids ×0.25)

| Check | Points |
|---|---|
| Requête primaire (top impr) présente dans title | 40 |
| Requête secondaire (top-2 impr) présente dans title OU meta | 30 |
| Long-tail (≥ 5 impr combinées) capté dans title OU meta | 20 |
| Match exact vs variante morphologique acceptée | 10 |

### Axe 2 — CTR prediction (poids ×0.20)

Modèle prédictif simple (heuristique, pas ML) :
- Base : CTR attendu = fonction(position_actuelle_GSC, SERP_features)
- Bonus :
  - Sentiment positif détecté : +4%
  - Number dans title (« 7 », « 5 méthodes ») : +3%
  - Question si intent informationnel : +2%
  - Crédibilité chiffrée (« 28 ans », « 3 000 patients ») : +5%
- Malus :
  - Clickbait (« vous ne devinerez jamais ») : -15%
  - Sur-claim (« le meilleur ») : -8%
  - Suffixe parasite non-brand : -5%

### Axe 3 — Pixel width compliance (poids ×0.15)

| Check | Points |
|---|---|
| Title ≤ 580 pixels (safe zone) | 60 |
| Title 580-600 pixels (acceptable) | 40 |
| Title > 600 pixels (troncature risk) | 0 |
| Meta ≤ 155 chars | 40 |

### Axe 4 — Clarity non-clickbait (poids ×0.15)

- Zéro clickbait détecté (liste de patterns interdits) : 50
- Promesse factuelle vérifiable par le contenu : 30
- Pas de majuscules parasites : 20

### Axe 5 — Coherence title/H1/meta (poids ×0.15)

- Keyword primaire cohérent entre title et H1 : 40
- Meta développe le title sans redite : 30
- H1 non identique au title (Google préfère variation) : 30

### Axe 6 — Differentiation vs SERP (poids ×0.10)

Nécessite appel DataForSEO `serp/google/organic` :
- Title proposé ≠ titles des 3 premiers résultats concurrents : 60
- Angle unique identifié (ex : « par âge », « expert DE ») : 40

**Formule finale** : `score_total = Σ(axe × poids) × 100`

---

## 6. Grille `me-eeat-snippet-check` (GATE 2 YMYL)

| Critère | Poids | Bloquant si 0 |
|---|---|---|
| `no_therapeutic_promise` : aucun mot interdit | 30 | **OUI** |
| `author_credential_surfaced` : « DE », « audioprothésiste », « 28 ans » ou « expert DE » | 20 | OUI si score < 80 sur global |
| `no_superclaim` : pas de « le meilleur », « miracle », « sans égal » | 15 | OUI |
| `vouvoiement_implicit` : cohérence ton (audience seniors 65+) | 10 | NON |
| `price_in_meta_if_product` : fiche `/catalogue/appareils/` → meta contient `€` | 15 | **OUI si applicable** |
| `no_medical_unsourced_claim` : si claim médical dans meta, source obligatoire | 10 | OUI |

Patterns interdits (regex, liste non exhaustive, à étendre dans `references/ymyl-forbidden-patterns.md`) :

```
guér(ir|ison)|éliminer?|100[\s%]*efficace|miracle|sans\s+égal|le\s+meilleur|garantie\s+totale
```

---

## 7. Structure fichiers à créer

```
.claude/skills/
├── me-snippet-pipeline/
│   ├── SKILL.md
│   └── references/
│       ├── contracts.md
│       └── state-machine.md
├── lga-gsc-ingestor/
│   ├── SKILL.md
│   └── references/
│       └── gsc-xlsx-schema.md
├── lga-query-mapper/
│   ├── SKILL.md
│   └── references/
│       └── dataforseo-queries.md
├── lga-title-auditor/
│   ├── SKILL.md
│   └── references/
│       ├── mismatch-rubric.md
│       └── roi-formula.md
├── lga-title-writer/
│   ├── SKILL.md
│   └── references/
│       ├── abc-formula.md
│       ├── ymyl-safe-patterns.md
│       └── variant-templates.md
├── lga-snippet-evaluator/
│   ├── SKILL.md
│   └── references/
│       ├── scoring-rubric.md
│       └── ctr-prediction-model.md
├── me-eeat-snippet-check/
│   ├── SKILL.md
│   └── references/
│       └── ymyl-forbidden-patterns.md
├── lga-snippet-fixer/
│   ├── SKILL.md
│   └── references/
│       └── astro-patch-patterns.md
└── lga-snippet-monitor/
    ├── SKILL.md
    └── references/
        └── rollback-rules.md
```

**Fichiers data** :

```
audit/
├── title-audit-2026-04-18.json       # output final du pipeline
├── title-audit-2026-04-18.md          # rapport humain
└── title-audit-2026-04-18.snapshot.json  # état pré-patch pour rollback
```

---

## 8. Dépendances

| Dépendance | Type | Usage |
|---|---|---|
| `xlsx` (npm) | lib | Parse XLSX GSC dans `lga-gsc-ingestor` |
| DataForSEO MCP | MCP existant | `serp/google/organic`, `keyword_data` dans `lga-query-mapper` |
| GSC API | REST (déjà configuré) | `lga-snippet-monitor` CTR post-patch |
| `gray-matter` (déjà présent) | lib | Lecture frontmatter MDX dans `lga-title-auditor` |
| `github` MCP | MCP existant | Création PR dans `lga-snippet-fixer` |

**Pas de nouvelle dépendance npm hors `xlsx`**.

---

## 9. Plan de build incrémental

| Jalon | Livrables | Durée estimée | Validation |
|---|---|---|---|
| **J1** | Spec validée (ce fichier) + arbo skills créée | 2h | Franck-Olivier OK |
| **J2** | `lga-gsc-ingestor` + `lga-query-mapper` (2 skills + contrats) | 4h | Test sur XLSX réel → JSON normalisé |
| **J3** | `lga-title-auditor` + `lga-title-writer` | 4h | Top 20 pages + 3 variantes/page validées à l'œil |
| **J4** | `lga-snippet-evaluator` + `me-eeat-snippet-check` (2 gates) | 3h | Score reproductible sur 5 pages pilotes |
| **J5** | `lga-snippet-fixer` + `lga-snippet-monitor` | 3h | PR dry-run validée sur 3 pages |
| **J6** | `me-snippet-pipeline` (orchestrateur) + run end-to-end sur 14 pages | 3h | Rapport final + PR ouverte |
| **J7** | Monitoring J+7 du batch, itération si régression | 1h | CTR delta mesuré |

**Total** : ~20h de travail concentré, étalable sur 1-2 semaines.

---

## 10. Tests d'acceptation (definition of done)

Le pipeline est **Grade A** quand :

1. **Reproductibilité** : deux runs sur le même XLSX GSC donnent un `score_total` identique à ±1% près (déterminisme des gates)
2. **Contrats** : chaque skill fail-fast si son input ne respecte pas le schéma JSON attendu (validation Zod en tête de chaque skill)
3. **YMYL safety** : aucun patch ne passe GATE 2 avec une promesse thérapeutique (test unitaire sur corpus de 20 titles volontairement toxiques)
4. **Budget DataForSEO** : consommation réelle ≤ 100 queries par run
5. **Rollback** : un patch qui régresse à J+14 est rollback-able en un seul commit via `lga-snippet-monitor`
6. **Orchestrateur** : un run complet (INIT → DONE) sur 14 pages produit les 3 livrables (JSON + MD + snapshot) sans intervention hors checkpoints prévus
7. **CTR mesurable** : delta CTR moyen post-patch ≥ +20% à J+14 sur le batch (objectif business)

---

## 11. Hors scope (volontaire)

- **Generation de content body** (déjà couvert par `me-affiliate-writer` + chaîne GAN existante)
- **Schema.org injection** (déjà couvert par `nposts-seo-fixer`)
- **Content decay** long terme (déjà couvert par `nposts-seo-post-publish`)
- **Backlinks audit** (autre pipeline)
- **Page speed / Core Web Vitals** (autre pipeline)
- **Traduction / hreflang** (autre pipeline)

---

## 12. Sources (recherche terrain 2026-04-18)

- [Zyppy — Title Tag Length Study](https://zyppy.com/title-tags/meta-title-tag-length/) : 40-60 chars = +8.9% CTR
- [Backlinko — 4M Google Results CTR Study](https://backlinko.com/google-ctr-stats) : position 1 = 27.6%, sentiment positif +4.1%
- [GrowthSRC — 2025 CTR Study 200K keywords](https://growthsrc.com/google-organic-ctr-study/) : position 1 passée à 19% (-32%), positions 6-10 +30%
- [Advanced Web Ranking — CTR curves tool](https://www.advancedwebranking.com/free-seo-tools/google-organic-ctr) : courbes par SERP feature et device
- [ALM Corp — AWR Q3 2025 analysis](https://almcorp.com/blog/advanced-web-ranking-google-ctr-analysis-2025-q3/) : AI Overview impact
- [Search Engine Land — Title Tag Length 2025](https://searchengineland.com/title-tag-length-388468) : 600px = truncation
- [Ahrefs — Title Tags SEO Guide](https://ahrefs.com/blog/title-tag-seo/) : formule ABC (Adjective + Benefit + Confidence)
- [Search Engine Journal — Google on Title Length](https://www.searchenginejournal.com/google-title-tag-length/400682/) : pas de limite dure, display ≈ 50-70 chars
- [Portent — Title Rewrite Rate](https://portent.com/blog/seo/how-often-google-rewrites-our-title-tags.htm) : 61-76% rewrite
- [Google SQRG v2025 (Sept 11)](https://services.google.com/fh/files/misc/hsw-sqrg.pdf) : auteur clinicien obligatoire YMYL médical
- [Search Engine Land — YMYL guide](https://searchengineland.com/guide/ymyl) : cadre E-E-A-T
- [Earnifyhub — Featured Snippets 2026](https://earnifyhub.com/blog/blogging/featured-snippets-bloggers-2026.php) : paragraph = 70% FS, 40-60 mots

---

## 13. Questions ouvertes à trancher avant code

1. **Multi-variantes** : garde-t-on 3 variantes A/B/C par page ou 1 seule « recommandée » ? (Impact : complexité evaluator × 3)
2. **CTR prediction** : heuristique simple (ce spec) ou on se connecte à un modèle plus fin (ex : intégration AWR API) ? (Budget : $49/mois AWR si opt-in)
3. **PR batch vs PR par page** : 1 PR de 14 changements ou 14 PR unitaires ? (Impact : review effort vs granularité rollback)
4. **Template centres RPPS** : on anticipe le template dans `lga-title-writer` dès v1, ou on le rajoute après les 14 pages éditoriales ?
5. **Nommage skills** : préfixe `lga-` (cohérent avec LGA) ou `me-` (cohérent avec les skills existants « me-product-* ») ?

---

## 14. Prochaine action

**Si Franck-Olivier valide ce spec** :
- Je commence J2 → `lga-gsc-ingestor` + `lga-query-mapper`
- Checkpoint à la fin de J2 avant de continuer

**Si révisions nécessaires** :
- Liste des points à changer
- Re-spec → re-validation
