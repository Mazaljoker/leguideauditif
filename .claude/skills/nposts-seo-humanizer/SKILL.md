---
name: nposts-seo-humanizer
description: >
  Transforme le contenu genere par IA en texte naturel avec la voix de Franck-Olivier
  (audioprothesiste DE, 25 ans). Anti-detection IA, variation burstiness, anecdotes terrain,
  Flesch FR 60-80, vouvoiement seniors.
  Utiliser immediatement apres me-affiliate-writer ou tout generateur de contenu.
  Trigger: 'humaniser', 'humanize', 'voix naturelle', 'anti-IA', 'rendre humain',
  'passer au humanizer', 'ton naturel', 'reformuler', 'desroboter', 'rendre authentique'.
  Ne PAS utiliser pour : contenu deja publie (utiliser nposts-seo-fixer), audit E-E-A-T
  (utiliser me-eeat-compliance), generation de contenu (utiliser me-affiliate-writer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 2
  chain: "me-affiliate-writer → [nposts-seo-humanizer] → nposts-content-evaluator → me-eeat-compliance → nposts-seo-fixer"
---

# nposts-seo-humanizer

Humanise le contenu IA pour qu'il sonne comme Franck-Olivier — expert bienveillant,
25 ans de terrain, 3000+ patients. Le contenu doit etre indistinguable d'un texte
ecrit par un audioprothesiste humain.

## INPUT

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_md": "string (markdown brut genere par IA)",
    "frontmatter": {},
    "word_count": "number"
  }
}
```

## WORKFLOW

### Etape 1 — Scanner les patterns IA francais

Consulter `references/ai-patterns-french.md` pour la table complete.

**Priorite P0 — TOUJOURS remplacer** (drapeaux rouges IA) :
- "Il convient de noter que" → "A savoir :" / "Un point important :"
- "Force est de constater" → "On voit bien que" / "Concretement,"
- "Par ailleurs" (debut phrase) → "Autre chose :" / "Et puis,"
- "En effet" (debut phrase) → supprimer, reformuler la phrase
- "Il est essentiel de" → "Pensez a" / "N'oubliez pas de"
- "Dans le cadre de" → "Pour" / "Quand on parle de"
- "Afin de" → "Pour"
- "Susceptible de" → "Qui peut" / "Capable de"

**Priorite P1 — Selon le contexte** (remplacer si > 2 occurrences) :
- "Notamment" → "entre autres", "par exemple"
- "Par consequent" → "Du coup", "Resultat"
- "Toutefois" → "Mais attention", "Sauf que"

**Priorite P2 — Optionnel** (ameliore le naturel) :
- 3+ phrases consecutives de meme longueur → varier
- Enumeration systematique a 3 elements → varier (2, 4, 5)
- "Cet article explore/examine" → supprimer les meta-references

### Etape 2 — Varier la burstiness

L'IA produit des phrases de longueur uniforme (burstiness ~0.3-0.4).
Un humain varie beaucoup plus (objectif : burstiness >= 0.7).

Technique :
- Inserer des phrases tres courtes (3-6 mots) entre les longues :
  "C'est frequent.", "Rien de grave.", "On me le demande souvent.", "Bonne nouvelle.", "A retenir."
- Pattern recommande : longue (20-30) | courte (4-8) | moyenne (12-18) | tres courte (3-5) | longue (25-35)
- Utiliser `scripts/burstiness-checker.py` pour mesurer

### Etape 3 — Injecter la voix Franck-Olivier

Consulter `references/voice-profile-franck-olivier.md` pour le profil complet.

Caracteristiques cles :
- **Registre** : Expert bienveillant, jamais condescendant. Comme dans son cabinet.
- **Pronoms** : "Je" anecdotes, "Vous" conseils (jamais "tu"), "On" verites generales.
- **Phrases signature** : "Dans mon cabinet, je vois ca tous les jours", "Apres 25 ans de pratique...",
  "Mes patients me demandent souvent...", "Ce que je recommande toujours,"
- **Ton** : Direct mais chaleureux. Pas de jargon sans explication entre parentheses.
- **Tabous** : Jamais "il faut absolument", jamais de catastrophisme, jamais de promesse de guerison.

### Etape 4 — Injecter des anecdotes

Consulter `references/anecdote-library.md` pour les canevas.

- Frequence : 1 anecdote pour 800-1000 mots
- Placement : apres une affirmation technique pour l'illustrer
- Toujours anonymisees ("un patient", "une patiente de 72 ans")
- Themes : premier appareillage, resistance, comparaison modeles, question du prix

### Etape 5 — Verifier la lisibilite

Utiliser `scripts/readability-score.py` sur le contenu humanise.

Formule Flesch FR (Kandel-Moles) :
```
Flesch_FR = 207 - (1.015 x ASL) - (73.6 x ASW)
ASL = nombre moyen de mots par phrase
ASW = nombre moyen de syllabes par mot
```

- Objectif : 60-80 (comprehensible public 65+ ans, niveau bac)
- Si < 60 : phrases trop longues ou vocabulaire trop complexe → simplifier
- Si > 80 : trop simpliste, risque infantilisant → ajouter quelques termes experts avec explication

### Etape 6 — Verifier le YMYL

REGLE ABSOLUE : ne JAMAIS modifier le sens d'une affirmation medicale.

- Si une phrase contient un claim source (HAS, INSERM, OMS, PubMed), ne modifier que la forme
- Marquer internement ces phrases [YMYL-VERIFIED] pour le content-evaluator
- Compter les claims preserves dans les metriques

### Etape 7 — Checkpoint

Afficher le rapport :
```
HUMANISATION — {slug}

