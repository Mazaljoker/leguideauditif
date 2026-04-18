# Checklist actions manuelles GSC — S16 (20 avril)

Ce fichier liste les actions manuelles à effectuer dans Google Search
Console **après** le déploiement en production des changements A1+A2+A5.

Référence : `docs/plan-execution-indexation-2026-04-18.md` Section 2.

---

## Pré-requis

- [ ] `src/pages/sitemap-pages-locales.xml.ts` déployé en production
- [ ] `public/robots.txt` mis à jour déployé en production
- [ ] Vérification : `curl -s https://leguideauditif.fr/sitemap-pages-locales.xml | head -20` retourne un XML valide
- [ ] Vérification : `curl -s https://leguideauditif.fr/robots.txt | grep sitemap-pages-locales` retourne la ligne ajoutée

---

## A2 — Soumettre sitemap-pages-locales.xml dans GSC

**Chemin GSC** : Search Console → **Sitemaps** (menu gauche) →
champ "Ajouter un sitemap" → entrer `sitemap-pages-locales.xml` →
**Envoyer**.

**Critère succès J+2** :
- La ligne apparaît avec statut **"Succès"**
- Colonne "URLs découvertes" indique un nombre (attendu > 500,
  probablement ~3200)

Si statut **"Impossible de récupérer"** : vérifier d'abord le
pré-requis (accessibilité publique du XML).

---

## A3 — Inspect URL sur 10 villes stratégiques

**Chemin GSC** : Search Console → barre de recherche en haut ("Inspect
any URL in leguideauditif.fr") → coller chaque URL → **bouton
"Demander l'indexation"**.

**Limite** : 10 URLs/jour par propriété. Faire les 10 d'un coup.

URLs à inspecter (copier-coller dans l'ordre) :

```
https://leguideauditif.fr/audioprothesiste/paris/
https://leguideauditif.fr/audioprothesiste/marseille/
https://leguideauditif.fr/audioprothesiste/lyon/
https://leguideauditif.fr/audioprothesiste/toulouse/
https://leguideauditif.fr/audioprothesiste/bordeaux/
https://leguideauditif.fr/audioprothesiste/nice/
https://leguideauditif.fr/audioprothesiste/nantes/
https://leguideauditif.fr/audioprothesiste/strasbourg/
https://leguideauditif.fr/audioprothesiste/montpellier/
https://leguideauditif.fr/audioprothesiste/lille/
```

**Critère succès J+7** : les 10 URLs apparaissent dans GSC → Indexation
→ Pages → **Dans l'index**.

---

## A4 — Inspect URL sur les 9 www résiduelles (purge canonique)

**Pourquoi** : ces URLs ont été indexées avant que le 308 www→non-www
soit pleinement stabilisé. Forcer un re-crawl permet à Google de voir
la redirection et de consolider sur les non-www.

**Base technique validée** :
- `vercel.json` a bien la redirect 308 de `www.leguideauditif.fr/*`
  vers `https://leguideauditif.fr/*`
- `src/components/SEOHead.astro:24-27` construit le canonical via
  `Astro.site = 'https://leguideauditif.fr'` (non-www absolu)
- Aucun lien hardcodé `www.leguideauditif.fr` dans `src/` (grep
  confirmé)

Donc cette action est **purement de la purge d'index**, pas de
correction technique.

URLs à inspecter (après les 10 de A3 si on garde la limite 10/jour —
sinon J+2) :

```
https://www.leguideauditif.fr/annonces/
https://www.leguideauditif.fr/faq/
https://www.leguideauditif.fr/trouver-audioprothesiste/
https://www.leguideauditif.fr/mentions-legales/
https://www.leguideauditif.fr/revendiquer/?centre=audition-jcg-01500
https://www.leguideauditif.fr/catalogue/appareils/signia-pure-ix-5/
https://www.leguideauditif.fr/catalogue/appareils/signia-pure-ax-7/
https://www.leguideauditif.fr/catalogue/appareils/phonak-naida-marvel-70/
https://www.leguideauditif.fr/catalogue/appareils/starkey-omega-ai-16/
```

**Critère succès J+14** : 0 ligne `https://www.leguideauditif.fr/*`
dans l'export CSV GSC (`Tableau.csv`).

---

## Dates

| Action | Quand | Qui |
|---|---|---|
| A2 submit sitemap | J+0 (après déploiement) | manuel GSC |
| A3 Inspect x10 villes | J+0 (après submit A2) | manuel GSC, ~30 min |
| A4 Inspect x9 www | J+1 (quota 10/jour respecté) | manuel GSC, ~20 min |
| Re-mesure complète | J+14 (2 mai) | `node scripts/diagnostic/run-remesure.mjs` |

---

## Anti-pattern à éviter

**NE PAS re-soumettre le sitemap tous les jours "pour accélérer".**
Un seul submit suffit. Google re-fetch le sitemap régulièrement par
lui-même. Re-submits rapprochés = signal négatif (Section 6 du plan).
