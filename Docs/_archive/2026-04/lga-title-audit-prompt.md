# MISSION : Audit Title/Meta vs Requêtes GSC — LeGuideAuditif

## Contexte

Tu travailles sur **LeGuideAuditif.fr** (repo `Mazaljoker/leguideauditif`).
Site YMYL santé lancé le 14/04/2026, stack Astro 6 + MDX.
Auteur : Franck-Olivier Chabbat, audioprothésiste DE, 28 ans d'expérience, 3 000+ patients.

Google Search Console montre à J+10 :
- Les pages éditoriales sont déjà en page 1 Google (bon signal)
- **Mais les CTR non-brand sont ~0%** (ex : `/guides/` pos 3,4, 58 impr, 0 clic)
- Cause suspectée : titles trop génériques + suffixe "— LGA" inutile + différenciateur "audio DE 28 ans" absent des titles

## Objectif

Produire un **audit priorisé** des pages où il y a un **mismatch entre les requêtes qui rankent dans GSC et les mots du title actuel**. Sortir un plan d'action title/meta par page, prêt à exécuter en Phase 2.

⚠️ **Phase 1 = AUDIT UNIQUEMENT.** Ne pousse AUCUNE PR. Ne modifie AUCUN fichier. On valide le rapport humain avant Phase 2 (fix via `nposts-seo-fixer`).

## Inputs

1. **Export GSC** : fichier `leguideauditif_fr-Performance-on-Search-2026-04-18.xlsx` (28 derniers jours, onglets Requêtes + Pages)
2. **Repo GitHub** : `github.com/Mazaljoker/leguideauditif` — lis les pages Astro (`src/pages/`, `src/content/`, layouts)
3. **DataForSEO MCP** : enrichissement volumes mensuels FR + SERP features
4. **Skill de référence** : patterns de `nposts-seo-optimizer` (adapte pour LGA, pas pour nposts.ai)

## Méthode

### Étape 1 — Parser le GSC
- Charge l'onglet **Pages** (URL, clics, impressions, CTR, position)
- Charge l'onglet **Requêtes** (query, clics, impressions, CTR, position)
- Normalise les URLs : strip `www.`, trailing slash consistent
- **Filtre brand** : exclure requêtes contenant `leguideauditif`, `guide auditif`, `franck-olivier`

### Étape 2 — Mapper requêtes ↔ pages
GSC ne fournit pas le mapping direct query→page dans l'export basique. Pour chaque page avec >= 5 impressions :
- Identifie les 3-5 requêtes les plus probables qui la déclenchent (sémantique + slug URL)
- Si ambigu, utilise DataForSEO `serp/google/organic` sur la query pour vérifier que leguideauditif.fr apparaît bien
- Tag chaque query avec : `head` (volume >500/mois) | `mid` (50-500) | `long_tail` (<50) | `unknown` (non trouvé DataForSEO)

### Étape 3 — Fetch titles & meta actuels
Pour chaque page audité :
- Lis le fichier Astro source dans le repo (frontmatter MDX ou prop `title`/`description` du layout)
- Extrais : `title`, `meta description`, `H1`, `canonical`
- Note si un suffixe "— LGA" / "— LeGuideAuditif.fr" est présent

### Étape 4 — Détecter les mismatches

Pour chaque page, calcule un **Mismatch Score /100** :

| Critère | Poids | Détection |
|---|---|---|
| Requête principale absente du title | 30 | Le mot-clé qui génère le plus d'impr n'est pas dans le title |
| Crédibilité DE absente | 15 | Ni "audioprothésiste", ni "DE", ni "28 ans", ni "expert" dans title OU meta |
| Suffixe parasite | 10 | Présence de "— LGA" / "— LeGuideAuditif.fr" (gaspille 15-20 chars) |
| Prix manquant (fiche produit) | 20 | Meta sans "€" ou "prix" alors que c'est une page `/catalogue/appareils/` |
| Long tail ignoré | 15 | Requête mid/long-tail avec >= 5 impr absente du title ET de la meta |
| Title >60 chars | 5 | Risque de troncature SERP |
| Meta >155 chars | 5 | Risque de troncature SERP |

### Étape 5 — Prioriser par ROI

**Score ROI = impressions × (1 / position_moyenne) × facteur_strike_zone**

`facteur_strike_zone` :
- Position 1-3 : 0.3 (marge limitée)
- Position 4-10 : **1.0 (sweet spot)**
- Position 11-20 : **1.5 (gain max par optim title)**
- Position 21+ : 0.4 (problème fond avant forme)

Sort décroissant → top 20 pages à patcher.

### Étape 6 — Proposer title/meta pour chaque quick win

Pour chaque page du top 20, propose :
- **Title optimisé** (<60 chars) respectant :
  - Intègre la requête principale
  - Surface la crédibilité DE (ex : "par un audio DE" / "expert DE 28 ans" / "guide d'un audioprothésiste")
  - ❌ Supprime suffixe "— LGA"
  - ❌ Pas de promesse thérapeutique (YMYL)
