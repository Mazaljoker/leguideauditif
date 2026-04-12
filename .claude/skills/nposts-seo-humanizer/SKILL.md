---
name: nposts-seo-humanizer
description: >
  Layer stylistique du pipeline LeGuideAuditif. Casse les patterns IA residuels,
  ameliore le rythme et la voix Franck-Olivier. NE MODIFIE PAS le fond ni la structure.
  Utiliser immediatement apres me-affiliate-writer.
  Trigger: 'humaniser', 'humanize', 'anti-IA', 'rendre humain', 'passer au humanizer', 'desroboter'.
  Ne PAS utiliser pour : contenu terrain (me-affiliate-writer), E-E-A-T (me-eeat-compliance).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 2
---

# nposts-seo-humanizer v2.0

Layer de FINITION STYLISTIQUE. Ne cree pas de contenu terrain — c'est le job du writer.

> REGLE D'OR : Ne JAMAIS ajouter de contenu metier, d'exemples ou d'anecdotes.
> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/ai-patterns-french.md` pour la table des patterns.
> Lire `references/voice-profile-franck-olivier.md` pour le profil voix.

## INPUT

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_md": "string",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": {}
  }
}
```

## OUTPUT

```json
{
  "type": "nposts-seo-humanizer",
  "payload": {
    "slug": "string",
    "content_md": "string (humanise)",
    "frontmatter": {},
    "word_count": "number",
    "terrain_checklist": "(passe du writer, NON modifie)",
    "metrics": {
      "burstiness": "number (0-1, objectif >= 0.7)",
      "flesch_fr": "number (0-100, objectif 60-80)",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "micro_variations_added": "number",
      "ymyl_claims_preserved": "number",
      "terrain_content_modified": false
    }
  }
}
```

Consomme par : `nposts-content-evaluator`

## WORKFLOW

1. **Patterns IA francais** : P0 TOUJOURS remplacer ("Il convient de", "Force est de", "Par ailleurs", "En effet", "Il est essentiel", "Dans le cadre de", "Afin de", "Susceptible de"). P1 si > 2 occ. P2 optionnel. Voir `references/ai-patterns-french.md`.
2. **Burstiness >= 0.7** : inserer phrases courtes (3-6 mots) entre les longues. NE PAS inventer de contenu.
3. **Voix Franck-Olivier** : ajustements LEGERS (pronoms, registre cabinet, tabous). Voir `references/voice-profile-franck-olivier.md`.
4. **De-symmetrization** : casser listes trop parfaites, phrases miroir, sections symetriques, rule of three, ouvertures repetitives.
5. **Micro-variations** : parentheses, incises, questions rhetoriques, aveux d'incertitude. 1 pour 200-300 mots.
6. **Flesch FR 60-80** : couper phrases longues si < 60, enrichir si > 80.
7. **YMYL** : ne JAMAIS modifier le sens d'un claim medical. Marquer [YMYL-VERIFIED].

## CE QUE LE HUMANIZER NE FAIT PAS

- Ajouter des anecdotes ou cas reels
- Creer des sections erreurs frequentes
- Inventer des insights terrain
- Modifier la structure H2/H3
- Ajouter ou supprimer des paragraphes entiers

Si le contenu manque de terrain -> renvoyer au writer, pas compenser.

## ELEMENTS A+ A PRESERVER (JAMAIS MODIFIER)

Le writer produit des elements A+ qui sont CRITIQUES pour le scoring.
Le humanizer DOIT les preserver intacts :

- **Micro-digressions patient** : cas detaille avec age + citation + evolution. NE PAS lisser.
- **Phrases isolees de rupture** : "C'est toujours comme ca." / "Vraiment." NE PAS fusionner avec le paragraphe precedent.
- **CTAs a tension** : "Voir les erreurs a eviter" NE PAS remplacer par "En savoir plus".
- **Prises de position** : "Je deconseille" / "les plus chers ne sont pas les plus adaptes". NE PAS adoucir.
- **Repetitions intentionnelles** : si le writer repete un mot volontairement (desoptimisation), NE PAS corriger.
- **Phrases de signature** : "Je vais etre direct", "Erreur classique", "C'est la que ca se complique". CONSERVER tel quel.

## REDUNDANCY CONTROL (couche 8)

Le humanizer DOIT verifier et corriger les repetitions excessives :
- "28 ans" : max 2 par article. Si > 2, paraphraser ("pres de trois decennies", "depuis mes debuts")
- "patients" : max 1 pour 200 mots. Alterner avec "personnes", "ceux que j'accompagne"
- Meme claim factuel repete : max 2 occurrences. Paraphraser obligatoire a la 3eme
- Meme cluster de mots-cles : max 3. Varier les synonymes naturels
- NE PAS introduire de synonymes forces ou artificiels — la variation doit rester orale

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ HUMANISATION — {slug}

Burstiness : {score}/1.0 (>= 0.7)
Flesch FR  : {score} (60-80)
Patterns IA : {N} (P0:{n} P1:{n} P2:{n})
Micro-var.  : {N}
YMYL preserves : {N}
Contenu terrain modifie : NON

→ Pret pour content-evaluator ? (oui/corriger)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ERROR HANDLING

- Contenu sans blocs terrain -> NE PAS compenser -> renvoyer au writer.
- Burstiness < 0.5 apres 2 passes -> signaler, reecriture profonde au writer.
- Claims ambigus -> flagger pour le content-evaluator.

## NOTION

Logger les metriques humanisation par article dans la base editoriale LGA.
