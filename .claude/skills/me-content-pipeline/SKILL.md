---
name: me-content-pipeline
description: >
  Orchestre la chaine GAN complete pour la production de contenu LeGuideAuditif :
  generation → humanisation → double gate evaluateur (>=70) + E-E-A-T (>=80) → correction → publication.
  Coordonne 6 skills, gere les iterations RETRY (max 3), timeouts et escalades.
  Trigger: 'nouveau contenu', 'pipeline', 'produire article', 'chaine complete',
  'publier article', 'workflow editorial', 'creer guide', 'creer comparatif',
  'lancer la chaine', 'GAN', 'produire un comparatif', 'ecrire un guide'.
  Ne PAS utiliser pour : taches single-step qu'un skill gere seul.
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
---

# me-content-pipeline — Orchestrateur GAN

Orchestre la chaine GAN complete pour la production de contenu LeGuideAuditif.
De la generation a la publication, en passant par l'humanisation et le double gate YMYL.

## CHAINE GAN

```
me-affiliate-writer → nposts-seo-humanizer → me-detector-inverse (>=75)
→ nposts-content-evaluator (>=75 ET terrain >=80) → me-eeat-compliance (>=80)
→ nposts-seo-fixer → nposts-seo-post-publish
```

## MACHINE A ETATS

Consulter `references/pipeline-state-machine.md` pour la definition complete.

| Etat | Skill | Condition de sortie |
|---|---|---|
| INIT | — | Brief analyse, type determine (guide/comparatif) |
| GENERATING | me-affiliate-writer | Contenu genere avec frontmatter |
| HUMANIZING | nposts-seo-humanizer | Burstiness >= 0.7, Flesch 60-80, P0 = 0 |
| GATE_1_5 | me-detector-inverse | Score >= 75 (PASS) |
| GATE_1 | nposts-content-evaluator | Score >= 75 ET terrain >= 80 (PASS) |
| GATE_2 | me-eeat-compliance | Score >= 80 (PASS) |
| FIXING | nposts-seo-fixer | Corrections appliquees, JSON-LD injecte |
| PUBLISHING | nposts-seo-fixer | Branche + PR creees |
| MONITORING | nposts-seo-post-publish | Checks J+1/J+7/J+14/J+30 |
| DONE | — | Pipeline termine |
| BLOCKED | — | Escalade humaine (>3 retries ou REJECT) |

## TRANSITIONS

```
INIT → GENERATING          : toujours
GENERATING → HUMANIZING    : contenu produit
HUMANIZING → GATE_1_5      : humanisation complete
GATE_1_5 → GATE_1          : verdict == PASS (score >= 75)
GATE_1_5 → HUMANIZING      : verdict == FAIL-FIXABLE && iteration < 2
GATE_1_5 → BLOCKED         : verdict == FAIL-REWRITE || iteration >= 2
GATE_1 → GATE_2            : verdict == PASS (score >= 75 ET terrain >= 80)
GATE_1 → HUMANIZING        : verdict == REVISE && iteration < 3
GATE_1 → BLOCKED           : verdict == REJECT || iteration >= 3
GATE_2 → FIXING            : verdict == PASS (score >= 80)
GATE_2 → HUMANIZING        : verdict == REVISE && iteration < 3
GATE_2 → BLOCKED           : verdict == REJECT || iteration >= 3
FIXING → PUBLISHING        : tous les fixes appliques
PUBLISHING → MONITORING    : PR creee
MONITORING → DONE          : rapport J+30 complete
```

## PROTOCOLE RETRY

Adapte du feedback-loop nPosts.ai :

1. L'evaluateur ne modifie JAMAIS le contenu — il juge uniquement
2. Le generateur ne voit JAMAIS le verdict brut — seulement `GENERATOR_INSTRUCTIONS`
3. Maximum 3 iterations par gate. Au-dela → BLOCKED → escalade humaine
4. Si iteration N+1 a plus d'issues que iteration N → BLOCK immediat
5. Chaque iteration repasse par le humanizer avant retour au gate

## WORKFLOW

### 1. INIT — Analyser le brief

Collecter les informations :
- **Type** : guide ou comparatif
- **Sujet** : mot-cle principal, intent utilisateur
- **Mots-cles secondaires** : 3-5 LSI keywords
- **Structure H2** : plan de l'article
- **Produits** (si comparatif) : liste des modeles a comparer
- **Objectif mot-count** : 1500-2500 mots

### 2. GENERATING — Deleguer au generateur

Appeler `me-affiliate-writer` avec le brief.
Attendre la sortie JSON avec `content_md`, `frontmatter`, `products`.

### 3. HUMANIZING — Passer au humanizer

Appeler `nposts-seo-humanizer` avec le contenu brut.
Verifier les metriques de sortie : burstiness >= 0.7, Flesch FR 60-80.

### 4. GATE_1 — Evaluation contenu