- **Meta optimisée** (<155 chars) :
  - Bénéfice utilisateur concret
  - Pour fiches produits : prix en € obligatoire
  - Ton direct, professionnel, audience seniors
- **Raison** en 1 phrase (pourquoi ce changement, basé sur quelle data GSC)

### Étape 7 — Vérifier l'YMYL
- Aucune promesse thérapeutique ("guérir", "éliminer", "100% efficace", "miracle")
- Pas de sur-claim ("le meilleur", "sans égal")
- Audience seniors 65+, vouvoiement implicite dans la meta

## Livrable

Crée deux fichiers dans `./audit/` :

### 1. `audit/title-audit-2026-04-18.json`
```json
{
  "meta": {
    "date_audit": "2026-04-18",
    "gsc_period": "2026-03-21 → 2026-04-16",
    "total_pages_audited": 85,
    "pages_with_impressions": 14
  },
  "pages": [
    {
      "url": "/guides/audiogramme/",
      "source_file": "src/content/guides/perte-auditive/audiogramme.mdx",
      "gsc": {
        "impressions": 93,
        "clicks": 1,
        "ctr": 0.0108,
        "avg_position": 7.23,
        "top_queries": [
          { "q": "audiogramme normal 50 ans", "impr": 6, "pos": 9.83, "bucket": "mid" },
          { "q": "audiogramme normal 60 ans", "impr": 4, "pos": 11.0, "bucket": "mid" }
        ]
      },
      "current": {
        "title": "Audiogramme : lire et comprendre vos résultats — LGA",
        "meta": "Comment lire un audiogramme tonal et vocal ? Guide par un audioprothésiste DE (28 ans)...",
        "h1": "Audiogramme : lire et comprendre vos résultats",
        "title_length": 52
      },
      "mismatch_score": 65,
      "mismatch_reasons": [
        "Long tail 'normal par âge' absent du title (15 impr combinées)",
        "Suffixe '— LGA' inutile (7 chars gaspillés)"
      ],
      "roi_score": 12.87,
      "priority": "high",
      "proposal": {
        "title": "Audiogramme normal : seuils par âge (expert DE 28 ans)",
        "meta": "Comment lire un audiogramme à 50, 60, 70 ans ? Seuils normaux, classification BIAP. Par un audioprothésiste DE, 28 ans d'expérience.",
        "reason": "Requête principale 'audiogramme normal 50/60/70 ans' (13 impr combinées, pos 9-20) absente du title actuel. En l'intégrant, potentiel de passer pos 7 → pos 3-5 sur ces long tails."
      }
    }
  ]
}
```

### 2. `audit/title-audit-2026-04-18.md`
Rapport lisible humain :
- Résumé exécutif (3 bullets max : gros problèmes, gros levier, impact estimé)
- Top 20 quick wins en tableau (URL | title actuel | title proposé | impact estimé)
- Quick wins catalogue produits : combien de fiches sans prix en meta, liste des pires
- Section "Patterns systémiques" : les 3-5 problèmes récurrents à fixer en batch (ex : "87 pages ont le suffixe — LGA en fin de title → script de remplacement bulk")
- Annexe : méthodologie + limites (pages avec <5 impr non auditées)

## Règles strictes

1. ❌ **AUCUNE modification de fichier source.** Zéro PR. Zéro commit. Mode read-only sur le repo.
2. ❌ **Pas d'invention de données GSC.** Si une query n'est pas mappable à une page avec certitude → flag `unknown`, n'invente pas.
3. ❌ **Respect YMYL.** Toute proposition title/meta doit passer le filtre santé : pas de promesse, pas de sur-claim.
4. ✅ **Transparence.** Pour chaque proposition, cite la data GSC qui la justifie. Si proposition basée sur intuition SEO, note-le explicitement.
5. ✅ **Budget DataForSEO.** Max 100 queries enrichies (volumes + SERP). Priorise les pages avec >= 10 impressions.
6. ✅ **Phase 2 préparée.** Le JSON doit être consommable par `nposts-seo-fixer` adapté LGA pour pousser une PR batch ensuite.

## Checkpoint humain

Stoppe et affiche à Franck-Olivier :
- Top 5 pages à plus gros ROI + proposition title/meta
- Nombre total de pages avec mismatch_score >= 50
- 3 patterns systémiques détectés

Attends validation avant de générer le rapport complet.

## Notes contextuelles

- Split `www.` vs non-`www.` détecté dans GSC → à signaler en annexe (risque split d'autorité, pas lié au title mais important)
- Site en period honeymoon Google (boost ~3-4 semaines) → certaines positions vont baisser naturellement. Ne pas sur-interpréter positions < 5 sur requêtes peu concurrentielles.
- Les 7 146 fiches centres RPPS vont être publiées dans les prochaines semaines → prévoir un template title/meta optimisé pour ce pattern dans l'annexe.

---

**Début de mission :** parse le fichier GSC, énumère les 14 pages avec impressions, propose le plan d'attaque. Checkpoint avant étape 4.
