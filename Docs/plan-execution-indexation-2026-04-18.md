# Plan d'exécution — Post-diagnostic indexation LGA

**Date** : 2026-04-18
**Horizon** : S16-S17 (18/04 → 02/05)
**Source** : `docs/diagnostic-indexation-2026-04-18.md`
**Statut** : remplace les PRDs et recommandations SEO antérieurs

---

## Section 1 — Synthèse du diagnostic

1. **Partie 1 — Clusterisé chronologique.** 47/49 fiches centres
   indexées commencent par 'a' (95,9%). Distribution étalée sur 36
   départements distincts. Ratio enseigne/indé 69/31 expliqué par
   artefact alphabétique (audika, amplifon en tête du tri).
2. **Partie 2 — Trajectoire normale.** Le sitemap-centres n'a été
   détecté que le 11/04 (bond +982 non-indexées). Rythme observé
   14-46 URLs/jour, au-dessus des benchmarks YMYL jeunes. 50%
   atteignable mi-mai sans action supplémentaire.
3. **Partie 3 — Maillage fonctionnel, sous-exploité.** 4/4 pages silo
   testées linkent bien les fiches indexées correspondantes. Mais
   seulement 3/49 fiches ont été découvertes via le silo pré-sitemap.
   Google crawle peu le silo tant qu'il n'est pas soumis en sitemap.

---

## Section 2 — Actions S16-S17 (18/04 → 02/05)

### A1 — Créer `sitemap-pages-locales.xml`

- **Objectif** : exposer à Google les ~3196 pages silo actuellement
  hors radar (3100 villes + 96 dépts)
- **Adresse** : Partie 3 (maillage sous-exploité)
- **Effort** : 3-4h
  - Route Astro `src/pages/sitemap-pages-locales.xml.ts`
  - Extraction des `ville-slugs` distincts depuis `centres_auditifs`
    (pagination par 1000 obligatoire, cf. mémoire
    `feedback_supabase_pagination`)
  - Extraction des 96 codes dépts distincts
  - `<lastmod>` = date de dernière modification de la commune OU
    date de build (fallback)
- **Impact mesurable** : 3196 URLs nouvelles dans le crawl queue
  Google
- **Critère succès J+14** : >= 30% de ces URLs indexées (≈ 960) ET
  présence d'au moins 50 pages villes/dépts dans l'index GSC
- **Ordre** : séquentiel, à livrer en premier

### A2 — Soumettre `sitemap-pages-locales.xml` dans GSC

- **Objectif** : entrer Google dans le cycle de découverte
  immédiatement après mise en ligne
- **Adresse** : Partie 3
- **Effort** : 10 min (UI GSC + ajout ligne dans
  `public/robots.txt` si présent, sinon créer)
- **Impact mesurable** : statut "Succès" dans GSC → Sitemaps sous 48h
- **Critère succès J+14** : GSC → Sitemaps montre N URLs découvertes
  via ce sitemap (N > 500)
- **Ordre** : séquentiel, juste après A1

### A3 — Inspect URL sur 10 villes stratégiques

- **Objectif** : forcer le premier crawl sur les zones à plus gros
  volume de recherche
- **Adresse** : Partie 3 (découverte = goulot)
- **Effort** : 30 min
- **URLs ciblées** : `/audioprothesiste/{paris,marseille,lyon,
  toulouse,bordeaux,nice,nantes,strasbourg,montpellier,lille}/`
- **Impact mesurable** : 10 URLs indexées sous 7 jours (vs. ~2-3
  semaines en découverte passive)
- **Critère succès J+14** : 10/10 URLs indexées visibles dans l'export
  CSV GSC
- **Ordre** : parallèle avec A4-A5, après A2

### A4 — Nettoyer les 9 canonicals www résiduels

