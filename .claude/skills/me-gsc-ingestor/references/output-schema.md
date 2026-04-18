# me-gsc-ingestor — Output schema

Schéma canonique du JSON produit par `.claude/me_gsc_ingest.py`.
Ce fichier est la **source de vérité** pour les skills aval (`me-query-mapper`,
`me-title-auditor`).

## Schema TypeScript

```ts
interface GscIngestorOutput {
  type: "me-gsc-ingestor";
  version: "1.0.0";
  payload: {
    period: {
      start: string;      // ISO date "YYYY-MM-DD"
      end: string;        // ISO date
      days: number;
    };
    filters: {
      min_impressions_per_page: number;
      brand_exclusions: string[];
    };
    metrics: {
      total_rows_gsc: number;
      total_pages: number;
      pages_with_impressions: number;
      pages_filtered_below_min_impr: number;
      brand_query_rows_filtered: number;
    };
    pages: PageEntry[];
  };
  generated_at: string;   // ISO datetime
}

interface PageEntry {
  url: string;                    // normalisé : "/guides/audiogramme/"
  url_normalized: string;         // "leguideauditif.fr/guides/audiogramme/"
  gsc: {
    impressions: number;
    clicks: number;
    ctr: number;                  // 0-1 (pas en %)
    avg_position: number;         // pondéré par impressions
  };
  top_queries_probable: Query[];  // triées par impr desc, cap à 10
  brand_queries_count: number;
}

interface Query {
  q: string;
  impr: number;
  clicks: number;
  pos: number;
}
```

## Invariants

1. **Tri** : `pages[]` trié par `gsc.impressions` desc.
2. **Unicité** : chaque `url` apparaît au plus une fois dans `pages[]`
   (la normalisation www/non-www garantit l'unicité).
3. **top_queries_probable** : trié par `impr` desc, cap à 10 queries.
4. **Pages avec `brand_queries_count > 0`** ne sont PAS filtrées (seul le `queries_brand`
   interne est exclu des métriques GSC agrégées).
5. **`ctr` est en ratio 0-1**, pas en pourcentage. Pour affichage : multiplier par 100.

## Convention de nommage

`audit/gsc-ingested-YYYY-MM-DD.json` où YYYY-MM-DD = date du run.
Permet de comparer plusieurs runs historiques (utile pour `me-snippet-monitor`).
