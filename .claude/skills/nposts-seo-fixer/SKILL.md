---
name: nposts-seo-fixer
description: >
  Etape terminale du pipeline GAN LeGuideAuditif : applique les corrections identifiees
  par les deux evaluateurs (content-evaluator + eeat-compliance), injecte les schemas
  JSON-LD (Article, FAQPage, Product), valide le frontmatter, ecrit le fichier MDX final
  et cree la branche + PR. Utiliser uniquement apres double PASS des deux gates.
  Trigger: 'fixer', 'corriger seo', 'preparer publication', 'PR article', 'finaliser',
  'appliquer corrections', 'schema.org', 'json-ld', 'publier le contenu'.
  Ne PAS utiliser pour : evaluation (content-evaluator/eeat-compliance),
  generation (me-affiliate-writer), humanisation (nposts-seo-humanizer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 5
  chain: "me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator → me-eeat-compliance → [nposts-seo-fixer] → nposts-seo-post-publish"
---

# nposts-seo-fixer — Terminal

Applique toutes les corrections, injecte les schemas, prepare le fichier final
et cree la PR. Derniere etape avant publication.

## INPUT

```json
{
  "content_md": "string (contenu valide par les 2 gates)",
  "frontmatter": {},
  "evaluator_issues": [],
  "eeat_issues": [],
  "eeat_fixes_applied": [],
  "content_type": "guide|comparatif",
  "slug": "string"
}
```

## WORKFLOW

### Etape 1 — Consommer les issues

Fusionner les issues des 2 evaluateurs. Trier par severity :
1. **HIGH** : appliquer en premier (bloquantes)
2. **MEDIUM** : appliquer ensuite
3. **LOW** : appliquer si possible, sinon documenter

### Etape 2 — Appliquer les corrections

**Corrections E-E-A-T automatiques :**

| Issue type | Fix |
|---|---|
| missing_author_bio | Inserer `<AuthorBox />` apres le premier paragraphe |
| missing_health_disclaimer | Inserer `<HealthDisclaimer />` en fin d'article |
| missing_affiliate_disclosure | Inserer `<AffiliateDisclosure />` en debut d'article (si comparatif) |
| missing_date | Ajouter `pubDate` et `updatedDate` au frontmatter |
| missing_schema | Traite a l'etape 3 (JSON-LD) |
| unsourced_medical_claim | Flagger — ne PAS inventer de source, signaler au user |

**Corrections SEO :**

| Issue | Fix |
|---|---|
| title > 60 chars | Tronquer intelligemment en gardant le keyword |
| meta > 155 chars | Reformuler en gardant l'essentiel |
| keyword density < 1% | Ajouter le keyword dans les introductions de sections |
| liens internes < 2 | Ajouter des liens vers les pages les plus proches en theme |

### Etape 3 — Injecter les schemas JSON-LD

Consulter `references/schema-org-templates.md` pour les templates complets.

**Schemas obligatoires :**
- `Article` : pour tout contenu (title, author, datePublished, publisher)
- `FAQPage` : si des blocs FAQ sont presents (generes depuis les `<details>`)
- `Person` : auteur Franck-Olivier avec credentials

**Schemas conditionnels :**
- `Product` : pour les comparatifs (chaque produit compare)
- `MedicalWebPage` : pour les guides sante (conformite YMYL)

### Etape 4 — Valider le frontmatter

Verifier la conformite avec `src/content.config.ts` :

**Guides :**
- title : string, max 60 chars
- description : string, max 155 chars
- pubDate : date
- updatedDate : date (optionnel)
- author : string (defaut: "Franck-Olivier, Audioprothesiste DE")
- category : enum (perte-auditive, appareils-auditifs, acouphenes, prevention, remboursement, vie-quotidienne)
- schemaType : Article | FAQPage | HowTo
- draft : boolean (defaut: false)

**Comparatifs :** tous les champs guides + :
- productsCompared : number, min 2
- affiliateDisclosure : boolean (defaut: true)
- products : array d'objets (brand, model, type, class, priceRange, channels, bluetooth, rechargeable, warrantyYears, verdict, bestFor, affiliateUrl)

### Etape 5 — Ecrire le fichier

Ecrire le fichier MDX dans :
- `src/content/guides/{slug}.mdx` (si guide)
- `src/content/comparatifs/{slug}.mdx` (si comparatif)

Format du fichier :
```mdx
---
title: "..."
description: "..."
pubDate: 2026-04-07
author: "Franck-Olivier, Audioprothesiste DE"
category: "appareils-auditifs"
schemaType: "Article"
---

import AuthorBox from '../../components/AuthorBox.astro';
import HealthDisclaimer from '../../components/HealthDisclaimer.astro';
import AffiliateDisclosure from '../../components/AffiliateDisclosure.astro';

<AffiliateDisclosure />

[contenu humanise et corrige]

<AuthorBox />
<HealthDisclaimer />
```

### Etape 6 — Creer branche et PR

1. Creer la branche `content/{slug}`
2. Commit avec message : `content: add {type} {slug}`
3. Creer la PR avec le template :

```markdown
## Nouveau contenu : {title}

### Scores pipeline
- Content evaluator : {score}/100 ({iterations} iterations)
- E-E-A-T compliance : {score}/100 ({iterations} iterations)
- Humanizer : burstiness {score}, Flesch FR {score}

### Corrections appliquees
{liste des fixes}

### Schemas JSON-LD
{liste des schemas injectes}

### Checklist
- [ ] Relecture humaine
- [ ] Verification des liens affilies
- [ ] Test mobile (responsive)
- [ ] Verification images alt text
```

## OUTPUT

```json
{
  "type": "nposts-seo-fixer",
  "payload": {
    "slug": "string",
    "file_path": "string (chemin du fichier MDX)",
    "fixes_applied": ["string"],
    "schemas_injected": ["Article", "FAQPage", "Product"],
    "frontmatter_valid": true,
    "branch": "content/{slug}",
    "pr_url": "string"
  }
}
```

## EXAMPLES

### Exemple : Comparatif avec corrections

```
SEO FIXER — comparatif-phonak-oticon-2026

Fixes appliques (5) :
  [HIGH] Author box insere apres paragraphe 1
  [HIGH] Health disclaimer insere en fin
  [HIGH] Affiliate disclosure insere en debut
  [MEDIUM] Title tronque : 63 → 58 chars
  [LOW] Lien interne ajoute vers /guides/remboursement/

Schemas JSON-LD (3) :
  Article (auteur, date, publisher)
  FAQPage (4 questions)
  Product x4 (Phonak Audeo L, Oticon Real, Signia Pure, Starkey Genesis)

Frontmatter : VALIDE
Fichier : src/content/comparatifs/comparatif-phonak-oticon-2026.mdx
Branche : content/comparatif-phonak-oticon-2026
PR : #42
```

## ERROR HANDLING

### Claim non source non corrigeable
Le fixer ne doit JAMAIS inventer une source medicale.
Si un claim non source est remonte par l'evaluateur, le flagger dans la PR
avec le label "needs-source" pour review humaine.

### Frontmatter invalide
Si le frontmatter ne passe pas la validation Zod, lister les champs en erreur
et tenter de les corriger automatiquement (ex: tronquer title, ajuster category).

### Composants non trouves
Si AuthorBox.astro ou HealthDisclaimer.astro n'existent pas dans src/components/,
signaler l'erreur — ne PAS creer le fichier sans les composants obligatoires.

## TROUBLESHOOTING

### PR qui ne passe pas la CI
Verifier : imports MDX corrects, frontmatter valide, pas de caracteres speciaux dans le slug.

### Schemas JSON-LD invalides
Utiliser un validateur JSON-LD (schema.org/validator). Les erreurs courantes :
datePublished au mauvais format, author sans @type, missing @context.
