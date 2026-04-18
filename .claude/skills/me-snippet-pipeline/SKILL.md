---
name: me-snippet-pipeline
description: >
  Orchestrateur de la chaine GAN snippet SEO LeGuideAuditif. Enchaine 7 skills
  en sequence : me-gsc-ingestor -> me-query-mapper -> me-title-auditor ->
  me-title-writer -> me-snippet-evaluator (GATE 1) -> me-eeat-snippet-check
  (GATE 2) -> me-snippet-fixer, avec state machine, checkpoints humains
  obligatoires (apres AUDITING et avant FIXING), mode dry-run par defaut,
  logging complet dans audit/pipeline-run-*.json.
  Trigger: 'lancer pipeline snippet', 'run complet seo titles', 'chaine GAN snippet',
  'orchestrateur snippet', 'audit titles full'.
  Ne PAS utiliser pour : etape unique (scripts directs), content article body
  (me-content-pipeline), monitoring post-merge (me-snippet-monitor).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  script: ".claude/me_snippet_pipeline.py"
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer"
  status: functional
---

# me-snippet-pipeline — Orchestrateur

Chaine les 7 scripts du pipeline snippet SEO avec checkpoints humains.

## USAGE

```bash
# Dry-run complet (defaut, securite)
python .claude/me_snippet_pipeline.py --skip-checkpoint

# Run interactif avec prompts Y/N aux checkpoints
python .claude/me_snippet_pipeline.py

# APPLY les patches (apres validation du dry-run)
python .claude/me_snippet_pipeline.py --apply

# Options avancees
python .claude/me_snippet_pipeline.py \
  --days 28 \            # fenetre GSC
  --min-impr 3 \         # seuil impressions
  --priority medium \    # seuil min (high|medium|low)
  --apply \              # fixer en mode apply
  --skip-checkpoint \    # auto-continue (CI mode)
  --stop-at GATE_2       # debug: stop apres un etat
```

## STATE MACHINE

```
INIT -> INGESTING -> MAPPING -> AUDITING -> [CHECKPOINT] -> WRITING
  -> GATE_1 -> GATE_2 -> [CHECKPOINT] -> FIXING -> DONE
```

| Etat | Script | Sortie |
|---|---|---|
| INGESTING | `me_gsc_ingest.py` | `audit/gsc-ingested-*.json` |
| MAPPING | `me_query_map.py` | `audit/gsc-mapped-*.json` |
| AUDITING | `me_title_audit.py` | `audit/title-audit-*.json` |
| **CHECKPOINT 1** | prompt humain | (ROI + priorites affichees) |
| WRITING | `me_title_write.py` | `audit/title-proposals-*.json` |
| GATE_1 | `me_snippet_evaluate.py` | `audit/snippet-eval-*.json` |
| GATE_2 | `me_eeat_snippet_check.py` | `audit/eeat-check-*.json` |
| **CHECKPOINT 2** | prompt humain | (gates summary + liste patchable) |
| FIXING | `me_snippet_fix.py` | `audit/snippet-patches-*.json` + `.snapshot.json` |
| DONE | log final | `audit/pipeline-run-*.json` |

## CHECKPOINTS HUMAINS

### Apres AUDITING

Affiche :
- Nombre de pages auditees + repartition priorites HIGH/MEDIUM/LOW
- Top 5 pages par ROI (URL, mismatch, priority)

Decision humaine : continuer vers WRITING ? Si non, pipeline ABORT (les fichiers
deja produits restent disponibles pour audit manuel).

### Apres GATE_2 (avant FIXING)

Affiche :
- GATE 1 metrics (PASS/REVISE/REJECT + score moyen)
- GATE 2 metrics (PASS/REJECT + detections YMYL)
- Liste des propositions qui ont PASS les DEUX gates (= candidats au patch)
- Mode FIXING : dry-run OU apply

Decision humaine : lancer FIXING ?
- Si mode **apply** : les fichiers sources seront modifies
- Si mode **dry-run** : affichage du diff seulement

## SKIP CHECKPOINT (CI mode)

`--skip-checkpoint` : auto-continue. Utile pour :
- Runs automatises (cron hebdo)
- Tests de non-regression
- Re-runs apres fix (iteration rapide)

Usage recommande : `--skip-checkpoint` avec **`--apply` explicite** uniquement
apres validation humaine du dry-run precedent.

## LOGGING

Chaque run produit `audit/pipeline-run-YYYY-MM-DD.json` avec :
- Args d'invocation
- Statut de chaque etat (returncode, ok)
- Timestamp completion

Les sorties intermediaires restent dans `audit/` pour audit / comparaison historique.

## TEST DE NON-REGRESSION

Run complet sur LGA J+14 (dry-run) :

```
INGESTING -> 13 pages avec impressions >= 3
MAPPING   -> 10 C + 2 B + 1 A, buckets 6/6/16, intents 17/3/8/0
AUDITING  -> 1 HIGH (audiogramme ROI 1.98), 3 MEDIUM, 9 LOW
WRITING   -> 1 individual + 2 templates + 2 overrides
GATE_1    -> PASS=1 REVISE=2 REJECT=0 (moy 81.5)
GATE_2    -> PASS=3 REJECT=0 (moy 100.0)
FIXING    -> 1 dry-run sur audiogramme.mdx (3 lignes changees)
DONE      -> pipeline-run-2026-04-18.json ecrit
```

Timing total : ~10 secondes sur site LGA (13 pages). Estime ~3 min sur 7146
centres RPPS (I/O + DataForSEO optionnel).

## RESILIENCE

- Si un script retourne != 0 : pipeline BLOCKED, sort avec code 1. Pas de rollback
  auto (les fichiers JSON produits restent intacts).
- Si timeout (600 s) : return code 124.
- Si checkpoint humain refuse : sortie propre avec code 0 (ABORTED).

## V2 EXTENSIONS

- **Boucle RETRY writer <-> gates** : en v1 pas necessaire (writer deterministe,
  failures sont structurelles). En v2, si on rend le writer non-deterministe
  (LLM), alors max 3 iterations puis escalade.
- **Git orchestration post-fixing** : creer branche + commit + PR via `gh` CLI.
  Actuellement le fixer ecrit les fichiers mais ne git-commit pas.
- **Run programmable** : appel sans CLI depuis un autre skill, avec input/output
  dict Python directement (pas de subprocess).
- **Parallelisation** : certains scripts (WRITING par page) pourraient paralleliser.
  V1 sequentielle suffit largement.
