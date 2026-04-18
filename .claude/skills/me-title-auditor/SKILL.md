---
name: me-title-auditor
description: >
  Position 3 du pipeline snippet. Pour chaque page du JSON me-query-mapper,
  résout URL -> fichier source Astro/MDX selon topologie (A MDX frontmatter /
  B static props / C template dynamique / D template + DB), extrait le title,
  meta description et H1 actuels, calcule un Mismatch Score /100 sur 7 critères
  et un ROI strike-zone (4-10 sweet, 11-20 max gain, 1-3 limité, 21+ fix
  content first). Priorise high/medium/low. Ne modifie JAMAIS les fichiers.
  Trigger: 'auditer titles', 'mismatch score', 'roi strike-zone', 'prioriser pages',
  'title audit', 'lire titles actuels', 'detecter suffixe lga'.
  Ne PAS utiliser pour : parsing GSC (me-gsc-ingestor), mapping queries (me-query-mapper),
  generation titles (me-title-writer), patching (me-snippet-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 3
  chain: "me-gsc-ingestor -> me-query-mapper -> [me-title-auditor] -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_title_audit.py"
  status: functional
---

# me-title-auditor — Position 3

Audit read-only des titles/metas actuels vs queries GSC. Produit le **plan de
bataille** priorisé par ROI.

## INPUT

Paramètres CLI :

| Param | Default | Description |
|---|---|---|
| `--in` | dernier `audit/gsc-mapped-*.json` | JSON de me-query-mapper |
| `--out` | `audit/title-audit-<today>.json` | Chemin de sortie |

## WORKFLOW

1. **Invoquer** : `python .claude/me_title_audit.py`
2. **Vérifier les metrics** :
   - `source_file_resolution_errors` = 0 attendu. Si > 0, inspecter les URL
     non résolues (nouvelle topologie ? route renommée ?)
   - `pages_priority_high` : ciblage principal du writer aval
3. **Présenter à l'utilisateur** :
   - Top 5 pages par ROI (URL, mismatch, priorité)
   - Top 3 avec détails mismatch (reasons + title/meta actuels)
   - Patterns systémiques détectés (ex : "X pages ont un suffixe parasite")
4. **Checkpoint humain** : valider les priorités avant de passer à `me-title-writer`.

## MISMATCH SCORE /100 (7 critères)

| Code | Poids | Déclencheur |
|---|---|---|
| `primary_query_absent` | 30 | ≥75% des tokens de la query top-impr absents du title |
| `credibility_DE_absent` | 15 | Ni "audioprothésiste", "DE", "28 ans", "expert" dans title OU meta |
| `suffix_parasitic` | 10 | "— LGA", "- LGA", "— LeGuideAuditif.fr" détecté en fin de title |
| `price_missing_in_meta` | 20 | Page `/catalogue/appareils/*` sans "€" ou "prix" dans meta |
| `long_tail_ignored` | 15 | Queries long-tail avec impr ≥ 2 absentes du title ET de la meta |
| `title_too_long` | 5 | title > 60 chars |
| `meta_too_long` | 5 | meta > 155 chars |

Score max théorique : 100. Seuil d'alerte : ≥ 50.

## ROI STRIKE-ZONE

```
roi = impressions * (1 / max(pos, 1)) * strike_zone_factor
```

| Position | Factor | Zone | Stratégie |
|---|---|---|---|
| 1-3 | 0.3 | limited_margin | déjà bon, gain marginal |
| **4-10** | **1.0** | **sweet_spot** | **CTR boost immédiat** |
| **11-20** | **1.5** | **strike_zone** | **gain maximal possible** |
| 21+ | 0.4 | deep | problème de fond, titre secondaire |

**Priorité** :
- `high` : ROI ≥ 1.0
- `medium` : ROI ≥ 0.3
- `low` : ROI < 0.3

Pour LGA (site jeune, peu d'impressions par page), HIGH est rare. Viser
MEDIUM + HIGH en batch.

## RÉSOLUTION URL -> FICHIER (par topologie)

| Topologie | Stratégie |
|---|---|
| A | Glob `src/content/<collection>/**/<slug>.mdx` |
| B | `src/pages/<parts>/index.astro` OU `src/pages/<parts>.astro` |
| C | Cherche `[slug].astro`, `[...slug].astro`, `[ville].astro`, `[...vs].astro`, `[dep].astro` en remontant du chemin le plus long vers le plus court |
| D | Même que C (distinction DB = sémantique) |

## EXTRACTION SEO (par topologie)

| Topologie | Regex utilisée |
|---|---|
| A | YAML frontmatter → `metaTitle` > `title`, `metaDescription` |
| B | `<BaseLayout title="..."  description="...">` littéral string |
| C/D | `const pageTitle = ...` / `const title = ...` / `const description = ...` (capture template literals) |

### Cas connu : extraction imparfaite en topologie C

Pour `/catalogue/appareils/[slug].astro`, le title est construit avec une
expression ternaire (`(fullName + titleSuffix).length > 60 ? ... : ...`).
Le regex v1 ne capture pas ce cas.

**Conséquence** : `current.title = null`, le mismatch `primary_query_absent`
se déclenche mécaniquement (30 pts) + `long_tail_ignored` (15 pts).
L'output reste correct — le writer aval sait que c'est un pattern template
via `extraction_meta.source_title`.

**V2** : ajouter un parser AST Astro pour couvrir les expressions ternaires
et les conditionals complexes. Non bloquant en V1.

## OUTPUT

Voir `audit/title-audit-YYYY-MM-DD.json`. Schéma clé :

```json
{
  "type": "me-title-auditor",
  "payload": {
    "pages": [
      {
        "url": "/guides/audiogramme/",
        "topology": "A_mdx_frontmatter",
        "source_file": "src/content/guides/audiogramme.mdx",
        "current": { "title": "...", "meta": "...", "h1": "...", "title_chars": 46 },
        "mismatch": {
          "score": 45,
          "reasons": [
            { "code": "primary_query_absent", "weight": 30, "detail": "..." }
          ],
          "primary_query": "audiogramme normal 50 ans"
        },
        "roi": { "score": 1.98, "strike_zone": "strike_zone_11_20", "strike_zone_factor": 1.5 },
        "priority": "high"
      }
    ],
    "audit_metrics": {...}
  }
}
```

## TEST DE NON-RÉGRESSION

Run sur LGA post-launch J+14 avec les données GSC réelles :

```
13 pages, 0 erreur de résolution
Top ROI : /guides/audiogramme/ (ROI 1.98, mismatch 45, priority HIGH)
Mismatch ≥ 50 : 4 pages
Priorités : 1 HIGH, 3 MEDIUM, 9 LOW
```

Si l'auditor produit :
- Source file resolution errors > 0 → nouvelle route non couverte par les resolvers
- 0 page HIGH ni MEDIUM → seuils ROI à ajuster OU site sans data GSC significative
- Mismatch score tous à 0 → bug dans `compute_mismatch` ou queries mal taggées

## PERF

Le script est entièrement synchrone, CPU-bound (regex + file I/O). Sur LGA
13 pages → ~0.5 s. Sur 7 146 centres RPPS → estimé ~30 s (acceptable).
