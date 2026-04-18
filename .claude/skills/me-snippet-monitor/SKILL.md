---
name: me-snippet-monitor
description: >
  Position 8 du pipeline snippet. Compare les metriques GSC (CTR, position)
  avant/apres merge PR patch pour chaque page modifiee. A J+7, J+14, J+30.
  Flag ROLLBACK_CANDIDATE si CTR post < 80% CTR pre ET position delta > +3.
  Mode rollback dedie : restaure les fichiers sources depuis le snapshot
  pre-patch, granulaire par URL (pas du batch entier).
  Trigger: 'monitorer snippets', 'check j+7 titles', 'ctr delta batch', 'rollback snippet',
  'verifier regression titles', 'monitor post-merge'.
  Ne PAS utiliser pour : monitoring content body (nposts-seo-post-publish), patching
  (me-snippet-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 8
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer -> [me-snippet-monitor]"
  script: ".claude/me_snippet_monitor.py"
  status: functional
---

# me-snippet-monitor — Position 8

Compare CTR/position avant/apres patch + rollback granulaire.

## USAGE

### Monitor mode (check post-merge)

```bash
# J+7 apres merge de la PR
python .claude/me_snippet_monitor.py --days 7

# Explicite (si plusieurs baselines)
python .claude/me_snippet_monitor.py \
    --baseline audit/gsc-ingested-2026-04-18.json \
    --patches  audit/snippet-patches-2026-04-18.json \
    --days 7
```

### Rollback mode

```bash
# Rollback d'une URL specifique (snapshot auto-detecte)
python .claude/me_snippet_monitor.py --rollback --urls /guides/audiogramme/

# Rollback explicite avec snapshot
python .claude/me_snippet_monitor.py --rollback \
    --snapshot audit/snippet-patches-2026-04-18.snapshot.json \
    --urls /guides/audiogramme/ /autre/url/
```

## CHECKPOINTS

| Timing | Focus |
|---|---|
| J+1 | Indexation verifiee (via nposts-seo-post-publish) |
| **J+7** | Premiere tendance CTR/position |
| **J+14** | **Decision rollback** (regle : CTR < 80%*baseline ET pos_delta > +3) |
| J+30 | Stabilisation, rapport final |

## REGLE ROLLBACK

```python
if b["ctr"] > 0 \
   and c["ctr"] < b["ctr"] * 0.8 \
   and pos_delta > 3.0:
    rollback_candidate = True
```

Les 3 conditions **cumulatives** evitent les faux positifs (une page qui descend
de position 10 a 15 avec CTR stable est OK). Seule la **regression combinee**
CTR + position signe un vrai probleme.

## REGLE WIN

```python
if b["ctr"] > 0 \
   and c["ctr"] > b["ctr"] * 1.2 \
   and pos_delta < 1.0:
    win = True
```

## VERDICTS

| Verdict | Condition | Action |
|---|---|---|
| **WIN** | CTR +20% ET pos stable | Aucune |
| **NEUTRAL** | Entre WIN et ROLLBACK | Surveiller J+14 |
| **ROLLBACK_CANDIDATE** | CTR -20% ET pos +3 | Rollback granulaire recommande |

## ROLLBACK GRANULAIRE

Le snapshot `.snapshot.json` contient le contenu **pre-patch** de chaque fichier
touche par le fixer. Le rollback :

1. Resout URL -> source_file via le manifest
2. Charge content_before du snapshot
3. Ecrit le contenu original dans le fichier
4. Commit git (manuel ou automatisable)

**Granularite** : une seule URL peut etre rollbackee sans affecter les autres
patches du batch. Cles de robustesse : le batch reste valuable meme si 1-2
patches regressent.

## OUTPUT

```json
{
  "type": "me-snippet-monitor",
  "mode": "monitor" | "rollback",
  "payload": {
    "days_since_patch": 7,
    "comparisons": [
      {
        "url": "/guides/audiogramme/",
        "before": {"impressions": 15, "clicks": 0, "ctr": 0.0, "avg_position": 11.4},
        "after":  {"impressions": 22, "clicks": 1, "ctr": 0.0455, "avg_position": 8.2},
        "ctr_delta_abs": 0.0455,
        "ctr_delta_pct": null,
        "pos_delta": -3.2,
        "impr_delta_pct": 46.7,
        "verdict": "WIN"
      }
    ],
    "metrics": {
      "total_patched": 1,
      "WIN": 1,
      "NEUTRAL": 0,
      "ROLLBACK_CANDIDATE": 0,
      "avg_ctr_delta_pct": ...,
      "avg_pos_delta": ...
    },
    "rollback_candidates": []
  }
}
```

## TEST DE NON-REGRESSION

Run en sanity check (baseline == current, meme periode GSC) :

```
Pages patchees suivies : 1
CTR delta moyen        : +0.0%
Position delta moyen   : +0.0
Verdict                : NEUTRAL
```

Attendu : 0 WIN, 0 ROLLBACK_CANDIDATE, 1 NEUTRAL (car baseline = current).
Test reussi si le script termine sans erreur.

## INTEGRATION AVEC L'ORCHESTRATEUR

Le `me-snippet-pipeline` ne declenche PAS `me-snippet-monitor` automatiquement.
Par design : il faut attendre J+7 post-merge, ce qui excede la duree d'un run
synchrone. L'orchestrateur se termine apres FIXING ; le monitor est lance
manuellement (ou via cron) a J+7, J+14, J+30.

Exemple cron :
```bash
# J+7 apres merge : monitor automatique
0 9 * * * cd /path/to/repo && python .claude/me_snippet_monitor.py --days 7 > monitor-j7.log 2>&1
```

## V2 EXTENSIONS

1. **Rollback git automatise** : `git revert <commit>` au lieu de restoration
   de fichier, pour preserver l'historique.
2. **Alertes email/slack** : si ROLLBACK_CANDIDATE detecte, notifier Franck.
3. **Dashboard CTR historique** : viz trend sur 30 jours (utilise `data:build-dashboard`).
4. **Comparaison entre batches** : si plusieurs patch batches, detecter interactions
   negatives (un fixe casse un autre).
