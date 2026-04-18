---
name: me-snippet-fixer
description: >
  Position 7 du pipeline snippet. Applique les patches title/meta/H1 sur les
  fichiers sources, UNIQUEMENT pour les propositions qui ont passé GATE 1
  (me-snippet-evaluator) ET GATE 2 (me-eeat-snippet-check). Patch chirurgical
  ligne par ligne (preserve le reste du frontmatter/template). Mode `--dry-run`
  par defaut (securite), `--apply` pour ecrire. Genere snapshot pre-patch pour
  rollback ulterieur par me-snippet-monitor.
  4 topologies : A MDX frontmatter, B BaseLayout props, C template dynamique,
  D template + DB. Overrides catalogue (schema Zod) et centres (Supabase) deferes V2.
  Trigger: 'patcher snippets', 'appliquer titles', 'dry-run snippet', 'fixer metas',
  'PR batch seo titles', 'snippet apply'.
  Ne PAS utiliser pour : generation (me-title-writer), scoring (me-snippet-evaluator,
  me-eeat-snippet-check), monitoring post-merge (me-snippet-monitor).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 7
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> [me-snippet-fixer] -> me-snippet-monitor"
  script: ".claude/me_snippet_fix.py"
  status: functional
---

# me-snippet-fixer — Position 7

Patche les fichiers sources selon les propositions validees par les 2 gates.

## INPUT / OUTPUT

```
python .claude/me_snippet_fix.py [--apply] [--out audit/snippet-patches-<today>.json]
```

Lit :
- `audit/snippet-eval-*.json` (GATE 1)
- `audit/eeat-check-*.json` (GATE 2)
- `audit/title-proposals-*.json` (writer output)

Filtre : **UNIQUEMENT** les propositions avec `gate1.verdict == "PASS"`
ET `gate2.verdict == "PASS"`.

## MODES

### `--dry-run` (DEFAUT)

Affiche le diff pour chaque fichier, **n'ecrit rien**. A utiliser en premier
pour verifier ce qui sera patche.

### `--apply`

Ecrit les patches sur les fichiers sources. Genere :
- `audit/snippet-patches-YYYY-MM-DD.json` : manifest des patches appliques
- `audit/snippet-patches-YYYY-MM-DD.snapshot.json` : **contenu pre-patch** pour rollback

**Important** : `--apply` modifie les fichiers du repo. A utiliser apres validation
humaine du dry-run. La PR et les commits sont faits par `me-snippet-pipeline`
(orchestrateur, J7).

## 4 PATCHERS

| Topologie | Patcher | Strategie |
|---|---|---|
| A_mdx_frontmatter | `patch_mdx_frontmatter` | Regex ligne par ligne, ajoute `metaTitle:` apres `title:` si absent, update `metaDescription:` inline. **Ne touche pas au `title:`** (H1 du site). |
| B_static_props | `patch_astro_props` | Regex sur `<BaseLayout title="..." description="...">`. Si `description` est une expression `{var}`, patch le `const description` a la place. |
| C_template_dynamic | `patch_astro_template` | Regex sur `const pageTitle = ...` / `const title = ...` et `const description = ...`. Stocke le pattern en template literal (backtick). |
| D_template_db | `patch_astro_template` | Idem C. |

## PATCH CHIRURGICAL (MDX)

Strategie v1 : **ne jamais reserialiser tout le YAML**. Risque de perdre
commentaires, ordre des champs, styles de guillemets.

Algorithme :
1. Split frontmatter en lignes
2. Parcours ligne par ligne
3. Si `metaTitle: ...` existe -> remplacer la ligne
4. Sinon si `title: ...` -> inserer `metaTitle: ...` juste apres
5. Si `metaDescription: ...` existe -> remplacer la ligne
6. Sinon inserer apres `metaTitle:`

Garantie : le diff reel est minimal (2-3 lignes maximum pour un ajout +
modification), preservant l'ordre des champs existants et leurs commentaires.

## ROLLBACK

Le snapshot `.snapshot.json` contient le contenu pre-patch de chaque fichier
touche. Pour rollback manuel :

