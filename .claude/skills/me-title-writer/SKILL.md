---
name: me-title-writer
description: >
  Position 4 du pipeline snippet. Génère UNE proposition recommandée title/meta/H1
  par page auditée. Suit la formule ABC Ahrefs (Adjective + Benefit + Confidence),
  YMYL-safe (bloque "guérir", "100% efficace", "le meilleur"), pixel-width aware
  (approximation 8px/char, safe <= 580px), surface la crédibilité DE + 28 ans.
  Pour topologies C/D (templates) : produit un NOUVEAU pattern de construction du
  title (1 patch = N pages) PLUS des overrides individuels optionnels pour les top
  pages. Pas A/B/C, UNE seule variante recommandée.
  Trigger: 'proposer titles', 'writer snippets', 'generer metas ymyl', 'rewrite title seo',
  'template pattern seo', 'formule abc ahrefs'.
  Ne PAS utiliser pour : audit mismatch (me-title-auditor), scoring (me-snippet-evaluator,
  me-eeat-snippet-check), patching (me-snippet-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 4
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> [me-title-writer] -> me-snippet-evaluator -> me-eeat-snippet-check -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_title_write.py"
  status: functional
---

# me-title-writer — Position 4

Génère 1 proposition recommandée par page. Respecte YMYL, pixel-width, crédibilité.

## INPUT

| Param | Default | Description |
|---|---|---|
| `--in` | dernier `audit/title-audit-*.json` | JSON me-title-auditor |
| `--out` | `audit/title-proposals-<today>.json` | Chemin de sortie |
| `--priority` | `medium` | Seuil min : `high`, `medium`, ou `low` (inclut tout) |

## WORKFLOW

1. **Invoquer** : `python .claude/me_title_write.py --priority medium`
2. **Valider le summary** :
   - `ymyl_violations = 0` (hard fail sinon)
   - `constraints_failed = 0` (sinon raccourcir les patterns)
3. **Présenter à l'utilisateur** :
   - Individual proposals (topologies A + B)
   - Template patterns (topologies C + D) — **un patch = N pages**
   - Individual overrides pour les top pages des templates
4. **Checkpoint humain** obligatoire avant GATE 1 (`me-snippet-evaluator`).

## FORMULE ABC (Ahrefs, adaptée YMYL)

```
[Primary Query Integrated] : [Factual Benefit] (expert DE 28 ans)
```

Exemples validés (run réel LGA) :
- `Audiogramme normal : seuils par âge (expert DE)` — 47 chars, CTR +9.1%
- `Phonak Sphere Infinio 90 : prix, avis (audio DE)` — 48 chars
- `${typedCentre.nom} - Audioprothésiste ${displayVille}` — pattern centre

## RÈGLES YMYL (hard block)

Bloqués dans title ET meta :
```regex
\b(guér(ir|ison)|éliminer?|100[\s%]*efficace|miracle|sans\s+égal|
garantie\s+totale|remède\s+absolu|solution\s+définitive)\b

\b(le\s+meilleur|la\s+meilleure|meilleur\s+du\s+marché|n°\s*1|
numero\s+un|incontournable)\b
```

Obligatoires :
- Title OU meta doit contenir : `DE` OU `audioprothésiste` OU `28 ans` OU `expert` OU `diplômé`
- Fiche `/catalogue/appareils/` : meta doit contenir `€` OU `prix` OU `formatPrice` (template)

## HEURISTIQUE CTR PREDICTION

Delta CTR prédit (somme des facteurs) :

| Bonus | Delta |
|---|---|
| Sentiment positif (expert, guide, vérifié, fiable, transparent) | +4.1% |
| Number dans title | +3.0% |
| Crédibilité quantifiée (28 ans, 3000 patients, DE, diplôme) | +5.0% |
| Question intent informationnel | +2.0% |

| Malus | Delta |
|---|---|
| Superclaim (le meilleur, n°1) | -8.0% |
| Therapeutic promise (guérir, 100% efficace) | -15.0% |
| Suffixe parasite (— LGA, etc.) | -5.0% |

## MODES DE PATCH

### `individual` (topologies A + B)

Un title/meta/H1 dédié à chaque page. Patch direct du fichier source (frontmatter
MDX ou props `<BaseLayout>` dans `.astro`).

### `template_pattern` (topologies C + D)

Un **nouveau pattern template** qui affecte toutes les pages du template en un
seul patch. Ex : `${typedCentre.nom} - Audioprothésiste ${displayVille}` est
utilisé pour les 7 146 centres RPPS en attente.

### `individual_override` (optionnel sur C/D)

Pour les top pages du template (impressions ≥ 3-5 selon topologie), propose
un override personnalisé stocké :

| Topologie | Store proposé |
|---|---|
| C catalogue appareils | `content_collection:catalogueAppareils.seoTitle/seoDescription` (schéma Zod à étendre) |
| C centres | `supabase:centres_seo_overrides` (nouvelle table) |

L'implémentation effective est déportée à `me-snippet-fixer` (J6).

## PIXEL WIDTH

Approximation police Inter/Roboto @ 18px :
- Caractères étroits (`i l I . , ; : | ! ( ) [ ] { } ' "`) : 5 px
- Caractères larges (`m w M W @ # % &`) : 12 px
- Espace : 4 px
- Autres : 8 px

Safe zone : <= 580 pixels. Cible production : 400-520 px.

## CONSTRAINTS VERIFIED

Chaque proposition est validée sur :

- `title_under_60_chars`
- `title_under_580_px`
- `meta_under_155_chars`
- `credibility_surfaced` (DE / 28 ans / diplôme dans title OU meta)
- `price_in_meta_if_catalogue` (€ OU prix OU formatPrice si url commence par `/catalogue/appareils/`)

**Note sur les templates** : les constraints sont calculées sur le pattern string
(avec les `${...}` placeholders). Le rendu réel peut varier. `me-snippet-evaluator`
(GATE 1) ré-évalue avec un sample rendu.

## OUTPUT

```json
{
  "type": "me-title-writer",
  "payload": {
    "priority_filter": "medium",
    "individual_proposals": [
      {
        "url": "/guides/audiogramme/",
        "topology": "A_mdx_frontmatter",
        "source_file": "src/content/guides/audiogramme.mdx",
        "patch_mode": "individual",
        "variant": {
          "title": "Audiogramme normal : seuils par âge (expert DE)",
          "meta": "...",
          "h1_suggested": "...",
          "title_chars": 47,
          "meta_chars": 132,
          "title_pixels_estimated": 339,
          "formula_used": "ABC + long_tail_theme:age",
          "predicted_ctr_delta_pct": 9.1,
          "sentiment": "positive",
          "rationale": "...",
          "long_tails_integrated": [...]
        },
        "ymyl_check": { "title_safe": true, "meta_safe": true, ... },
        "constraints_respected": { ... },
        "priority": "high",
        "roi_score": 1.98,
        "mismatch_score_before": 45
      }
    ],
    "template_proposals": [...],
    "individual_overrides_for_templates": [...]
  }
}
```

## TEST DE NON-RÉGRESSION

Run sur LGA post-launch J+14 (priority medium) :

```
4 propositions
  Individual (A/B)         : 1    (audiogramme)
  Template patterns (C/D)  : 2    (catalogue appareils + centres)
  Individual overrides     : 2    (oticon xceed 3 + oticon intent 1 ou autre)
  YMYL violations          : 0    (hard fail sinon)
  Contraintes non respectees : 0  (raccourcir patterns sinon)

CTR delta prédit /guides/audiogramme/ : +9.1%
```

Si YMYL violations > 0 : bug dans la génération OU nouveau pattern interdit à
ajouter à `FORBIDDEN_PATTERNS` / `SUPERCLAIM_PATTERNS`.

Si constraints > 0 : patterns template trop longs → raccourcir.

## EXTENSIBILITE

Templates additionnels à ajouter selon besoin :
- `/annonces/*` (B2B petites annonces audioprothésistes)
- `/etudes/*` (études publiées par Franck-Olivier)
- `/outils/*` (analyse-audiogramme et futurs outils interactifs)
- `/offres/*` (offres partenaires)

Ajouter un `elif url.startswith("/annonces/"):` dans `write_for_template_dynamic`
ou `write_for_static_page` selon la topologie réelle. Cohérence à valider via
`me-title-auditor` output.
