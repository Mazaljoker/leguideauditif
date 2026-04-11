---
name: me-eeat-compliance
description: >
  Gate 2 du pipeline GAN LeGuideAuditif : verifie conformite E-E-A-T et YMYL sante.
  v2 : Experience Signal Score mesure si le contenu DEMONTRE une experience vecue.
  Detecte la fausse expertise. Score >= 80 requis (Trust pondere x1.75).
  Trigger: 'E-E-A-T', 'YMYL', 'conformite sante', 'sources medicales', 'credibilite',
  'verifier la page', 'gate 2'.
  Ne PAS utiliser pour la redaction (me-affiliate-writer) ni l'humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 4
---

# LeGuideAuditif E-E-A-T Compliance v2.0 — Gate 2

Audite le contenu pour conformite E-E-A-T et YMYL sante.
v2 : ne verifie plus seulement la STRUCTURE mais aussi le CONTENU (experience demontree).

> Lire `references/contracts.md` pour les schemas JSON.

## INPUT

```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number (>= 75)",
    "scores": { "terrain": "number (>= 80)" },
    "verdict": "PASS"
  }
}
```

Si le content-evaluator a REJECT/REVISE, NE PAS lancer ce skill.

## OUTPUT

```json
{
  "type": "me-eeat-compliance",
  "payload": {
    "slug": "string",
    "score_eeat": "number",
    "score_experience": "number",
    "score_expertise": "number",
    "score_authority": "number",
    "score_trust": "number",
    "experience_signal": {
      "vecu": "number /30",
      "coherence_exemples": "number /30",
      "depth_of_insight": "number /20",
      "fausse_expertise_flags": "number /10",
      "red_flags": ["string"]
    },
    "verdict": "PASS|REVISE|REJECT",
    "issues": [
      { "type": "string", "severity": "high|medium|low", "fix": "string", "target": "writer|humanizer|structure" }
    ],
    "fixes_applied": ["string"]
  }
}
```

Consomme par : `nposts-seo-fixer` (applique les corrections avant PR).

## WORKFLOW

### Checks structurels (1-4)

1. **Auteur** : page /auteur/franck-olivier/ existe, bio (DE, 28 ans, Amplifon, Audika, 18 centres Afflelou, Auzen, 3000+ patients), photo reelle, ADELI, encadre auteur en bas.
2. **Sources** : claims medicaux sources (HAS, INSERM, OMS, PubMed), liens primaires, < 3 ans, pas de promesses therapeutiques.
3. **Mentions YMYL** : disclaimer sante, mention affiliation, confidentialite, CGU, RGPD.
4. **Confiance** : HTTPS, pas de pub intrusive, coherence, pas de superlatifs, dates visibles.

### Check 5 : EXPERIENCE SIGNAL SCORE (contenu)

**5a. Vecu (0-30)** : anecdotes cabinet (+10/anecdote, max 20), phrases "je" experience (+5), references temporelles (+5).

**5b. Coherence exemples (0-30)** : cas plausibles (+15), coherence profil (+10), details credibles (+5). Deductions : exemple trop parfait (-10), chiffre suspect (-5), anecdote fausse (-15).

**5c. Depth of Insight (0-20)** : explication au-dela du basique (+8), liens symptomes-decisions (+6), priorisation (+6).

**5d. Detection fausse expertise (0-10)** : ton neutre constant (-5), exemples generiques (-3), expertise declaree non demontree (-5), contenu Wikipedia (-10).

### Scoring

| Pilier | Composition | Poids |
|---|---|---|
| Experience | Check 5 | x1.25 |
| Expertise | Checks 1-2 | x1.00 |
| Authority | Liens externes, citations | x0.75 |
| Trust | Checks 3-4 | x1.75 |

`score_eeat = (exp*1.25 + expertise*1.00 + auth*0.75 + trust*1.75) / 4.75 * 100`

PASS >= 80 | REVISE 60-79 | REJECT < 60

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ E-E-A-T AUDIT — {slug}

Score global : {X}/100
  Experience : {X} (x1.25) — vecu:{X}/30, coherence:{X}/30, insight:{X}/20, faux:{X}/10
  Expertise  : {X} (x1.00)
  Authority  : {X} (x0.75)
  Trust      : {X} (x1.75)

Verdict : {PASS|REVISE|REJECT}
{Si red flags : "FAUSSE EXPERTISE : {desc}"}
Issues : {N} ({N} high, {N} medium, {N} low)
Fixes auto : {N}

→ Passer au fixer ? (oui/corriger)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Logger score E-E-A-T + experience_signal par article dans la base editoriale LGA.
