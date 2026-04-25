# Mode d'emploi — LeGuideAuditif.fr

> Session du 10 avril 2026 — Ce qui a été installé, configuré et comment l'utiliser.

---

## 1. Google API (GSC + GA4) — Accès configuré

### Ce qui a été fait

Fichier `.claude/google_api.py` copié dans ce repo + token OAuth dans `.claude/google_token.json` (gitignored). Le même token couvre les deux sites.

### Propriétés configurées

| Donnée | Valeur |
|--------|--------|
| GSC property | `sc-domain:leguideauditif.fr` |
| GA4 property | `properties/531522931` |
| Paramètre site | `site="leguideauditif"` |

### Exemple 1 — Voir les top requêtes GSC du guide auditif

**Prompt Cowork :**
> "Quelles sont les requêtes qui génèrent le plus de clics sur leguideauditif.fr ?"

```python
from google_api import get_gsc_top_queries
top = get_gsc_top_queries(site="leguideauditif", days=28, limit=20)
for q in top:
    print(f"{q['keys'][0]} → {q['clicks']} clics, #{q['position']:.0f}")
```

### Exemple 2 — Trafic par source

**Prompt Cowork :**
> "D'où vient le trafic de leguideauditif.fr ?"

```python
from google_api import get_ga4_traffic_summary
traffic = get_ga4_traffic_summary(site="leguideauditif", days=28)
for row in traffic:
    print(f"{row.get('sessionSource', 'N/A')} → {row.get('sessions', 0)} sessions")
```

---

## 2. Skills SEO — Multi-site activé

Tous les skills SEO du repo nposts_website supportent maintenant `site="leguideauditif"`. Voici comment les utiliser pour ce site.

### 2a. Audit SEO

**Prompt Cowork :**
> "Audit SEO de leguideauditif.fr"

Le skill `nposts-seo-auditor` utilisera automatiquement `site="leguideauditif"` si tu mentionnes le site. Il produit : score /100, erreurs techniques, données GSC, données GA4, quick wins.

### 2b. Suivi positions

**Prompt Cowork :**
> "Positions SEO de leguideauditif — on ranke sur quoi ?"

Le skill `nposts-seo-tracker` trackera les keywords du guide auditif via DataForSEO + corrélation GSC/GA4.

### 2c. Recherche de tendances

**Prompt Cowork :**
> "Est-ce que ça vaut le coup d'écrire sur les aides auditives rechargeables ?"

Le skill `nposts-seo-trend-researcher` vérifiera d'abord en GSC si leguideauditif.fr ranke déjà sur ce thème, puis fera la recherche complète (volumes, difficulté, SERP, GEO).

### 2d. Score SEO global

**Prompt Cowork :**
> "Score SEO global de leguideauditif.fr — comment on progresse ?"

Le skill `nposts-seo-evaluator` calculera le score pondéré /100 avec les métriques GA4 + GSC en temps réel.

---

## 3. Chaîne GAN YMYL — Rappel du workflow obligatoire

Pour tout contenu santé sur leguideauditif.fr, la chaîne est non-négociable :

```
me-affiliate-writer (ou seo-content-writer)
    → nposts-seo-humanizer (anti-IA)
    → nposts-content-evaluator (gate 1 : score >= 70)
    → me-eeat-compliance (gate 2 : score >= 80)
    → nposts-seo-fixer (PR GitHub)
    → nposts-seo-post-publish (indexation)
```

### Exemple — Rédiger un comparatif appareils auditifs

**Prompt Cowork :**
> "Écris un comparatif des meilleurs appareils auditifs rechargeables 2026 pour leguideauditif"

1. Déclenche `me-affiliate-writer` → article avec tableau specs, liens affiliés, classe 1 vs classe 2
2. Passe automatiquement par `nposts-seo-humanizer` → supprime les patterns IA
3. Gate 1 : `nposts-content-evaluator` vérifie score >= 70
4. Gate 2 : `me-eeat-compliance` vérifie YMYL (sources médicales, disclaimer, auteur, score >= 80)
5. Si les deux gates passent → `nposts-seo-fixer` pousse la PR

### Exemple — Vérifier la conformité E-E-A-T d'une page existante

**Prompt Cowork :**
> "Vérifie la conformité E-E-A-T de la page /guides/perte-auditive-causes/"

Déclenche `me-eeat-compliance` : score /100 + corrections sur auteur, sources, disclaimer, crédibilité.

---

## 4. Skills spécifiques LeGuideAuditif

| Skill | Rôle | Prompt exemple |
|-------|------|----------------|
| `me-affiliate-writer` | Comparatifs, fiches produits, guides d'achat | "Fiche produit Phonak Audéo Lumity L90" |
| `me-eeat-compliance` | Vérifie YMYL, sources médicales, auteur | "Score E-E-A-T de la page acouphènes" |
| `me-leadgen-manager` | Pipeline leads audioprothésistes | "Combien de leads ce mois ?" |

### Exemple — Fiche produit complète

**Prompt Cowork :**
> "Crée une fiche produit pour le Oticon Real 1 sur leguideauditif"

Produit : marque, modèle, type (contour/intra), classe (1 ou 2), fourchette prix, canaux, Bluetooth, rechargeable, garantie, verdict, lien affilié.

---

## 5. Plugins Cowork disponibles

Même plugins globaux que les autres repos :

| Plugin | Usage pour leguideauditif |
|--------|--------------------------|
| **Google Calendar** | Planifier publications, rappels |
| **Product Management** | Roadmap éditoriale, sprints contenu |
| **Data** | Analyser les données leads, trafic |

---

## 6. Règles YMYL — Points de vigilance

- Toute affirmation médicale → source obligatoire (HAS, INSERM, OMS, PubMed)
- Jamais de "guérir", "éliminer", "100% efficace", "miracle"
- Composant `HealthDisclaimer.astro` obligatoire sur chaque page contenu
- Composant `AuthorBox.astro` obligatoire (Franck-Olivier, audioprothésiste DE)
- Sources < 3 ans
- Flesch FR 60-80 (lisible niveau bac, audience seniors 65+)
- Taille police min 18px, contraste WCAG AA, touch targets 44x44px

---

## 7. Sécurité

- `.claude/google_token.json` dans `.gitignore` — jamais committé
- Liens affiliés : toujours `rel="sponsored noopener"`
- Pas de données personnelles patients dans le contenu