Appeler `nposts-content-evaluator` avec le contenu humanise.
- **PASS** (>= 70) : continuer vers GATE_2
- **REVISE** (50-69) : extraire `generator_instructions`, renvoyer au humanizer (iteration N+1)
- **REJECT** (< 50) : BLOCKED

### 5. GATE_2 — Evaluation E-E-A-T

Appeler `me-eeat-compliance` avec le contenu passe Gate 1.
- **PASS** (>= 80) : continuer vers FIXING
- **REVISE** (60-79) : extraire les issues, renvoyer au humanizer (iteration N+1)
- **REJECT** (< 60) : BLOCKED

### 6. FIXING — Appliquer les corrections

Appeler `nposts-seo-fixer` avec le contenu + issues des 2 gates.
Injecter JSON-LD, valider frontmatter, ecrire le fichier MDX.

### 7. PUBLISHING — Creer la PR

`nposts-seo-fixer` cree la branche `content/{slug}` et la PR.
Inclure le rapport de pipeline dans la description de la PR.

### 8. MONITORING — Suivi post-publication

Planifier les checks `nposts-seo-post-publish` a J+1, J+7, J+14, J+30.

## RAPPORT DE PIPELINE

Afficher a chaque transition et en fin de cycle :

```
PIPELINE REPORT — {slug}

Etat    : {state}
Type    : {guide|comparatif}
Generateur : me-affiliate-writer

Gate 1 (content-evaluator)
  Iterations : {n}/3
  Score      : {score}/100
  Verdict    : {PASS|REVISE|REJECT}

Gate 2 (eeat-compliance)
  Iterations : {n}/3
  Score      : {score}/100
  Verdict    : {PASS|REVISE|REJECT}

Humanizer metriques
  Burstiness : {score}
  Flesch FR  : {score}
  Patterns IA remplaces : {n}

Fixer
  Fixes appliques : {n}
  Schemas JSON-LD : {list}

Publication
  Fichier : {path}
  Branche : content/{slug}
  PR      : {url|pending}

→ Prochaine action : {next_step}
```

## EXAMPLES

### Exemple 1 : Pipeline complet (happy path)

```
> "Cree un comparatif des appareils auditifs classe 1 les plus vendus en 2026"

PIPELINE REPORT — comparatif-appareil-auditif-classe-1-2026

Etat    : DONE
Type    : comparatif

Gate 1 : 1/3 iterations, score 78/100, PASS
Gate 2 : 1/3 iterations, score 85/100, PASS

Humanizer : burstiness 0.74, Flesch 72, 8 patterns remplaces
Fixer : 3 fixes (author box, disclaimer, affiliate mention), schemas Article+FAQPage+Product

Publication : src/content/comparatifs/comparatif-appareil-auditif-classe-1-2026.mdx
PR : https://github.com/.../pull/42
```

### Exemple 2 : Pipeline avec REVISE

```
> "Ecris un guide sur les acouphenes et les appareils auditifs"

PIPELINE REPORT — guide-acouphenes-appareils-auditifs

Etat    : DONE (2 iterations)
Type    : guide

Gate 1 : iteration 1 → REVISE (score 62 — keyword density trop basse, 1 seul lien interne)
         iteration 2 → PASS (score 74)
Gate 2 : 1/3 iterations, score 82/100, PASS

Humanizer : burstiness 0.71, Flesch 68, 11 patterns remplaces
Fixer : 4 fixes, schemas Article+FAQPage

Publication : src/content/guides/guide-acouphenes-appareils-auditifs.mdx
PR : https://github.com/.../pull/43
```

## ERROR HANDLING

### Skill indisponible
Si un skill de la chaine ne repond pas, attendre 30s puis retry 1x.
Si toujours indisponible → BLOCKED avec message precisant quel skill est en panne.

### Etat inattendu
Si la machine a etats arrive dans un etat non prevu → BLOCKED.
Logger l'etat courant, l'input et le dernier output pour debug.

### Contenu trop long
Si le generateur produit > 3000 mots, signaler au user avant de continuer.
Le humanizer et les evaluateurs sont moins efficaces sur des contenus tres longs.

## TROUBLESHOOTING

### Boucle REVISE infinie
Si les 3 iterations sont epuisees et le score n'a pas atteint le seuil :
1. Analyser les `generator_instructions` des 3 iterations — pattern recurrent ?
2. Le probleme est souvent dans le brief initial (trop vague, sujet trop large)
3. Proposer au user de reformuler le brief ou de reduire le scope

### Etat BLOCKED — comment reprendre
1. Lire le rapport de pipeline pour comprendre le blocage
2. Si REJECT (score < 50) : le contenu a un probleme fondamental, refaire le brief
3. Si > 3 iterations : les corrections sont insuffisantes, intervention humaine sur le fond
4. Apres correction manuelle, relancer le pipeline depuis l'etat HUMANIZING