```python
import json
snap = json.load(open("audit/snippet-patches-YYYY-MM-DD.snapshot.json"))
for f in snap["files"]:
    with open(f["source_file"], "w", encoding="utf-8") as fp:
        fp.write(f["content_before"])
```

Rollback automatise : cf. `me-snippet-monitor` (J8) qui rollback par fichier
si regression CTR > 20% a J+14.

## OVERRIDES DEFERRED V2

Pour les topologies C (catalogue appareils, centres), les gates produisent des
`individual_overrides` non appliques automatiquement en v1 :

### catalogue appareils

Necessite :
1. Etendre `src/content.config.ts` schema Zod `catalogueAppareils` :
   ```ts
   seoTitle: z.string().max(60).optional(),
   seoDescription: z.string().max(155).optional(),
   ```
2. Patcher `src/pages/catalogue/appareils/[slug].astro` pour prioriser :
   ```astro
   const title = product.seoTitle ?? `${fullName}${titleSuffix}`;
   const description = product.seoDescription ?? `${fullName}: ...`;
   ```
3. Pour chaque fiche produit top (impressions >= 3), ajouter `seoTitle` et
   `seoDescription` dans le fichier JSON produit

Le manifest v1 liste ces overrides dans `deferred_v2.catalogue_individual_overrides`
pour implementation manuelle (trop de risque de casse en automatique).

### centres (Supabase)

Necessite :
1. Migration `CREATE TABLE centres_seo_overrides (slug TEXT PK, seo_title TEXT, seo_description TEXT)`
2. Patcher `src/pages/centre/[slug].astro` pour requeter override en premier
3. Populer la table via script dedie

Liste dans `deferred_v2.centres_supabase_overrides`. **V2 non implementee** en v1.

## TEST DE NON-REGRESSION

Run sur LGA J+14 (propositions validees par les 2 gates) :

```
Mode=dry_run
Patchable (post-gates)   : 1  (audiogramme seul a PASS les 2 gates)
Deduplicated unique file : 1
DRY_RUN : 1
FAILED  : 0

Fichier patche : src/content/guides/audiogramme.mdx (topo A)
Lines changed : 3
  - metaDescription: "Comment lire un audiogramme tonal et vocal?..."
  + metaTitle: "Audiogramme normal : seuils par age (expert DE)"
  + metaDescription: "Comment lire un audiogramme a 50, 60, 70 ans?..."

[DEFERRED V2] 2 overrides catalogue
```

2 overrides catalogue sont proposes par le writer mais non appliques
automatiquement (necessite extension schema Zod).

## SCHEMA OUTPUT

```json
{
  "type": "me-snippet-fixer",
  "payload": {
    "mode": "dry_run" | "apply",
    "total_patchable": 1,
    "total_deduplicated": 1,
    "results": [
      {
        "url": "/guides/audiogramme/",
        "topology": "A_mdx_frontmatter",
        "source_file": "src/content/guides/audiogramme.mdx",
        "patch_mode": "individual",
        "patcher": "patch_mdx_frontmatter",
        "gate1_score": 86.0,
        "gate2_score": 100.0,
        "title_applied": "...",
        "meta_applied": "...",
        "diff_summary": {
          "lines_before": 50,
          "lines_after": 51,
          "lines_changed": 3,
          "sample_removed": ["..."],
          "sample_added": ["..."]
        },
        "status": "DRY_RUN" | "APPLIED" | "FAILED" | "SKIPPED"
      }
    ],
    "metrics": {"APPLIED": 0, "DRY_RUN": 1, "FAILED": 0, "SKIPPED": 0},
    "deferred_v2": {"catalogue_individual_overrides": [...], "centres_supabase_overrides": [...]}
  }
}
```

## V2 EXTENSIONS

1. **Git orchestration** : branche + commits granulaires (1 commit/fichier) ->
   deporte a `me-snippet-pipeline` (J7).
2. **PR creation** : `gh pr create` -> deporte a J7.
3. **Catalogue overrides automatiques** : extension schema Zod via `content.config.ts`
   patch safe + tests de build avant commit.
4. **Centres Supabase overrides** : migration + RLS policies + populate script.
5. **Rollback automatise** : `me-snippet-monitor` utilise le snapshot pour revert
   un patch regressif.
