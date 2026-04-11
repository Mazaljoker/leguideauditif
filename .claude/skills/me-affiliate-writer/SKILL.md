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
---

# LeGuideAuditif Expert Writer v2.0

Redige du contenu expert terrain pour LeGuideAuditif. Chaque article doit etre
IMPOSSIBLE a confondre avec du contenu IA et IMPOSSIBLE a retrouver ailleurs.

> Ce skill est le CERVEAU du pipeline. 80% de la differenciation se joue ici.
> Lire `references/contracts.md` pour les schemas JSON.
> Lire `references/terrain-framework.md` pour les 7 blocs obligatoires.

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

Consomme par : `nposts-seo-humanizer` > `nposts-content-evaluator` > `me-eeat-compliance` > `nposts-seo-fixer`

## CHAINE GAN

```
me-affiliate-writer > nposts-seo-humanizer > nposts-content-evaluator (PASS >=75 ET terrain >=80) > me-eeat-compliance (PASS >=80) > nposts-seo-fixer > nposts-seo-post-publish
```

HARD BLOCK : ne JAMAIS envoyer au fixer sans PASS des 2 evaluateurs.

## WORKFLOW

1. **Research** : web search 5-8 sources, identifier angles non couverts, collecter donnees + sources (HAS, INSERM, ameli.fr).
2. **Structurer** : integrer les 7 BLOCS TERRAIN OBLIGATOIRES (voir `references/terrain-framework.md`). Chaque bloc est decrit en detail dans le fichier de reference.
3. **Rediger avec VARIATION STRUCTURELLE** : les blocs sont obligatoires MAIS leur forme, position et intensite DOIVENT varier. Pas de template repete. Illusion d'ecriture naturelle.
4. **Monetisation** (comparatifs) : liens affilies + 1 lead form + 1 CTA fin + mention legale.
5. **SEO technique** : title < 60c, meta < 155c, schema JSON-LD, internal links >= 3, FAQ 3-5 questions.
6. **Auto-verification terrain_checklist** : AVANT envoi au humanizer, verifier chaque element. Si un manque, completer.

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ARTICLE REDIGE — {slug}

Type : {guide|comparatif|fiche_produit}
{N} mots | {N} H2 | {N} liens internes

TERRAIN CHECKLIST :
  Hook dissonant    : ✅/❌
  Erreurs freq.     : {N}/3 min
  Cas reel          : {N}/1 min
  Methode expert    : ✅/❌
  Limites           : {N}/2 min
  Prises de position: {N}/2 min
  Expert Judgment   : ✅/❌
  Non-interchange.  : {N}/3 min
  Variation struct. : ✅/❌

Schema : {type} | FAQPage
→ Envoyer au humanizer ? (oui/completer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## REGLES EDITORIALES

- **Ton** : Expert de cabinet — direct, chaleureux, concret.
- **Vouvoiement** : TOUJOURS
- **YMYL** : chaque claim medical source. Pas de promesse therapeutique.
- **Non-genericite** : si un paragraphe pourrait etre sur Wikipedia, le reecrire.
- **Test de realite** : "Un vrai audioprothesiste dirait ca comme ca ?" Si non, reecrire.

## NOTION

Tracker dans la base editoriale LGA : slug, type, terrain_checklist scores, date.
