---
name: me-gsc-ingestor
description: >
  Position 1 du pipeline snippet. Récupère les données GSC (clicks, impressions,
  CTR, position, queries) via l'API Google Search Console directement (pas de XLSX),
  normalise les URLs (strip www / https / query), filtre les queries brand, agrège
  par page, exclut les pages sous le seuil d'impressions. Produit un JSON canonique
  consommé par me-query-mapper.
  Trigger: 'ingest gsc', 'parser gsc', 'recuperer donnees gsc', 'normaliser urls gsc',
  'first step pipeline snippet', 'lancer audit titles'.
  Ne PAS utiliser pour : enrichissement SERP (me-query-mapper), audit mismatch
  (me-title-auditor), monitoring post-patch (me-snippet-monitor).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 1
  chain: "[me-gsc-ingestor] -> me-query-mapper -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_gsc_ingest.py"
  status: functional
---

# me-gsc-ingestor — Position 1

Récupère et normalise les données GSC. Utilise `google_api.py` existant
(pas de dépendance XLSX, pas de fichier à uploader).

## INPUT

Paramètres CLI (tous optionnels) :

| Param | Default | Description |
|---|---|---|
| `--days` | `28` | Fenêtre glissante en jours |
| `--min-impr` | `5` | Seuil d'impressions pour garder une page |
| `--out` | `audit/gsc-ingested-<today>.json` | Chemin de sortie |

## WORKFLOW

1. **Pré-requis** : `.claude/google_token.json` existe (token OAuth GSC). Sinon,
   guider l'utilisateur vers la génération du token (doc GA4 admin provisioning).
2. **Déterminer la fenêtre** : si utilisateur précise une période, convertir en
   `--days`. Sinon par défaut 28 jours.
3. **Déterminer le seuil** : si site jeune (< 30 jours post-lancement) et data
   éparse, proposer `--min-impr 3`. Sinon 5.
4. **Invoquer le script** via Bash :
   ```
   python .claude/me_gsc_ingest.py --days 28 --min-impr 5
   ```
5. **Lire le JSON produit** dans `audit/gsc-ingested-YYYY-MM-DD.json`.
6. **Synthèse** à présenter à l'utilisateur :
   - Période couverte
   - Nombre de pages avec impressions ≥ seuil
   - Top 5 pages par impressions
   - Pages filtrées (brand + sous le seuil)
7. **Passer la main** à `me-query-mapper` avec le chemin du JSON.

## OUTPUT

Voir `references/output-schema.md`. Format canonique :

```json
{
  "type": "me-gsc-ingestor",
  "version": "1.0.0",
  "payload": {
    "period": {"start": "...", "end": "...", "days": 28},
    "filters": {"min_impressions_per_page": 5, "brand_exclusions": [...]},
    "metrics": {...},
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "url_normalized": "leguideauditif.fr/guides/audiogramme/",
        "gsc": {"impressions": 15, "clicks": 0, "ctr": 0.0, "avg_position": 11.4},
        "top_queries_probable": [{"q": "...", "impr": 6, "pos": 9.8, "clicks": 0}],
        "brand_queries_count": 0
      }
    ]
  },
  "generated_at": "ISO datetime"
}
```

## NORMALISATION D'URL (critique)

Le script gère les 4 variantes d'origine (découvert lors du run réel) :
- `https://www.leguideauditif.fr/...`
- `https://leguideauditif.fr/...`
- `http://www.leguideauditif.fr/...`
- `http://leguideauditif.fr/...`

Toutes sont réduites à un path relatif `/...` avec trailing slash sur les
directory-like (pas sur les fichiers avec extension).

Le split www/non-www signalé dans `Docs/lga-title-audit-prompt.md` §12 est **résolu
ici**. Plus de split d'autorité visible en aval du pipeline.

## FILTRE BRAND

Regex case-insensitive :
```
\bleguideauditif\b
\bguide\s+auditif\b
\bfranck[\-\s]?olivier\b
\bchabbat\b
```

Les rows brand ne sont pas supprimés, ils sont isolés dans `brand_queries_count`
(peut être utile plus tard pour analyse brand).

## ERREURS POSSIBLES

| Erreur | Cause | Remède |
|---|---|---|
| `FileNotFoundError: google_token.json` | Token GSC manquant | Exécuter le flow OAuth GSC |
| `HttpError 403` | Token expiré ou permissions | Rafraîchir via `_get_credentials()` |
| 0 pages avec impressions | Seuil trop haut OU site sans data | Baisser `--min-impr` à 3 |
| 0 rows total | Site non connecté à GSC | Vérifier `GSC_SITES` dans google_api.py |

## TEST DE NON-RÉGRESSION

Run attendu sur site jeune (J+14 post-lancement) :
- ~58 rows total
- ~13 pages avec impressions ≥ 3
- Top page `/guides/audiogramme/` (15 impr, pos ~11)
- 0 URL non-normalisée dans l'output (pas de `https://www...`)

Si le run produit 0 pages ou 0 rows, échec de normalisation ou token invalide.
