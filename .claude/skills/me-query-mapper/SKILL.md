---
name: me-query-mapper
description: >
  Position 2 du pipeline snippet. Enrichit le JSON me-gsc-ingestor en classant
  chaque query en bucket (head / mid / long_tail) et intent (informational /
  transactional / navigational / local), et détecte la topologie de chaque page
  (A mdx_frontmatter, B static_props, C template_dynamic, D template_db) pour
  guider le fixer aval. V1 : heuristiques lexicales sans DataForSEO (gratuit,
  déterministe). V2 optionnelle : enrichissement DataForSEO MCP avec cap 100 queries.
  Trigger: 'mapper queries', 'bucket queries gsc', 'enrichir gsc', 'classifier queries',
  'detecter topologie pages', 'query intent'.
  Ne PAS utiliser pour : parsing GSC brut (me-gsc-ingestor), audit mismatch
  (me-title-auditor), proposition titles (me-title-writer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 2
  chain: "me-gsc-ingestor -> [me-query-mapper] -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_query_map.py"
  status: functional
---

# me-query-mapper — Position 2

Classifie les queries par bucket et intent, détecte la topologie de chaque page.
Consomme le JSON de `me-gsc-ingestor`, produit un JSON enrichi pour `me-title-auditor`.

## INPUT

Paramètres CLI :

| Param | Default | Description |
|---|---|---|
| `--in` | dernier `audit/gsc-ingested-*.json` | JSON de l'ingestor |
| `--out` | `audit/gsc-mapped-<today>.json` | Chemin de sortie |

## WORKFLOW

1. **Invoquer** :
   ```
   python .claude/me_query_map.py
   ```
2. **Vérifier le summary console** :
   - Topologies : A (MDX), B (static), C (template), D (template + DB)
   - Buckets : head / mid / long_tail
   - Intents : informational / transactional / navigational / local
3. **Passer la main** à `me-title-auditor` avec le chemin du JSON de sortie.

## HEURISTIQUES (V1 — pas de DataForSEO)

### Buckets

| Bucket | Règle lexicale |
|---|---|
| `long_tail` | ≥ 5 mots OU contient un modifier (année, prix, remboursement, normal, par âge, comment, pourquoi, arrondissement, code postal 5 chiffres, slug 3+ segments) |
| `head` | ≤ 2 mots ET pas de modifier |
| `mid` | 3-4 mots ET pas de modifier |

### Intent

| Intent | Patterns |
|---|---|
| `local` | CP 5 chiffres, villes majeures (Paris, Lyon, etc.), "près", "proche" |
| `transactional` | "acheter", "prix", "tarif", "coût", "promo", "comparer", "meilleur prix" |
| `navigational` | Noms de marques (Widex, Phonak, Oticon, Signia, ReSound, Starkey, Bernafon, Unitron) OU réseaux (Afflelou, Amplifon, Audika) |
| `informational` | Défaut (tout ce qui n'est ni local, ni transactional, ni navigational) |

### Topologies (cohérent avec le plan)

| Topologie | Route pattern | Patcher aval |
|---|---|---|
| `A_mdx_frontmatter` | `/guides/*`, `/comparatifs/*` | Frontmatter YAML |
| `B_static_props` | `/`, `/trouver-audioprothesiste/`, `/auteur/*`, `/glossaire/`, `/etudes/*` (index), `/annonces/*` (index), `/outils/*` (index), `/catalogue/classe-1`, `/catalogue/comparer`, `/catalogue/quiz` | Props `<BaseLayout>` |
| `C_template_dynamic` | `/centre/*`, `/catalogue/*/[slug]`, `/catalogue/marques/*`, `/catalogue/types/*`, `/catalogue/plateformes/*`, `/catalogue/comparer/*`, `/etudes/*` (fiche), `/annonces/*` (fiche), `/outils/*` (fiche) | Template `const pageTitle = ...` |
| `D_template_db` | `/audioprothesiste/*`, `/audioprothesiste/departement/*` | Template + data Supabase |

La détection exacte du fichier source est déportée à `me-title-auditor` qui lit le
système de fichiers.

## OUTPUT

```json
{
  "type": "me-query-mapper",
  "version": "1.0.0",
  "payload": {
    "period": {...},
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "topology": "A_mdx_frontmatter",
        "gsc": {...},
        "mapped_queries": [
          {
            "q": "audiogramme normal 50 ans",
            "impr": 6,
            "clicks": 0,
            "pos": 9.8,
            "bucket": "long_tail",
            "intent": "informational",
            "monthly_volume": null,
            "serp_features": [],
            "ai_overview_present": null,
            "confidence": 1.0
          }
        ]
      }
    ],
    "mapper_metrics": {
      "buckets": {...},
      "intents": {...},
      "topologies": {...},
      "dataforseo_enriched": false,
      "dataforseo_budget_consumed": 0,
      "dataforseo_budget_cap": 100
    }
  },
  "upstream": {...},
  "generated_at": "..."
}
```

## V2 — ENRICHISSEMENT DATAFORSEO (optionnel)

Pour obtenir les volumes mensuels réels + SERP features + présence d'AI Overview :

1. L'utilisateur valide l'opt-in (coût DataForSEO ≈ 0.50€/run pour 100 queries)
2. Pour chaque query (top 100 par impressions) :
   - Appeler `mcp__dataforseo__dataforseo_labs_google_keyword_overview`
     - `keywords: [query]`
     - `location_code: 2250` (France)
     - `language_code: "fr"`
   - Extraire `search_volume`, `keyword_difficulty`
   - Optionnellement : `serp_organic_live_advanced` pour récupérer `ai_overview`, `featured_snippet`, `people_also_ask`
3. Merger dans les `mapped_queries[*]` : `monthly_volume`, `serp_features`, `ai_overview_present`
4. Mettre à jour `payload.mapper_metrics.dataforseo_enriched = true`
5. Budget : cap hard 100 queries par run, incrémenter `dataforseo_budget_consumed`

Priorité du budget : impressions ≥ 10 > 5-9 > 1-4.

Cette étape est optionnelle. Le reste du pipeline (`me-title-auditor`, `me-title-writer`,
les 2 gates, le fixer) fonctionne avec V1 lexicale seule.

## TEST DE NON-RÉGRESSION

Run sur site LGA post-lancement (J+14) :
- 13 pages avec ≥ 3 impressions
- Topologies : ~1 A, ~2 B, ~10 C (beaucoup de centres + catalogue)
- Buckets : majoritairement long_tail (queries santé sont longues)
- Intents : principalement informational + navigational (marques)
- 0 erreur JSON, output `audit/gsc-mapped-YYYY-MM-DD.json` créé