- **Objectif** : purger les doublons www/non-www (9 URLs www dans
  l'index + 35 pages en erreur canonique)
- **Adresse** : point défensif noté dans diagnostic, pas une conclusion
- **Effort** : 2h
  - Vérifier redirect 308 www→non-www côté Vercel (`vercel.json`
    ou `vercel.ts`)
  - Vérifier `<link rel="canonical">` dans layouts Astro pointe
    toujours sur non-www absolu
  - Re-Inspect URL sur les 9 www identifiées pour forcer re-crawl +
    consolidation
- **Impact mesurable** : 0 URL www dans l'index à J+14 ; bucket
  "Autre page avec balise canonique correcte" passe de 35 à < 10
- **Critère succès J+14** : re-export CSV GSC montre 0 ligne
  `https://www.leguideauditif.fr/*`
- **Ordre** : parallèle

### A5 — Versionner script de re-mesure en un-shot

- **Objectif** : re-mesurer à J+14 sans friction, sans erreur humaine
- **Adresse** : Partie 2 (besoin de mesurer la trajectoire
  factuellement, pas à l'intuition)
- **Effort** : 1h
  - Script wrapper `scripts/diagnostic/run-remesure.mjs` qui :
    (1) détecte les CSV dans `docs/data/` (suffixe date),
    (2) lance `parse-gsc-indexed.mjs` avec le bon input,
    (3) lance `check-silo-mesh.sh`,
    (4) produit un delta tabulaire par rapport au précédent
    `diagnostic-stats.json`
- **Impact mesurable** : durée de la re-mesure J+14 < 15 min
- **Critère succès** : `node scripts/diagnostic/run-remesure.mjs
  --input docs/data/gsc-*-J14.csv` produit le delta sans intervention
- **Ordre** : parallèle

### Récap tableau

| # | Action | Effort | Ordre |
|---|---|---|---|
| A1 | sitemap-pages-locales.xml | 3-4h | 1 (séq.) |
| A2 | Submit GSC + robots.txt | 10 min | 2 (séq.) |
| A3 | Inspect URL x10 | 30 min | 3 (parall.) |
| A4 | Canonicals www | 2h | 3 (parall.) |
| A5 | Script re-mesure | 1h | 3 (parall.) |

**Total effort** : ~7h de dev, à tenir en S16 (semaine du 20 avril).

---

## Section 3 — NE PAS FAIRE maintenant

### Enrichissement du template Level 1

- **Pourquoi c'est invalidé à court terme** : Partie 1 du diagnostic
  montre que Google n'a pas encore jugé la qualité — il crawle dans
  l'ordre alphabétique du sitemap, sans sélection. 47/49 fiches
  indexées commencent par 'a' = preuve que l'algo de tri est
  chronologique, pas qualitatif.
- **Risque si fait maintenant** : 1 semaine de dev pour un gain zéro
  à J+14. L'indexation ne dépend pas du contenu du template, elle
  dépend de la vitesse de découverte.
- **Quand rouvrir le chantier** : si Scénario C à J+14 (voir Section 5).

### Ajout des 6 146 fiches RPPS manquantes au sitemap-centres

- **Pourquoi c'est invalidé** : tant que le premier lot de 1000 n'a
  pas atteint >= 50% d'indexation (soit ~500 fiches), ajouter plus
  d'URLs = ajouter du bruit à la file "Détectée non indexée" sans
  changer le rythme de traitement. Google alloue du crawl au domaine,
  pas à l'URL individuelle.
- **Contre-risque** : dilution du jus sitemap sur 7146 URLs au lieu
  de 1000.
- **Quand rouvrir** : Scénario A à J+14, et par vagues de 1000 sur
  4-5 semaines.

### Campagne backlinks

- **Pourquoi c'est invalidé** : Partie 2 montre que le rythme 14-46
  URLs/jour est déjà au-dessus des benchmarks YMYL jeunes sans
  backlink significatif. Le trust domaine monte suffisamment vite pour
  l'indexation.
- **Où budget backlinks devient utile** : phase ranking (après
  indexation résolue), pas phase indexation.
- **Quand rouvrir** : Scénario A + J+30 si on veut pousser le ranking
  sur requêtes commerciales.

### Noindex chirurgical des fiches pauvres

- **Pourquoi c'est invalidé** : Partie 1 montre que Google n'a pas
  encore jugé la qualité. Noindex préventif = signal négatif gratuit
  ("je ne fais pas confiance à mon propre contenu"). Et ça retire
  des URLs de la file d'indexation qui pourraient générer du long-tail.
- **Quand rouvrir** : jamais préventivement. Uniquement en curatif
  sur URLs individuellement identifiées comme problématiques via
  GSC (bucket "Explorée non indexée" > 100).

---

## Section 4 — Protocole de re-mesure J+14 (2 mai 2026)

### Étape 1 — Export GSC

Dans GSC → **Indexation → Pages** :
1. Cliquer sur la tuile verte "Dans l'index" (ou "Afficher les données
   concernant les pages indexées")
2. Bouton "Exporter" → CSV
3. Renommer et déposer dans `docs/data/` avec le suffixe `-J14` :
   - `Tableau.csv` → `gsc-urls-indexees-J14.csv`
   - `Graphique.csv` → `gsc-timeline-J14.csv`
   - `Problèmes critiques.csv` → `gsc-problemes-J14.csv`
   - `Métadonnées.csv` → `gsc-metadonnees-J14.csv`

### Étape 2 — Lancer la re-mesure

```bash
node scripts/diagnostic/run-remesure.mjs \
  --input docs/data/gsc-urls-indexees-J14.csv \
  --timeline docs/data/gsc-timeline-J14.csv \
  --baseline docs/data/diagnostic-stats.json
```

Sortie attendue : rapport markdown + JSON delta dans
`docs/data/diagnostic-stats-J14.json`.

### Étape 3 — Tableau à remplir

| Métrique | J+0 (13/04) | J+14 (02/05) | Delta | Seuil |
|---|---|---|---|---|
| URLs totales indexées | 97 | ? | ? | voir scénarios |
| Fiches `/centre/*` indexées | 49 | ? | ? | — |
| Pages villes indexées | 0 | ? | ? | > 50 |
| Pages dépts indexées | 0 | ? | ? | > 30 |
| Bucket "Détectée non indexée" | 1183 | ? | ? | < 2000 |
| Bucket "Explorée non indexée" | 25 | ? | ? | < 100 |
| % fiches indexées commençant par 'a' | 95,9 | ? | ? | < 80% |
| URLs www dans l'index | 9 | ? | ? | 0 |

Le % 'a' qui baisse en dessous de 80% = signal que Google progresse
dans l'alphabet = rythme actif. Inchangé = blocage de crawl.

---

## Section 5 — Décisions pré-câblées à J+14

### Scénario A — Trajectoire confirmée

- **Critère déclencheur** : URLs totales indexées > 300 **ET** pages
  villes OU dépts indexées > 30% du sitemap-pages-locales (> 960 si
  on prend le total 3196)
- **Lecture** : la découverte a débloqué l'indexation, Google avance
  dans le silo, le diagnostic Partie 2 est confirmé
- **Décision** : poursuivre, commencer à scaler
- **Actions S18-S21** :
  1. Fixer la pagination Supabase dans `src/pages/sitemap-centres.xml.ts`
     (limite 1000 actuelle, cf. diagnostic)
  2. Exposer les 7146 fiches par vagues de 1000 sur 4-5 semaines
  3. Monitoring passif hebdomadaire (pas quotidien)
- **Horizon re-mesure** : J+30 (16 mai)

### Scénario B — Progression partielle

- **Critère déclencheur** : 150-300 URLs indexées **OU** pages villes
  dans l'index mais ratio < 30%
- **Lecture** : Google a pris en compte le nouveau sitemap mais le
  rythme de traitement reste contraint par le budget crawl du domaine
- **Décision** : attendre, ne rien ajouter
- **Actions S18-S19** : aucune action offensive. Monitoring passif.
- **Horizon re-mesure** : J+28 (14 mai)

### Scénario C — Stagnation réelle

- **Critère déclencheur** : URLs totales indexées < 150 **OU** zéro
  nouvelle page ville indexée **OU** bucket "Explorée non indexée"
  > 100 (= Google crawle mais rejette)
- **Lecture** : le diagnostic Partie 1 est invalidé. Le problème
  n'est pas la découverte seule — il y a aussi un vrai signal de
  thinness sur le Level 1.
- **Décision** : ouvrir le chantier enrichissement template Level 1
- **Actions S18+** :
  1. Produire une spec détaillée du template enrichi (INSEE pop
     commune, dosage 250+ mots unique, AuthorBox sur chaque fiche,
     HealthDisclaimer)
  2. Prototype sur 20 fiches témoins
  3. Mesurer indexation des 20 témoins avant de scaler
- **Horizon re-mesure** : J+21 après déploiement nouveau template

---

## Section 6 — Anti-patterns à surveiller

1. **Regarder GSC quotidiennement.** Les stats bougent à J+3-5,
   pas à J+1. Regarder tous les jours crée du bruit psychologique,
   pas de l'information. Fenêtre de mesure utile = 7 jours minimum.

2. **Interpréter +2 URLs sur une journée comme "stagnation".** Le
   rythme utile se mesure en moyenne hebdomadaire, pas en dérivée
   quotidienne. Une journée à 0 suivie d'un batch de 50 = rythme normal.

3. **Re-soumettre le sitemap toutes les semaines "pour accélérer".**
   Google note les re-submits rapprochés comme un signal négatif.
   Un submit par sitemap, puis laisser vivre.

4. **Ajouter des backlinks "pour aider".** Le trust domaine monte
   suffisamment vite pour l'indexation (Partie 2). Budget backlinks
   réservé à la phase ranking post-indexation.

5. **Partir en sur-optimisation canonical/sitemap/robots.txt au
   moindre doute.** 95% du technique est déjà bon. Une URL www dans
   l'index ne justifie pas de réécrire le routing.

6. **Tester la SERP Google à J+7 pour juger.** Le rank suit
   l'indexation avec un lag de plusieurs semaines. Regarder la SERP
   avant J+30 = prendre des décisions sur du bruit.

7. **Croire qu'un écart entre GSC et `site:leguideauditif.fr` est
   un bug.** La commande `site:` retourne un échantillon estimé,
   pas un chiffre fiable. Ne trancher QUE sur GSC.

8. **Ajouter du schema markup / Core Web Vitals / anchor text
   pour "se rassurer".** Aucune de ces actions n'est rattachée à
   une conclusion du diagnostic. Les intégrer à ce plan sans
   justification = rentrer dans la case anti-pattern.

---

## Règle de gouvernance pour S16-S17

Toute proposition d'action SEO dans les 14 prochains jours doit être
soit listée Section 2 (on le fait), soit listée Section 3 (on ne le
fait pas), soit refusée. Si quelqu'un propose une action qui n'y
figure pas, la question est : "où est-ce dans le plan, et si ce n'est
pas dans le plan, quelle conclusion du diagnostic la justifie ?"
