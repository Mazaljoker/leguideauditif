---
name: me-detector-inverse
description: >
  Gate 1.5 du pipeline GAN LeGuideAuditif : detecteur inverse oriente Google.
  Evalue si le contenu sera percu comme expert reel utile OU comme contenu
  optimise generique. Score 3 axes : Human Signal (40), Expert Signal (30),
  Anti-Generic Signal (30). PASS >= 75, DOMINANT >= 85.
  Ne modifie JAMAIS le contenu — juge uniquement.
  Trigger: 'detector', 'detector inverse', 'anti-ia check', 'google check',
  'contenu trop lisse', 'ca fait IA', 'verifier humanite'.
  Ne PAS utiliser pour : generation (me-affiliate-writer), humanisation
  (nposts-seo-humanizer), E-E-A-T (me-eeat-compliance).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 2.5
---

# me-detector-inverse v1.0 — Gate 1.5

Detecteur inverse oriente Google E-E-A-T et Helpful Content.
Ne cherche PAS si c'est de l'IA. Cherche si ca RESSEMBLE a du contenu faible pour Google.

> L'evaluateur ne modifie JAMAIS le contenu. Il juge uniquement.
> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/scoring-rubric.md` pour les grilles detaillees.

## POSITION DANS LA CHAINE

```
me-affiliate-writer > nposts-seo-humanizer > ME-DETECTOR-INVERSE > nposts-content-evaluator > me-eeat-compliance > nposts-seo-fixer
```

S'execute APRES le humanizer, AVANT le content-evaluator.
Si FAIL (< 75) : renvoyer au humanizer avec instructions. Max 2 iterations.
Si terrain issues : renvoyer au writer.

## INPUT

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number"
  }
}
```

## OUTPUT

```json
{
  "type": "me-detector-inverse",
  "payload": {
    "slug": "string",
    "score_total": "number (0-100)",
    "status": "FAIL | PASS | DOMINANT",
    "breakdown": {
      "human_signal": "number (0-40)",
      "expert_signal": "number (0-30)",
      "anti_generic_signal": "number (0-30)"
    },
    "flags": ["string"],
    "quick_fixes": ["string"],
    "malus_applied": ["string"],
    "author_fingerprint": "number (0-10, bonus)",
    "iteration": "number (1-2)",
    "verdict": "string",
    "target": "humanizer | writer | pass"
  }
}
```

Consomme par : `nposts-content-evaluator` (si PASS)

## SCORING — 3 axes

### 1. HUMAN SIGNAL (HS /40)

Est-ce que ca sent un humain reel ?

| Critere | Points |
|---|---|
| Situations vecues concretes (patients, cas) | +8 |
| Micro-digression patient detaillee (age + contexte + citation + evolution) | +5 |
| Phrases naturelles / orales | +4 |
| Variations de rythme (burstiness : courtes + longues) | +4 |
| Phrase isolee de rupture ("C'est toujours comme ca." / "Vraiment.") | +4 |
| Dialogues ou pensees patients entre guillemets | +5 |
| Reactions humaines ("je vois souvent...", "ca me surprend encore") | +5 |
| Tension emotionnelle des le debut (choc, pas intro sage) | +5 |
| Ton robotique ou corporate detecte | -10 |

### 2. EXPERT SIGNAL (ES /30)

Est-ce que ca sent un pro, pas un redacteur ?

| Critere | Points |
|---|---|
| Methode concrete ("ce que je regarde en premier...") | +10 |
| Observations terrain non evidentes | +5 |
| Jugement pro (recommandation claire avec argument) | +5 |
| Rejet argumente ("je deconseille X parce que...") | +3 |
| Nuance clinique ("ca depend de...") | +3 |
| Limites du sujet avouees | +4 |

### 3. ANTI-GENERIC SIGNAL (AGS /30)

Est-ce que ca pourrait etre ecrit ailleurs ?

| Critere | Points |
|---|---|
| Absence de phrases generiques (voir liste INTERDIT) | +10 |
| Presence d'elements uniques (cas, insight rare, donnee terrain) | +10 |
| Angle differentiant (pas l'angle Wikipedia) | +5 |
| Pas de structure template visible | +5 |

### 4. AUTHOR FINGERPRINT (bonus /10)

Score supplementaire qui detecte si le contenu a une empreinte auteur reconnaissable.
Ne compte pas dans le score de base — c'est un BONUS qui peut faire passer de PASS a DOMINANT.

| Critere | Points |
|---|---|
| Expressions uniques recurrentes ("Ce que je vois tous les jours...", "Erreur classique.") | +3 |
| Logique de raisonnement reconnaissable (observation terrain → verdict → nuance) | +3 |
| Angles recurrents non-SEO (preoccupations de clinicien, pas de redacteur) | +2 |
| Style de jugement coherent avec les autres articles du site | +2 |

Calcul : score_total = HS + ES + AGS + malus + author_fingerprint (cap a 100)

## MALUS (obligatoires)

| Pattern detecte | Malus |
|---|---|
| "ce guide va vous..." / "objectif simple" / "n'hesitez pas" | -10 |
| Ton trop parfait / corporate / brochure | -10 |
| Contenu interchangeable (pourrait etre sur vivason.fr) | -15 |
| Repetitions marketing | -5 |
| Structure template identique a un autre article | -10 |
| CTAs generiques ("En savoir plus", "Decouvrir") | -5 |
| Introduction sage / attendue (pas de tension) | -5 |

## VERDICTS

| Score | Status | Action |
|---|---|---|
| >= 85 | **DOMINANT** | Publier — contenu expert dominant |
| 75-84 | **PASS** | Continuer vers content-evaluator |
| 60-74 | **FAIL-FIXABLE** | Renvoyer au humanizer avec quick_fixes |
| < 60 | **FAIL-REWRITE** | Renvoyer au writer — probleme de fond |

## PROTOCOLE

1. Lire le contenu complet
2. Scanner chaque section pour les 3 axes
3. Appliquer les malus
4. Calculer le score
5. Si FAIL : generer quick_fixes actionables (max 5)
6. Si FAIL apres 2 iterations : escalade humaine

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECTOR INVERSE — {slug} (iter {N}/2)

Human Signal    : {X}/40
Expert Signal   : {X}/30
Anti-Generic    : {X}/30
Malus appliques : {-X}

Score total : {X}/100
Status : {FAIL|PASS|DOMINANT}

Flags : {liste}
Quick fixes : {liste}

→ {Action suivante : humanizer / writer / content-evaluator}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## REGLE D'OR

Etre STRICT. Si doute, penaliser.
Si contenu trop propre, penaliser.
Si contenu ressemble a un article SEO, penaliser.

Objectif : detecter ce que Google ressentirait, pas ce qu'un humain lambda pense.