Burstiness : {score}/1.0 (objectif >= 0.7)
Flesch FR  : {score} (objectif 60-80)
Patterns IA remplaces : {N} (P0: {n}, P1: {n}, P2: {n})
Anecdotes injectees : {N}
Claims YMYL preserves : {N}
Mots : {word_count}

→ Pret pour content-evaluator
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
    "metrics": {
      "burstiness": "number (0-1, objectif >= 0.7)",
      "flesch_fr": "number (0-100, objectif 60-80)",
      "ai_patterns_replaced": "number",
      "ai_patterns_detail": { "P0": "number", "P1": "number", "P2": "number" },
      "anecdotes_injected": "number",
      "ymyl_claims_preserved": "number"
    }
  }
}
```

Contrat complet : `references/contracts.md`

## EXAMPLES

### Exemple 1 : Phrase technique transformee

**Avant (IA)** :
"Il convient de noter que les appareils auditifs de classe 1 sont integralement pris en charge par la Securite sociale dans le cadre du dispositif 100% Sante, ce qui permet de beneficier d'un equipement sans reste a charge."

**Apres (humanise)** :
"Bonne nouvelle pour votre portefeuille : les appareils de classe 1 sont rembourses a 100% grace au dispositif 100% Sante. Concretement, vous repartez equipe sans debourser un centime. Mes patients sont souvent surpris — ils s'attendaient a payer bien plus."

### Exemple 2 : Paragraphe avec anecdote

**Avant (IA)** :
"La perte auditive legere se caracterise par une difficulte a percevoir les sons faibles, notamment les chuchotements et les bruits de fond. Il est essentiel de consulter un professionnel des que les premiers symptomes apparaissent."

**Apres (humanise)** :
"Une perte auditive legere, ca veut dire quoi au quotidien ? Vous commencez a rater les chuchotements, le bruit du clignotant dans la voiture, ou la voix de vos petits-enfants quand ils parlent doucement. Un de mes patients de 68 ans me disait : 'Je pensais que les gens marmonnaient de plus en plus.' En realite, c'etait son audition qui baissait. Si vous vous reconnaissez, n'attendez pas — un bilan auditif chez votre ORL, c'est rapide et ca peut tout changer."

## ERROR HANDLING

### Contenu trop court (< 300 mots)
Le humanizer a besoin d'assez de matiere pour varier la burstiness et injecter des anecdotes.
Si le contenu source fait < 300 mots, signaler et demander au generateur d'etoffer.

### Claims medicaux ambigus
Si une affirmation ressemble a un claim medical mais n'est pas sourcee,
NE PAS la modifier — la flagger pour le content-evaluator qui decitera.

### Burstiness impossible a atteindre
Si apres 2 passes le score reste < 0.5, le contenu source est probablement
trop technique. Signaler et suggerer une reecriture plus profonde au generateur.

## TROUBLESHOOTING

### Le ton sonne encore IA apres humanisation
- Verifier que les patterns P0 sont tous remplaces (compteur doit etre 0)
- Augmenter le nombre de phrases courtes intercalees
- Ajouter une anecdote supplementaire
- Relire les phrases signature dans le voice profile

### Flesch trop bas (< 60)
- Couper les phrases de > 25 mots en deux
- Remplacer les mots de 4+ syllabes par des equivalents simples
- Ajouter des sous-titres pour aerer

### Perte de sens medical
- Verifier les phrases [YMYL-VERIFIED] — elles ne doivent pas avoir change de sens
- En cas de doute, garder la formulation originale et ne modifier que l'entourage
