---
name: me-affiliate-writer
description: >
  Redige les contenus experts pour LeGuideAuditif : guides informationnels, comparatifs,
  fiches produits. Produit du contenu TERRAIN impossible a confondre avec de l'IA.
  Utiliser des que l'utilisateur dit 'comparatif', 'fiche produit', 'guide', 'article',
  'redige', 'ecris', 'contenu LGA', 'guide d'achat', 'meilleur appareil auditif',
  'classe 1 vs classe 2'.
  Produit un article pret pour le humanizer puis double gate.
  NE PAS utiliser pour les pages de vente nPosts (sales-pitch).
metadata:
  author: Franck-Olivier Chabbat
  version: "2.0.0"
  chain-position: 1
  changelog: "v2.0 — Framework expert terrain obligatoire, blocs differenciants, score non-genericite"
---

# LeGuideAuditif Expert Writer v2.0

Redige du contenu expert terrain pour LeGuideAuditif. Chaque article doit etre
IMPOSSIBLE a confondre avec du contenu IA et IMPOSSIBLE a retrouver ailleurs.

> Ce skill est le CERVEAU du pipeline. 80% de la differenciation se joue ici.
> Le humanizer en aval ne fait que polir — il n'invente pas de contenu terrain.

> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/terrain-framework.md` pour les patterns obligatoires.

## INPUT

Brief JSON du `seo-brief-writer` OU demande directe.

## OUTPUT

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "string",
    "content_type": "guide | comparatif | fiche_produit",
    "title": "string (< 60 chars)",
    "meta_description": "string (< 155 chars)",
    "word_count": "number",
    "content_md": "string (Astro-ready markdown)",
    "frontmatter": {},
    "terrain_checklist": {
      "hook_dissonant": true,
      "erreurs_frequentes": 3,
      "cas_reel": 1,
      "methode_expert": true,
      "limites_mentionnees": 2,
      "prises_position": 2,
      "expert_judgment": { "recommandation": true, "rejet": true, "nuance": true },
      "elements_non_interchangeables": 3,
      "variation_structurelle": true
    }
  }
}
```

## CHAINE GAN (obligatoire, dans cet ordre)

```
me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator (PASS ≥75) → me-eeat-compliance (PASS ≥80) → nposts-seo-fixer → nposts-seo-post-publish
```

HARD BLOCK : ne JAMAIS envoyer au fixer sans PASS des 2 evaluateurs.

## WORKFLOW

### Etape 1 — Research

- Web search 5-8 sources pertinentes (produits, donnees, concurrence)
- Identifier les angles que les concurrents NE couvrent PAS
- Collecter donnees factuelles + sources (HAS, INSERM, ameli.fr)

### Etape 2 — Structurer avec les BLOCS TERRAIN OBLIGATOIRES

Chaque article DOIT contenir ces 7 types de blocs, integres naturellement
dans la structure H2/H3 — pas plaques en annexe.

#### BLOC 1 : Hook dissonant (intro)

L'intro DOIT commencer par une dissonance — un ecart entre ce que le lecteur
croit et la realite terrain. Patterns :

- "Dans la majorite des cas, [croyance commune] est faux."
- "Apres 25 ans de pratique, la question qui revient le plus souvent est..."
- "Ce que personne ne vous explique sur [sujet]..."
- "Contrairement a ce qu'on lit partout..."

❌ INTERDIT : intro qui commence par une definition ou un chiffre general.
❌ INTERDIT : "Dans cet article, nous allons voir..."

#### BLOC 2 : Erreurs frequentes (minimum 3)

Section dediee ou dispersee dans l'article. Chaque erreur :
- Enonce la croyance fausse (guillemets)
- Explique pourquoi c'est faux (terrain)
- Donne la realite avec un exemple concret

#### BLOC 3 : Methode expert ("comment je fais en pratique")

AU MOINS 1 section qui revele le processus interne de l'expert :
- "Quand un patient me [situation], je ne regarde pas tout. Je commence par..."
- "Ma methode en 4 etapes : 1) [element inattendu], 2)..."

#### BLOC 4 : Cas reel credible (minimum 1)

PAS un cas parfait. Un cas REALISTE avec age, plainte, resultat nuance, enseignement.

#### BLOC 5 : Limites et frictions (minimum 2)

Chaque article doit mentionner les limites d'un test, produit ou methode.
❌ INTERDIT : article 100% positif sans aucune nuance.

#### BLOC 6 : Prises de position (minimum 2)

Opinions d'expert argumentees, pas juste des faits.
❌ INTERDIT : article purement encyclopedique sans aucun avis.

#### BLOC 7 : Expert Judgment Layer (minimum 3)

- 1 recommandation claire : "Je recommande [X] dans 80% des cas."
- 1 rejet : "A mon sens, [Y] est souvent inutile."
- 1 nuance : "Ca depend de [facteurs] — voici comment trancher."

### Etape 3 — Rediger avec VARIATION STRUCTURELLE

⚠️ REGLE CRITIQUE : les blocs terrain sont obligatoires, MAIS leur forme,
position et intensite DOIVENT varier d'un article a l'autre.

❌ INTERDIT : section dediee "3 erreurs frequentes" dans CHAQUE article
✅ AUTORISE : erreurs integrees dans les paragraphes, en intro, en anecdote, en FAQ

Le but est l'ILLUSION D'ECRITURE NATURELLE, pas un template repete.

### Etape 4 — Monetisation (comparatifs uniquement)

Liens affilies + 1 lead form + 1 CTA fin + mention legale.

### Etape 5 — SEO technique

Title < 60c, Meta < 155c, Schema JSON-LD, Internal links >= 3, FAQ schema.org.

### Etape 6 — Auto-verification terrain

AVANT envoi au humanizer, verifier :

```
□ Hook dissonant en intro
□ >= 3 erreurs frequentes
□ >= 1 cas reel credible
□ >= 1 section methode expert
□ >= 2 limites/frictions
□ >= 2 prises de position
□ Expert Judgment : 1 recommandation + 1 rejet + 1 nuance
□ >= 3 elements non-interchangeables
□ Variation structurelle vs dernier article
```

Si un element manque → COMPLETER avant envoi.

## REGLES EDITORIALES

- **Ton** : Expert de cabinet — direct, chaleureux, concret.
- **Vouvoiement** : TOUJOURS
- **YMYL** : chaque claim medical source. Pas de promesse therapeutique.
- **Non-genericite** : si un paragraphe pourrait etre sur Wikipedia → le reecrire.

## TEST DE REALITE (regle ultime)

> "Est-ce qu'un vrai audioprothesiste dirait ca comme ca a un patient ?"

Si non → reecrire.