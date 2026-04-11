---
name: nposts-content-evaluator
description: >
  Gate 1 du pipeline GAN LeGuideAuditif : evalue la qualite du contenu humanise
  sur 6 axes incluant DIFFERENCIATION TERRAIN et NON-GENERICITE.
  Score 0-100, verdict PASS (>=75 ET terrain >=80) / REVISE (55-74) / REJECT (<55).
  L'evaluateur ne modifie JAMAIS le contenu — il juge uniquement.
  Trigger: 'evaluer contenu', 'content check', 'gate 1', 'quality check',
  'verifier article', 'score contenu', 'pre-eeat', 'noter le contenu'.
  Ne PAS utiliser pour : publication (nposts-seo-fixer), E-E-A-T (me-eeat-compliance),
  generation (me-affiliate-writer), humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 3
---

# nposts-content-evaluator v2.0 — Gate 1

Evalue la qualite du contenu humanise. Ne modifie JAMAIS le contenu.

> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/scoring-rubric.md` pour les grilles detaillees.

## INPUT

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": {},
    "metrics": { "burstiness": "number", "flesch_fr": "number", "ai_patterns_replaced": "number" }
  }
}
```

## OUTPUT

```json
{
  "type": "nposts-content-evaluator",
  "payload": {
    "slug": "string",
    "score_total": "number (0-100)",
    "scores": {
      "completude": "number",
      "seo": "number",
      "lisibilite": "number",
      "ia_detection": "number",
      "accuracy": "number",
      "terrain": "number"
    },
    "verdict": "PASS|REVISE|REJECT",
    "iteration": "number (1-3)",
    "non_interchangeable_elements": ["string"],
    "issues": [
      { "axe": "string", "description": "string", "severity": "high|medium|low", "target": "writer|humanizer" }
    ],
    "generator_instructions": "string|null"
  }
}
```

Consomme par : `me-eeat-compliance` (si PASS)

## SCORING — 6 axes

1. **Completude** (x0.15) : H2 du brief, word count, FAQ, produits.
2. **SEO technique** (x0.20) : keyword density, title, meta, liens internes, schema.org.
3. **Lisibilite** (x0.15) : Flesch FR 60-80, paragraphes courts, jargon explique.
4. **Detection IA** (x0.15) : burstiness, patterns P0=0, meta-references, variation attaques. Flags : phrases symetriques, rule of three, ton neutre.
5. **Accuracy sante** (x0.15) : claims sources, pas de promesse therapeutique, sources < 3 ans.
6. **Terrain** (x0.20) : hook dissonant (15), erreurs >= 3 (15), cas reel (15), methode expert (15), limites >= 2 (10), prises position >= 2 (10), non-interchangeabilite >= 3 (15), expert judgment (10), variation structurelle (5).

Formule : `score = sum(axe * poids)`

## VERDICTS — Double seuil

| Condition | Verdict |
|---|---|
| Global >= 75 ET terrain >= 80 | **PASS** |
| Global >= 75 MAIS terrain < 80 | **REVISE** |
| Global 55-74 | **REVISE** |
| Global < 55 | **REJECT** |

**Kill switch memorabilite** : "Le lecteur retiendrait-il UNE phrase ?" Si NON -> downgrade REVISE.

**Rejet auto** : promesse therapeutique, terrain < 40, 0 elements non-interchangeables.

## PROTOCOLE RETRY

Max 3 iterations. Feedback distingue writer vs humanizer. Si terrain < 40 apres iter 2 -> renvoyer au WRITER.

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CONTENT EVALUATION — {slug} (iter {N}/3)

Completude  : {X}/100 (x0.15)
SEO         : {X}/100 (x0.20)
Lisibilite  : {X}/100 (x0.15)
Detection IA: {X}/100 (x0.15)
Accuracy    : {X}/100 (x0.15)
Terrain     : {X}/100 (x0.20)

Score total : {X}/100
Verdict : {PASS|REVISE|REJECT}

Non-interchangeable : {N}/3
{Si REVISE : instructions + cible writer|humanizer}
{Si PASS : pret pour me-eeat-compliance}

→ {Action suivante}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Logger scores par article dans la base editoriale LGA.
