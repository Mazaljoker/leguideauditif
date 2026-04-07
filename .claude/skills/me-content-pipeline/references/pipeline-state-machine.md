# Machine a etats — Pipeline GAN LeGuideAuditif

Adapte du protocole feedback-loop de nPosts.ai.

## Etats

| Etat | Description | Skill responsable |
|---|---|---|
| INIT | Analyse du brief, selection du generateur | Orchestrateur |
| GENERATING | Production du contenu brut | me-affiliate-writer |
| HUMANIZING | Humanisation voix Franck-Olivier | nposts-seo-humanizer |
| GATE_1 | Evaluation qualite (5 axes) | nposts-content-evaluator |
| GATE_2 | Audit E-E-A-T YMYL | me-eeat-compliance |
| FIXING | Application corrections + JSON-LD | nposts-seo-fixer |
| PUBLISHING | Creation branche + PR | nposts-seo-fixer |
| MONITORING | Suivi J+1/J+7/J+14/J+30 | nposts-seo-post-publish |
| DONE | Pipeline termine | — |
| BLOCKED | Escalade humaine requise | — |

## Transitions

```
INIT ──────────→ GENERATING         (toujours)
GENERATING ────→ HUMANIZING         (contenu produit)
HUMANIZING ────→ GATE_1             (humanisation complete)

GATE_1 ────────→ GATE_2             (PASS, score >= 70)
GATE_1 ────────→ HUMANIZING         (REVISE, score 50-69, iteration < 3)
GATE_1 ────────→ BLOCKED            (REJECT, score < 50)
GATE_1 ────────→ BLOCKED            (iteration >= 3)

GATE_2 ────────→ FIXING             (PASS, score >= 80)
GATE_2 ────────→ HUMANIZING         (REVISE, score 60-79, iteration < 3)
GATE_2 ────────→ BLOCKED            (REJECT, score < 60)
GATE_2 ────────→ BLOCKED            (iteration >= 3)

FIXING ────────→ PUBLISHING         (fixes appliques)
PUBLISHING ────→ MONITORING         (PR creee)
MONITORING ────→ DONE               (rapport J+30 complete)
```

## Protocole RETRY (Generator ↔ Evaluator)

Base sur le feedback-loop de nPosts.ai :

### Regles
1. Le **generator** (humanizer) produit, l'**evaluator** juge — separation stricte
2. Le generator ne voit JAMAIS le verdict brut — seulement `GENERATOR_INSTRUCTIONS`
3. L'evaluator ne modifie JAMAIS le contenu — il juge uniquement
4. Maximum **3 iterations** par gate (defaut). Au-dela, escalader a l'humain.
5. Si iteration N+1 a **plus d'issues** que iteration N → BLOCK immediat (regression)

### Flux

```
Orchestrateur
  |→ Humanizer (iteration 1)
  |     |→ Evaluator (Gate 1 ou 2)
  |           |- PASS → Continuer
  |           |- REVISE → Humanizer (iteration 2)
  |           |            |→ Evaluator
  |           |                  |- PASS → Continuer
  |           |                  |- REVISE → Humanizer (iteration 3)
  |           |                  |            |→ Evaluator
  |           |                  |                  |- PASS → Continuer
  |           |                  |                  |- REVISE/REJECT → BLOCKED
  |           |                  |- REJECT → BLOCKED
  |           |- REJECT → BLOCKED
```

### GENERATOR_INSTRUCTIONS

Quand un evaluateur rend REVISE, il genere des instructions specifiques :

```json
{
  "generator_instructions": "1. La keyword density est a 0.4%, augmenter a 1-2% en inserant 'appareil auditif classe 1' naturellement. 2. Ajouter un lien interne vers /guides/remboursement-appareil-auditif/. 3. Le paragraphe 3 contient un claim non source sur l'efficacite — ajouter reference HAS."
}
```

Le humanizer recoit ces instructions et modifie le contenu en consequence,
puis le renvoie a l'evaluateur.

## Compteurs d'iteration

L'orchestrateur maintient 2 compteurs :
- `gate_1_iterations` : 0-3
- `gate_2_iterations` : 0-3

Un REVISE a Gate 2 renvoie au humanizer ET repasse par Gate 1.
Les compteurs ne sont PAS reinitialises entre les gates.
Total max iterations avant BLOCKED : 3 par gate = 6 passages humanizer maximum.

## Feedback Loop (Level 4)

Apres MONITORING J+30, l'orchestrateur envoie les metriques de performance
au `me-leadgen-manager` :

```
top_pages (performance SEO) ↔ score_eeat ↔ leads_qualifies
```

Anomalies detectees :
- Page top SEO + score EEAT eleve + 0 leads → probleme de conversion (CTA, formulaire)
- Page top leads + score EEAT faible → recalibrer les poids de l'evaluateur
- Page top SEO + score EEAT faible → alerte qualite, risk de penalite Google
