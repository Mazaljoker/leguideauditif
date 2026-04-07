# LeGuideAuditif Video Generator v1.0

Génère hero video (16:9, 8s) + short social (9:16, 8s) via Veo 3.1 API pour chaque article LeGuideAuditif.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

JSON `"type": "me-image-generator"` (après génération images) OU titre + catégorie standalone.

## OUTPUT

```json
{
  "type": "me-video-generator",
  "payload": {
    "slug": "str",
    "hero_video": {
      "prompt": "str",
      "path": "/videos/blog/{slug}/{slug}.mp4",
      "duration": 8,
      "aspect_ratio": "16:9"
    },
    "short_video": {
      "prompt": "str",
      "path": "/videos/blog/{slug}/{slug}-short.mp4",
      "duration": 8,
      "aspect_ratio": "9:16"
    },
    "model": "veo-3.1-lite-generate-preview",
    "cost_estimated": "$0.80"
  }
}
```

Consommé par : `nposts-seo-fixer` (ajoute les vidéos au repo) puis intégration article.

## CHAÎNE

```
me-image-generator → ME-VIDEO-GENERATOR → seo-fixer
```

Optionnel : la vidéo n'est pas bloquante pour la publication. Les images sont obligatoires, les vidéos sont un bonus.

## WORKFLOW

1. **Extraire le concept** : Lire titre, catégorie. Choisir la scène vidéo dans la bibliothèque.
2. **Prompt HERO (16:9, 8s)** : Mouvement caméra lent, humains seniors, ambiance santé auditive, audio ambiant naturel.
3. **Prompt SHORT (9:16, 8s)** : Format vertical, montage rapide, accrocheur, adapté TikTok/Instagram Reels.
4. **Estimer le coût** : Veo 3.1 Lite = $0.05/s × 8s × 2 vidéos = **$0.80/article**. Alerte si > $5 total.
5. **Générer via API** : `python scripts/generate-videos.py --slug {slug}` → polling async.
6. **Vérifier** : Vidéo lisible, pas d'artefacts, audio cohérent.

## BIBLIOTHÈQUE DE SCÈNES VIDÉO

| Catégorie | Hero (16:9) | Short (9:16) |
|---|---|---|
| perte-auditive | Audioprothésiste place aide auditive, patient sourit | Close-up : avant/après aide auditive |
| appareils-auditifs | Orbit produit, main prend aide, boîtier charge | Montage : charge → oreille → Bluetooth |
| acouphènes | Thérapie sonore, casque, visage se détend | Split: bruit ville vs calme casque |
| prevention | Couple senior actif, parc, golden hour | Montage gestes protection auditive |
| remboursement | Bureau, document remboursement, couple rassuré | Animation prix → Sécu → mutuelle |
| vie-quotidienne | Dîner famille, grand-père entend et rit | Journée type avec aides auditives |
| comparatif | 5 aides alignées, main pointe chaque modèle | Cuts rapides entre modèles portés |

## MODÈLES ET COÛTS

| Modèle | $/seconde | 8s = | Usage |
|---|---|---|---|
| **veo-3.1-lite** (défaut) | $0.05 | $0.40 | Volume, teasers |
| veo-3.1-fast | $0.15 | $1.20 | Qualité 1080p |
| veo-3.1 standard | $0.40 | $3.20 | Premium 4K |

## EXÉCUTION

```bash
# Vidéos pour un article
python scripts/generate-videos.py --slug perte-auditive-symptomes

# Dry run
python scripts/generate-videos.py --dry-run

# Modèle premium
python scripts/generate-videos.py --slug mon-article --model veo-3.1-generate-preview

# Tous les articles sans vidéos (avec garde-fou coût)
python scripts/generate-videos.py --force
```

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 VIDÉOS GÉNÉRÉES — {slug}

Hero : {path} ({duration}s, {size}MB) ✅
Short : {path} ({duration}s, {size}MB) ✅
Modèle : {model}
Coût : ${cost}

→ Ajouter au repo ? (oui/régénérer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Logger dans la base éditoriale ME : colonnes Hero Video (checkbox), Short Video (checkbox), Coût vidéos (number).
