---
name: me-affiliate-writer
description: "Rédige les contenus comparatifs et fiches produits monétisés pour LeGuideAuditif : tableaux specs, comparatifs appareils auditifs, guides d'achat, liens affiliés. Utiliser dès que l'utilisateur dit 'comparatif', 'fiche produit', 'guide d'achat', 'tableau comparatif', 'affiliate', 'test appareil', 'avis appareil', 'meilleur appareil auditif', 'classe 1 vs classe 2', 'lien affilié'. Produit un article comparatif prêt pour PR GitHub. NE PAS utiliser pour les articles informationnels purs (seo-content-writer) ni les pages de vente (sales-pitch)."
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 1
---

# LeGuideAuditif Affiliate Writer v1.0

Rédige des contenus comparatifs monétisés : fiches produits, tableaux specs, guides d'achat avec liens affiliés et formulaires lead gen intégrés.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

Brief JSON du `seo-brief-writer` OU demande directe ("comparatif des meilleurs appareils auditifs classe 1 2026").

## OUTPUT

```json
{
  "type": "me-affiliate-writer",
  "payload": {
    "slug": "meilleur-appareil-auditif-classe-1",
    "title": "string",
    "meta_description": "string (< 155 chars)",
    "word_count": "number",
    "products_compared": 5,
    "affiliate_links": 3,
    "lead_forms": 1,
    "content_md": "string (Astro-ready markdown)",
    "frontmatter": { "title": "", "description": "", "author": "", "date": "", "category": "" }
  }
}
```

## CHAÎNE GAN (obligatoire, dans cet ordre)

```
me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator (PASS ≥70) → me-eeat-compliance (PASS ≥80) → nposts-seo-fixer → nposts-seo-post-publish
```

⚠️ **HARD BLOCK** : ne JAMAIS envoyer au fixer sans PASS des 2 évaluateurs. YMYL santé = double gate NON-NÉGOCIABLE.

## WORKFLOW

1. **Research produits** : Web search 5-8 appareils. Collecter : marque, modèle, type, classe, prix, canaux, Bluetooth, rechargeable, garantie.
2. **Structurer** : H1 + intro E-E-A-T + `<ComparisonTable />` + fiches produits + "Comment choisir" + FAQ schema.org + CTA devis.
3. **Monétiser** : Liens affiliés (`rel="sponsored noopener"`) + 1 lead form post-tableau + 1 CTA fin + mention légale affiliés.
4. **SEO** : Title < 60c + alt images + Schema Product JSON-LD + FAQPage + internal links cluster.
5. **Checkpoint** → envoi au `nposts-seo-humanizer`.
6. **Gate 1** : `nposts-content-evaluator` → PASS ≥70 requis.
7. **Gate 2** : `me-eeat-compliance` → PASS ≥80 requis (YMYL santé).

## RÈGLES ÉDITORIALES

- **Ton** : expert mais accessible, vouvoiement systématique (audience seniors). Pas de jargon sans explication.
- **Honnêteté** : ne jamais recommander un produit uniquement pour l'affiliation. Le verdict reflète l'expertise terrain.
- **E-E-A-T** : chaque comparatif commence par une phrase d'autorité ("J'ai adapté plus de 3000 patients..."). Mentionner des cas patients anonymisés.
- **Pas de prix exact** : donner des fourchettes + orienter vers le formulaire devis.

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 COMPARATIF RÉDIGÉ — {slug}

{N} produits comparés | {N} mots | {N} liens affiliés
Schema : Product ✅ | FAQPage ✅
Lead form intégré : ✅
Mention légale affiliés : ✅

→ Envoyer au humanizer puis double gate ? (oui/modifier)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Tracker les articles affiliés dans la base éditoriale ME (colonnes : Nb produits, Liens affiliés, Score content-evaluator, Score E-E-A-T).