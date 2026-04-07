---
name: me-image-generator
description: "Génère les images blog LeGuideAuditif via Gemini Imagen 4 API. Utiliser AUTOMATIQUEMENT après me-eeat-compliance, ou quand l'utilisateur dit 'image pour l'article', 'crée le visuel', 'génère les images', 'image blog', 'OG image', 'hero image'. Input = article validé E-E-A-T ou titre + catégorie. Output = images WebP générées via API. NE PAS utiliser pour des visuels sociaux (nposts-social-creator)."
---

# LeGuideAuditif Image Generator v1.0

Génère hero image (16:9) + OG image (1200×630) via Gemini Imagen 4 API pour chaque article LeGuideAuditif.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

JSON `"type": "me-eeat-compliance"` avec verdict PASS ≥80.
OU titre + catégorie (string) si utilisé standalone.

## OUTPUT

```json
{
  "type": "me-image-generator",
  "payload": {
    "slug": "str",
    "hero": {
      "prompt": "str (photo-réaliste Gemini)",
      "path": "/images/blog/{slug}/{slug}.webp",
      "dimensions": "16:9 (1920×1080)"
    },
    "og": {
      "prompt": "str (fond marine, titre FR, logo LeGuideAuditif.fr)",
      "path": "/images/blog/{slug}/{slug}-og.webp",
      "dimensions": "1200×630"
    },
    "generated": true,
    "model": "imagen-4.0-generate-001",
    "cost_estimated": "$0.04"
  }
}
```

Consommé par : `nposts-seo-fixer` (ajoute les images au repo via PR).

## CHAÎNE GAN

```
me-affiliate-writer/seo-content-writer → humanizer → content-evaluator → me-eeat-compliance → ME-IMAGE-GENERATOR → seo-fixer
```

## WORKFLOW

1. **Extraire le concept** : Lire titre, catégorie, description. Choisir la scène dans la bibliothèque ci-dessous.
2. **Prompt HERO (16:9)** : Photo-réaliste, humains seniors, environnement santé auditive, palette Chaleureux Senior. JAMAIS de texte.
3. **Prompt OG (1200×630)** : Fond marine (#1B2E4A), titre FR blanc bold, soulignement orange (#D97B3D), "LeGuideAuditif.fr" en orange bas droite.
4. **Générer via API** : `python scripts/generate-images.py --slug {slug}` → Imagen 4 Fast ($0.02/image).
5. **Vérifier qualité** : hero < 200KB, OG < 150KB, format WebP, pas de texte illisible.

## BIBLIOTHÈQUE DE SCÈNES

| Catégorie | Scène hero | Élément OG |
|---|---|---|
| perte-auditive | Audioprothésiste avec patient senior, clinique lumineuse | Examen auditif, otoscope |
| appareils-auditifs | Aides auditives modernes + main senior + boîtier charge | Aides auditives sur surface propre |
| acouphènes | Thérapie sonore, casque, salle calme | Patient avec casque, atmosphère zen |
| prevention | Couple senior actif, extérieur, aides discrètes | Protection auditive, vie active |
| remboursement | Bureau, documents Sécu/mutuelle, audioprothésiste explique | Carte Vitale + aide auditive + devis |
| vie-quotidienne | Repas famille, grand-père avec aides, joie | Conversation familiale, chaleur |
| comparatif | 5 aides alignées sur fond marine, main expert pointe | Aides côte à côte avec fiches |

## PALETTE VISUELLE — NON-NÉGOCIABLE

```
┌───────────────────────────────────────────────┐
│  COULEURS LeGuideAuditif — Chaleureux Senior  │
├───────────────────────────────────────────────┤
│  MARINE  #1B2E4A  Fonds OG, éléments sérieux │
│  CRÈME   #F8F5F0  Ambiance chaleureuse        │
│  ORANGE  #D97B3D  Accents, CTA, soulignements │
│  BLANC   #FFFFFF  Texte titres OG              │
│                                                │
│  ⛔ INTERDIT : gold #F6BB09 (palette nPosts)   │
│  ⛔ INTERDIT : noir pur #000000                │
│  ⛔ INTERDIT : couleurs froides/cliniques      │
└───────────────────────────────────────────────┘
```

## RÈGLES VISUELLES

- Style : PHOTO-RÉALISTE uniquement — jamais illustration/flat/3D
- Personnes : OBLIGATOIRE — seniors 60-80 ans, professionnels santé 35-50 ans
- Environnement : clinique auditive, pharmacie, domicile familial, extérieur
- Ambiance : chaleureuse, empathique, rassurante — PAS clinique froid
- JAMAIS de texte dans le hero (titre = HTML)
- JAMAIS de fond blanc pur ou noir pur
- JAMAIS de stock photos génériques ("personne qui sourit devant laptop")

## EXÉCUTION

```bash
# Générer pour un article spécifique
python scripts/generate-images.py --slug perte-auditive-symptomes

# Dry run (voir les prompts sans appeler l'API)
python scripts/generate-images.py --dry-run

# Tous les articles sans images
python scripts/generate-images.py

# Avec rapport JSON
python scripts/generate-images.py --report reports/images-$(date +%Y%m%d).json
```

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ IMAGES GÉNÉRÉES — {slug}

Hero : {path} ({size}KB) ✅
OG   : {path} ({size}KB) ✅
Modèle : {model}
Coût : ~{cost}

→ Ajouter au repo via fixer ? (oui/régénérer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Logger dans la base éditoriale ME : colonnes Image Hero (checkbox), Image OG (checkbox), Coût images (number).
