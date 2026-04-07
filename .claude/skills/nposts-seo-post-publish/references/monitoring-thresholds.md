# Seuils de monitoring — nposts-seo-post-publish

## Alertes de performance

| Metrique | Seuil alerte | Action recommandee |
|---|---|---|
| Position moyenne | > 20 apres J+14 | Review contenu : title, H1, keyword density, maillage interne |
| CTR | < 2% avec impressions > 100 | Optimiser title et meta description |
| Impressions | < 50 apres J+14 | Verifier indexation, keyword volume, concurrence |
| Clicks | 0 apres J+7 (si indexe) | Verifier position, CTR, pertinence du snippet |

## Content decay

| Condition | Severity | Action |
|---|---|---|
| Position chute > 5 places en 30 jours | MEDIUM | Mettre a jour le contenu, verifier les sources |
| Position chute > 10 places en 30 jours | HIGH | Reecriture partielle via pipeline GAN, mise a jour date |
| Impressions divisees par 2 en 30 jours | HIGH | Verifier tendance saisonniere vs reel recul |
| Position passe de page 1 (< 10) a page 2+ | CRITICAL | Action immediate : update contenu + maillage |

## Cannibalisation

| Condition | Severity | Recommandation |
|---|---|---|
| 2 pages < position 20, meme query, impressions >= 50 | HIGH | Consolider (redirect 301 vers la meilleure) |
| 1 page < position 20, autre > 20, meme query | MEDIUM | Canonical vers la page la plus performante |
| 2 pages > position 20, meme query | LOW | Differencier les intents (modifier H1/title) |

## Frequence de monitoring

| Checkpoint | Delai post-publication | Metriques cles |
|---|---|---|
| J+1 | 24 heures | Indexation, robots.txt, sitemap, schema.org |
| J+7 | 7 jours | Premieres impressions/clicks, position initiale |
| J+14 | 14 jours | Stabilisation, cannibalisation, CTR |
| J+30 | 30 jours | Rapport complet, content decay, feedback loop leads |

## Objectifs par type de contenu

| Type | Position cible J+30 | CTR cible | Impressions cible |
|---|---|---|---|
| Guide (informationnel) | < 15 | > 3% | > 500 |
| Comparatif (transactionnel) | < 10 | > 4% | > 300 |
