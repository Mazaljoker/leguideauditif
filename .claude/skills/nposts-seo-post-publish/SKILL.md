---
name: nposts-seo-post-publish
description: >
  Monitoring post-publication LeGuideAuditif : verification indexation GSC, suivi
  positions J+1/J+7/J+14/J+30, detection cannibalisation, alertes performance,
  content decay. Utiliser apres merge de la PR article.
  Trigger: 'post-publish', 'verifier indexation', 'suivi article', 'est-ce indexe',
  'performance article', 'cannibalisation', 'monitoring seo', 'positions', 'J+7', 'J+30'.
  Ne PAS utiliser pour : creation contenu (me-affiliate-writer), audit pre-publication
  (me-eeat-compliance), corrections SEO (nposts-seo-fixer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 6
  chain: "me-affiliate-writer → nposts-seo-humanizer → nposts-content-evaluator → me-eeat-compliance → nposts-seo-fixer → [nposts-seo-post-publish]"
---

# nposts-seo-post-publish

Monitoring post-publication des articles LeGuideAuditif. Suit la performance
de chaque contenu publie a J+1, J+7, J+14 et J+30. Detecte les problemes
d'indexation, la cannibalisation et le content decay.

## INPUT

```json
{
  "slug": "string",
  "url": "string (https://leguideauditif.fr/guides/{slug} ou /comparatifs/{slug})",
  "published_date": "date ISO",
  "target_keyword": "string",
  "target_position": "number (objectif de position GSC)"
}
```

## WORKFLOW

### Checkpoint J+1 — Indexation

1. Verifier si l'URL est indexee (GSC URL Inspection ou site:url dans Google)
2. Si NOT_INDEXED :
   - Verifier que robots.txt ne bloque pas l'URL
   - Verifier que le sitemap.xml inclut l'URL
   - Demander l'indexation via GSC
   - Planifier re-verification a J+3
3. Verifier les erreurs de crawl (404, redirect loops, canonical issues)
4. Confirmer que le schema JSON-LD est valide (Article, FAQPage)

### Checkpoint J+7 — Premieres metriques

1. Recuperer impressions et clicks depuis GSC
2. Comparer position reelle vs position cible
3. Si position > 20 : flagger pour review contenu
4. Si impressions = 0 : verifier indexation (retour J+1)
5. Identifier les queries inattendues (positif : opportunites long-tail)

### Checkpoint J+14 — Stabilisation

1. Confirmer stabilisation de la position (ecart < 5 positions vs J+7)
2. **Detection cannibalisation** :
   - Pour chaque query du nouvel article, chercher si une autre page du site rank aussi
   - Si 2+ pages avec impressions >= 50 sur la meme query : ALERTE cannibalisation
   - Recommandations : consolider les pages, ajouter canonical, ou differencier les intents
3. Verifier CTR — si < 2% malgre bonnes impressions : optimiser title/meta
4. Verifier le maillage interne : au moins 2 pages du site pointent vers cet article

### Checkpoint J+30 — Rapport complet

1. Rapport performance :
   - Clicks total, impressions total, CTR moyen, position moyenne
   - Comparaison vs objectifs initiaux
2. Content decay detection : si position a chute > 5 places depuis J+14 → ALERTE
3. Engagement (si GA4 disponible) : bounce rate, time on page, scroll depth
4. **Feedback loop** : envoyer `top_pages` au `me-leadgen-manager`
   - Correler performance SEO avec generation de leads
   - Si page top SEO + 0 leads : probleme de conversion (CTA, formulaire)
   - Si page top leads + SEO faible : opportunite d'optimisation

## CANNIBALISATION — Logique de detection

```
Pour chaque query Q ou l'article A rank :
  1. Chercher toutes les pages du site qui rank aussi sur Q
  2. Si page B rank aussi ET impressions(B) >= 50 sur Q :
     - severity = HIGH si position(A) et position(B) sont < 20
     - severity = MEDIUM si une seule < 20
     - severity = LOW si les deux > 20
  3. Recommandation :
     - HIGH : consolider A et B en une seule page (redirect 301)
     - MEDIUM : ajouter canonical vers la page la plus performante
     - LOW : differencier les intents (modifier H1/title de la page la moins performante)
```

## OUTPUT

```json
{
  "type": "nposts-seo-post-publish",
  "payload": {
    "slug": "string",
    "url": "string",
    "check_day": "J+1|J+7|J+14|J+30",
    "index_status": "INDEXED|NOT_INDEXED|SUBMITTED",
    "performance": {
      "clicks": "number",
      "impressions": "number",
      "ctr": "number (0-1)",
      "avg_position": "number"
    },
    "cannibalization": [
      {
        "query": "string",
        "competing_page": "string (URL)",
        "severity": "HIGH|MEDIUM|LOW",
        "recommendation": "string"
      }
    ],
    "alerts": ["string"],
    "actions": ["string"]
  }
}
```

## EXAMPLES

### Exemple 1 : Rapport J+1 — Page non indexee

```
POST-PUBLISH J+1 — comparatif-appareil-auditif-classe-1

Index : NOT_INDEXED
Sitemap : OK (URL presente)
Robots.txt : OK (pas de blocage)
Action : Indexation demandee via GSC
Schema JSON-LD : Article + FAQPage valides

→ Re-verification planifiee a J+3
→ Si toujours NOT_INDEXED a J+7 : investiguer (contenu trop mince ? noindex accidentel ?)
```

### Exemple 2 : Rapport J+30 — Performance correcte

```
POST-PUBLISH J+30 — guide-perte-auditive-legere

Index : INDEXED
Clicks : 342 | Impressions : 8 450 | CTR : 4.0% | Position moy : 8.2
Objectif position : 10 → ATTEINT

Cannibalisation : 0 alerte
Content decay : position stable (8.2 vs 8.5 a J+14)

Leads generes (via me-leadgen-manager) : 12 qualifies
Correlation : score EEAT 87 + position 8 = conversion saine

→ Aucune action requise. Prochain check dans 30 jours.
```

## ERROR HANDLING

### GSC non connecte
Si aucun MCP GSC disponible : mode degrade. Utiliser `site:URL` dans Google pour
verifier l'indexation. Signaler que les metriques detaillees ne sont pas disponibles.

### Pas de donnees a J+7
Normal pour les nouvelles pages. Google peut prendre 3-7 jours pour commencer a
afficher des impressions. Ne pas paniquer — re-verifier a J+14.

### GA4 non disponible
Les metriques d'engagement (bounce rate, time on page) sont optionnelles.
Le rapport reste valide avec uniquement les donnees GSC.

## TROUBLESHOOTING

### Page non indexee apres 7 jours
1. Verifier la qualite du contenu (assez de texte ? > 800 mots ?)
2. Verifier le maillage interne (au moins 2 pages pointent vers l'article)
3. Verifier le canonical (doit pointer vers lui-meme)
4. Verifier les redirections (pas de chaine de redirects)
5. Soumettre manuellement dans GSC URL Inspection

### Position qui chute apres J+14
1. Verifier si un concurrent a publie du contenu similaire
2. Verifier si le contenu est toujours a jour (sources < 3 ans)
3. Verifier les Core Web Vitals de la page
4. Envisager une mise a jour du contenu via le pipeline GAN
