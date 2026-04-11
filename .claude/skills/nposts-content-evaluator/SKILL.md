---
name: nposts-content-evaluator
description: >
  Gate 1 du pipeline GAN LeGuideAuditif : evalue la qualite du contenu humanise
  sur 6 axes incluant DIFFERENCIATION TERRAIN et NON-GENERICITE.
  Score 0-100, verdict PASS (>=75) / REVISE (55-74) / REJECT (<55).
  L'evaluateur ne modifie JAMAIS le contenu — il juge uniquement.
  Trigger: 'evaluer contenu', 'content check', 'gate 1', 'quality check',
  'verifier article', 'score contenu', 'pre-eeat', 'noter le contenu'.
  Ne PAS utiliser pour : publication (nposts-seo-fixer), audit E-E-A-T (me-eeat-compliance),
  generation (me-affiliate-writer), humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 3
  changelog: "v2.0 — Ajout axe Terrain (0.20), seuil 75, double seuil terrain 80, kill switch memorabilite"
---

# nposts-content-evaluator v2.0 — Gate 1

Evalue la qualite du contenu humanise. Ne modifie JAMAIS le contenu.

## SCORING — 6 axes

### Axe 1 : Completude (×0.15)
H2 du brief, word count, FAQ, produits compares.

### Axe 2 : SEO technique (×0.20)
Keyword density, title, meta, liens internes, schema.org.

### Axe 3 : Lisibilite (×0.15)
Flesch FR, paragraphes, jargon explique, sous-titres.

### Axe 4 : Detection IA (×0.15)
Burstiness, patterns P0, meta-references, variation attaques.
Flags supplementaires : phrases symetriques, rule of three, ton neutre constant.

### Axe 5 : Accuracy sante (×0.15)
Claims sources, pas de promesse therapeutique, sources < 3 ans.

### ⚡ Axe 6 : DIFFERENCIATION TERRAIN (×0.20)
Hook dissonant (15), erreurs frequentes >= 3 (15), cas reel (15),
methode expert (15), limites >= 2 (10), prises position >= 2 (10),
non-interchangeabilite >= 3 (15), expert judgment (10), variation structurelle (5).

Test non-interchangeabilite : "publiable tel quel sur vivason.fr ?"

## FORMULE
score = completude×0.15 + seo×0.20 + lisibilite×0.15 + ia×0.15 + accuracy×0.15 + terrain×0.20

## VERDICTS — Double seuil

| Condition | Verdict |
|---|---|
| Global >= 75 ET terrain >= 80 | PASS |
| Global >= 75 MAIS terrain < 80 | REVISE |
| Global 55-74 | REVISE |
| Global < 55 | REJECT |

### Kill switch memorabilite
"Le lecteur retiendrait-il UNE phrase ?" Si NON → downgrade a REVISE.

## REJET AUTOMATIQUE
- Promesse therapeutique
- Terrain < 40
- 0 elements non-interchangeables
- **Accents francais manquants** : si le contenu contient des mots francais sans
  leurs accents UTF-8 (ex: "frequence" au lieu de "fréquence", "ca" au lieu de "ça"),
  c'est un REJECT automatique. Les URLs et slugs sont exclus de cette verification.

## PROTOCOLE RETRY
Max 3 iterations. Si terrain < 40 apres iter 2 → renvoyer au WRITER (pas humanizer).
Feedback distingue writer vs humanizer selon l'issue.