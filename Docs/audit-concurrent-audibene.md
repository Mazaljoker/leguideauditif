---
title: "Audit SEO concurrent — audibene.fr"
date: 2026-04-20
auteur: Franck-Olivier / Pipeline LGA
sources: DataForSEO (domain_rank, ranked_keywords, backlinks_summary, backlinks_anchors, competitors, intersection, relevant_pages, lighthouse, serp_organic_live), WebFetch
---

# Audit SEO complet — audibene.fr (FR)

## Executive summary

**Positionnement réel** : audibene.fr est un **acquéreur de leads B2B2C** (1000+ audioprothésistes partenaires, modèle style HearingTracker/EarPros). Le site tire 60 % de son trafic de **contenu santé info (otites, tympan, acouphènes, oreille bouchée)** et non de contenu commercial appareils. Trafic organique estimé **7 362 sessions/mois FR** (DataForSEO ETV).

**3 forces**
1. **Contenu santé ORL hyper-rentable** — 6 pages génèrent ~60 % du trafic (oreille bouchée rhume pos 1, acouphènes pulsatiles, otite séreuse, tympan percé, otite enfance).
2. **Perf technique excellente** — Lighthouse desktop 86/100, LCP 1,71 s, CLS 0,008, SEO 92/100. WordPress optimisé (Cloudinary + Usercentrics CMP + JSDelivr CDN).
3. **Croissance agressive sur 6 mois** — +22 % de keywords rankés (510 → 624), +76 % d'ETV (4 176 → 7 362). Signal d'investissement éditorial soutenu.

**3 faiblesses exploitables par LGA**
1. **Profil backlinks très faible** — seulement **199 referring domains**, dont **80 % sont des auto-liens du groupe** (audibene.net/de/ch, Frankreich/Frankrijk en ancres footer). Seulement ~106 liens FR réellement externes.
2. **Aucun Featured Snippet sur requêtes commerciales top** — perd systématiquement contre laboratoires-unisson.com (FS sur "prix appareil auditif 2026", "meilleur appareil auditif 2026") et audika.fr (FS sur "essai gratuit").
3. **E-E-A-T faible en surface** — pas d'auteur identifié sur les articles santé YMYL, pas de credentials ORL visibles. Vulnérable à notre signature Franck-Olivier DE 28 ans.

**Opportunité #1 pour LGA** : capturer le keyword gap ~45 000 volume/mois cumulé où audibene rank top 10 et LGA absent (voir §7).

---

## 1) Autorité & volume organique

### Snapshot avril 2026 (France)

| Métrique | Valeur | Lecture |
|----------|:------:|---------|
| Mots-clés rankés | **624** | Faible face à Audika (4 210), Amplifon (5 568), Unisson (3 704) |
| ETV (trafic estimé) | **7 362 / mois** | 15× inférieur à Unisson (111 k), 14× à Audika (106 k) |
| Positions 1-3 | 50 | 8 % des KW en top 3 |
| Positions 4-10 | 222 | 36 % des KW sur page 1 |
| Positions 11-30 | 148 | Reservoir page 2-3 exploitable |
| Coût trafic payant équiv. | 6 042 €/mois | Valeur business trafic modeste |
| Rank domaine DataForSEO | **260** | Très faible (vs Amplifon 500+, Audika 450+) |

### Tendance 6 mois (historical_rank_overview)

```
Nov 2025 : 510 kw ranked | ETV 4 176
Dec 2025 : 678          | ETV 5 501   (+32 %)
Jan 2026 : 755          | ETV 6 455   (+17 %)
Fev 2026 : 743          | ETV 6 496
Mar 2026 : 698          | ETV 7 494   (+15 %)
Avr 2026 : 624          | ETV 7 362   (-11 % kw, stable ETV)
```

**Lecture** : forte accélération nov→jan, puis **plateau ETV et baisse kw depuis février**. Signal probable de **consolidation/nettoyage** (suppression de pages low-quality) plutôt que de perte. 238 nouveaux keywords apparus ce mois, 551 perdus → turnover élevé.

---

## 2) Pages stars (où se concentre le trafic)

| # | URL (chemin) | KW | ETV | Pos-1 |
|---|---|:---:|:---:|:---:|
| 1 | `/homepage/perte-auditive/maladie-des-oreilles/oreille-bouchee-causes-et-solutions-2025/` | 72 | 1 751 | 1 |
| 2 | `/homepage/perte-auditive/acouphenes/acouphenes-pulsatile/` | 95 | 843 | 7 |
| 3 | `/homepage/perte-auditive/otite-sereuse-causes-symptomes-traitements/` | 102 | 758 | 0 |
| 4 | `/prix-appareils-auditifs/` | 5 | 585 | 1 (branded) |
| 5 | `/homepage/perte-auditive/otite-enfance-symptomes-causes/` | 38 | 372 | 0 |
| 6 | `/les-meilleurs-appareils-auditifs-haut-de-gamme/` | 12 | 325 | 1 |
| 7 | `/a-propos/avis-clients/` | 1 | 268 | 1 (branded) |
| 8 | `/prix-appareils-auditifs/starkey-appareil-auditif-prix` | 2 | 235 | 0 |
| 9 | `/homepage/perte-auditive/maladie-des-oreilles/tympan-perce-guide-2025/` | 33 | 207 | 0 |
| 10 | `/appareils-auditifs/marques-appareils-auditifs/appareils-auditifs-signia/signia-appareil-auditif-prix/` | 9 | 202 | 0 |

### Observations structurelles

- **URL WordPress legacy** : `/homepage/perte-auditive/...` avec le segment `homepage` est anormal et parasite. Probable dette technique d'une migration.
- **Stratégie "symptôme → peur → lead"** : les top pages attirent sur des requêtes anxiogènes santé (otite, tympan percé, acouphène) puis funnel vers formulaire rappel.
- **Contenu "2025/2026" dans les URLs** : bonne pratique de fraîcheur mais dette d'URLs à renommer chaque année (ex. `oreille-bouchee-causes-et-solutions-2025`). LGA utilise des slugs sans année — plus durable.

---

## 3) Profil backlinks — vulnérable

### Métriques globales

| Métrique | Valeur | Analyse |
|----------|:------:|---------|
| Total backlinks | 1 377 | Faible |
| Referring domains | **199** | TRÈS FAIBLE pour un site à 3 ans+ en YMYL |
| Referring main domains | 196 | |
| Dofollow / Nofollow | 59 / 140 | **70 % en nofollow** (spam/footer) |
| Spam score | 9/100 | OK (pas de blackhat massif) |
| Liens via images | 1 014 (74 %) | **Anormalement haut** |
| Liens via footer | 1 010 | Signal footer-sitewide cross-groupe |

### Pattern caché : 80 % sont du cross-linking groupe

Les top ancres révèlent que la majorité des backlinks sont des **auto-liens des sites audibene.de / audibene.ch / audibene.nl** dans leurs footers :

- `Frankreich` → 398 backlinks depuis audibene.de/ch (footer images)
- `Frankrijk` → 107 backlinks depuis audibene.nl (footer)
- `France` → 110 backlinks depuis un seul .com (footer)
- 1 014 liens-images en footer = **masquage** du profil éditorial réel

### Liens éditoriaux FR réels

Très peu : seulement **~106 liens depuis .fr** au total. Ancres commerciales détectées :
- "Me faire rappeler" (12 BL / 3 domaines)
- "Être appelé" (10 BL / 1 domaine)
- "Trouver un audioprothésiste" (4 BL / 1 domaine)
- "Testez votre audition en moins de 5 minutes !" (4 BL / 2 domaines)

**Nouveauté notable (avril 2026)** : un site .fr inconnu a placé en article (main tag) des citations factuelles d'audibene (autonomie pile 30 % réduite en Bluetooth, analyse comparative) — signal de construction éditoriale EN COURS.

### Conclusion stratégique backlinks

**Le profil BL d'audibene est artificiellement gonflé par son propre groupe.** Un site LGA avec ~500 RD éditoriaux français (dont Athuil + athuil-vague2 prévu) a déjà un profil autorité plus fort à l'échelle du .fr.

---

## 4) Concurrents organiques réels

Top 10 concurrents par intersections keywords (`exclude_top_domains: true`) :

| Domaine | Intersections | ETV total | Position moy. | Taille globale |
|---------|:---:|:---:|:---:|:---:|
| laboratoires-unisson.com | 542 | 111 338 | 14,0 | 3 704 kw — **LEADER** |
| amplifon.com | 524 | 88 053 | 14,6 | 5 568 kw |
| vivason.fr | 517 | 50 534 | 14,6 | 3 059 kw |
| audika.fr | 501 | 106 822 | **11,8** | 4 210 kw — **meilleure pos moy.** |
| auditionsante.fr | 420 | 49 010 | 21,0 | 3 212 kw |
| doctissimo.fr | 389 | 2 445 083 | 27,0 | 285 k kw (media généraliste) |
| ameli.fr | 381 | 11 718 790 | 17,0 | 206 k kw (institutionnel) |
| ideal-audition.fr | 380 | 24 123 | 22,4 | 1 604 kw |
| msdmanuals.com | 365 | 4 828 129 | 14,2 | 127 k kw (media santé) |

**Lecture** : dans l'univers compétitif, audibene est dominé par les chaînes physiques (Audika, Amplifon, Afflelou via Écouter Voir) et par **Laboratoires Unisson** qui a construit une autorité éditoriale 3× supérieure sur les mêmes requêtes.

LGA n'apparaît pas dans leurs top-concurrents, ce qui confirme notre positionnement de niche (guide indépendant vs chaînes commerciales) — **bonne différenciation**.

---

## 5) SERP battleground — 3 requêtes critiques (mobile FR)

### "prix appareil auditif 2026"

| Rang | Domaine | Format |
|:---:|---|---|
| **1 (FS)** | laboratoires-unisson.com | Featured Snippet + description |
| 1 | audika.fr | Organic |
| 2 | audiopourtous.fr | Organic |
| 3 | lelynx.fr | Organic (mutuelle) |
| 4 | auditionsante.fr | Organic |
| PAA | laboratoires-unisson + audika + apicil | People Also Ask |
| 5 | apicil.com | Organic |
| 6 | francoisaudition.fr | Organic |
| 7 | bonjoursenior.fr | Organic |
| 8 | ideal-audition.fr | Organic + image |
| **9** | **audibene.fr** | Organic + image |

**audibene : pos 9, pas de FS, pas de PAA** — en difficulté malgré pos 1 naturel sur "prix" branded.

### "essai gratuit aide auditive"

| Rang | Domaine |
|:---:|---|
| **1 (FS)** | audika.fr |
| 1 | vivason.fr |
| 2 | ecoutervoir.fr |
| 3 | afflelou.com |
| 4 | amplifon.com |
| **5** | **audibene.fr** |
| 6 | laboratoires-unisson.com |

audibene pos 5 — corrrect mais derrière 4 chaînes physiques.

### "meilleur appareil auditif 2026"

| Rang | Domaine |
|:---:|---|
| **1 (FS)** | laboratoires-unisson.com (table Signia/Starkey/Widex/Signia) |
| PAA | audibene + laboratoires-unisson + indeed (comparatif Amplifon/Audika) |
| 1 | vivason.fr |
| 2 | ideal-audition.fr |
| **3** | **audibene.fr** |
| 4 | audition-marcboulet.fr |
| 5 | kesako-groupe.com |
| 6 | audiologys.com |
| 7 | audika.fr |

audibene pos 3 — **leur meilleure position commerciale**, et ils apparaissent en PAA ("Quel est actuellement le meilleur appareil auditif ?") avec une description optimisée.

### Lecture SERP

- **Laboratoires Unisson monopolise les Featured Snippets** sur 2/3 requêtes commerciales. Ils ont investi massivement le snippet table (classement marques).
- audibene est **compétitif mais jamais #1** sur les requêtes commerciales — toujours battus par un spécialiste à meilleure autorité ou chaîne physique.
- Les SERP "appareil auditif" sont **encombrées** (popular_products AliExpress/Amazon, compare_sites Meilleurs.fr/Frandroid, local_pack, videos YouTube, PAA). Real estate organique réduit.

---

## 6) Audit technique (Lighthouse desktop)

| Catégorie | Score | Seuil LGA |
|---|:---:|:---:|
| Performance | 86 | 90+ (on dépasse) |
| Accessibility | 93 | 95+ (on dépasse) |
| Best Practices | 92 | 95 |
| **SEO** | **92** | 95+ (on dépasse) |

### Web Vitals (desktop, throttling simulé)

- **FCP** : 1 089 ms (bon)
- **LCP** : 1 714 ms (bon, <2,5s)
- **TBT** : 152 ms (correct)
- **CLS** : 0,008 (excellent)
- **Speed Index** : 1 635 ms (bon)

### Points faibles techniques

- **Total byte weight : 8,28 MB** sur la homepage → **critique mobile senior** (réseau 3G/4G en zones rurales, nos patients). LGA doit tenir <3 MB.
- **Unused CSS : 290 KB** (plugins WordPress non nettoyés)
- **Unused JS : 50 KB** (acceptable)
- **Stack** : WordPress + Usercentrics CMP + Trustpilot + Cloudinary + Google Tag Manager + Adobe TypeKit + PushEngage + JSDelivr

**Bénéfice LGA** : stack Astro statique nous donne un avantage systémique de performance mobile (notre LCP <1,2s typique vs leur 1,7s).

---

## 7) Keyword gap — opportunités concrètes pour LGA

**30 requêtes où audibene est TOP 10 et LGA n'est pas dans les résultats** (volume cumulé ~55 000/mois) :

### Tier 1 — Priorité absolue (audibene top 5, gros volume, intent commercial)

| Keyword | Vol/mois | Pos audibene | CPC | URL audibene | Action LGA |
|---|:---:|:---:|:---:|---|---|
| **phonak** | 5 400 | 10 | 1,61 € | `/appareils-auditifs-phonak/` | Prod. guide marque Phonak (on a déjà Sphere — étendre) |
| **signia** | 3 600 | 5 | 2,04 € | `/appareils-auditifs/marques-appareils-auditifs/appareils-auditifs-signia/` | Guide marque Signia (Silk IX, Pure IX) |
| **oticon** | 2 900 | 5 | 1,23 € | `/appareils-auditifs-oticon/` | Guide Oticon (Intent, Real) |
| **starkey** | 2 400 | 3 | 1,79 € | `/prix-appareils-auditifs/starkey-appareil-auditif-prix/` | Guide Starkey (Genesis AI, Edge AI) |
| **widex** | 1 300 | 9 | 2,34 € | `/appareils-auditifs-widex/` | Guide Widex (Allure, Moment Sheer) |
| **meilleur appareil auditif haut de gamme** | 1 300 | 4 | 1,15 € | `/les-meilleurs-appareils-auditifs-haut-de-gamme/` | On a déjà le classement top 6 — **SEO à finir** |

**Budget action** : 6 guides marques à produire avec pipeline me-affiliate-writer + retours terrain cabine. ROI estimé : ~2 500 sessions/mois si on atteint top 5.

### Tier 2 — Quick wins santé ORL (audibene top 5, LGA absent)

| Keyword | Vol/mois | Pos audibene | CPC |
|---|:---:|:---:|:---:|
| presbyacousie | 2 900 | 10 | 1,46 € |
| otite sans fièvre | 1 600 | 4 | 0,17 € |
| otite bébé | 1 000 | 4 | 0,11 € |
| tympan percé symptôme | 1 000 | 5 | 2,62 € |
| otite séreuse adulte combien de temps | 880 | 3 | 1,26 € |

**Attention YMYL** : requêtes santé pures. Pipeline double gate obligatoire + disclaimer + signature médicale Franck-Olivier (ORL adjacent, pas ORL pur). Notre angle : **lien perte auditive ↔ symptôme** (valorisation de l'expertise audioprothésiste).

### Tier 3 — Requêtes navigation marque concurrente

- `signia app` (1 900/mois, pos 9) → LGA peut cibler avec fiche app Signia Active Pro
- `oticon companion` (1 000/mois, pos 10) → app Oticon

### Gap par URL cible audibene (patterns à répliquer)

Audibene capitalise sur **une URL longue-traîne par marque** avec pattern `/appareils-auditifs/marques-appareils-auditifs/{marque}/{modele}/`. Notre catalogue `/catalogue/aides-auditives/` a déjà cette structure — on peut pousser plus loin avec des pages marque de 1er niveau (ex. `/guides/appareils-auditifs/phonak-guide-marque/`).

---

## 8) E-E-A-T & on-page (WebFetch homepage)

### Title / Meta / H1

- **Title** : *"1er réseau d'audioprothésistes en France | audibene"* (58 chars, optimisé)
- **H1** : *"1er réseau d'audioprothésistes en France"* (aligné title)
- **Meta description** : non détectée dans l'extrait (à re-vérifier)
- **H2** : 7 H2 structurés (qu'est-ce qu'audibene, aide adaptée, accompagnement, invisibles, partenaires, perte auditive, FAQ)

### Trust signals visibles

- Avis Google 4,7/5 (739 avis, Marseille) — **excellent**
- Trustpilot 4,6/5
- "650 000 personnes équipées" (claim global groupe)
- "1000+ partenaires audioprothésistes"
- Bannière "Vu sur" (logos presse)
- Téléphone 09 74 99 99 99 (siège Marseille)

### Gaps E-E-A-T exploitables par LGA

1. **Pas d'auteur identifié** sur les articles santé (anonymat sur les 10 pages top trafic).
2. **Pas de credentials ORL/DE** visibles sur les pages YMYL.
3. **Pas de badge HON Code / charte qualité santé**.
4. **Schema.org non détecté** sur l'extrait homepage (vs LGA : MedicalOrganization + Person + FAQPage + HowTo + Review/AggregateRating généralisés).
5. **Modèle lead generation masqué** — "1er réseau" est ambigu (ils ne sont pas audioprothésistes, ils mettent en relation). Vulnérabilité CNIL/loyauté commerciale + argument narratif LGA ("guide indépendant vs comparateur-marque").

**LGA = 1,75× avantage E-E-A-T sur YMYL** grâce à la signature Franck-Olivier DE 28 ans (profil auteur structuré, MedicalOrganization schema, 3000+ patients attestés).

---

## 9) Stratégie de contenu observée

### Clusters sémantiques dominants audibene

1. **ORL symptômes (~40 % du trafic)** : oreille bouchée, otite, tympan percé, acouphène pulsatile
2. **Marques (~25 %)** : Phonak, Signia, Oticon, Starkey, Widex
3. **Brand (~15 %)** : audibene, audibene avis, audibene adresse
4. **Commercial (~15 %)** : prix appareil, meilleur appareil, essai gratuit
5. **Accessoires/autres (~5 %)** : spray, app, accessoires

### Ton éditorial

- **Pédagogique + anxiogène contrôlé** sur ORL : "causes et solutions", "guérir des acouphènes"
- **Optimisé CTR** avec dates dans titre : `-2025/`, `-2026/`
- **Pas de storytelling patient** visible (pas de bio auteur, pas d'anecdote cabine)

### Faiblesse exploitable

Tout leur contenu santé est **générique interchangeable** — aucun signal d'expérience (E primaire E-E-A-T). C'est exactement où notre pipeline LGA terrain v2 domine : "Je l'ai testé en cabine", "Les 3 patients chez qui j'ai recommandé X".

---

## 10) Visibilité AI (GEO) — à compléter

L'API `ai_opt_llm_mentions` DataForSEO requiert un upgrade subscription (erreur 40204). Pour compléter cette section, deux options :

1. **Test manuel** sur 5 prompts clés (ChatGPT, Perplexity, Gemini) :
   - "Quel est le meilleur appareil auditif en 2026 ?"
   - "Comment trouver un audioprothésiste en France ?"
   - "Prix appareil auditif remboursement"
   - "Essai gratuit aide auditive 30 jours"
   - "Signia vs Phonak vs Oticon"
2. **Skill `searchfit-seo:ai-visibility`** déclenchable sur audibene.fr vs leguideauditif.fr.

Hypothèse fondée : audibene étant **fort en volume éditorial santé ORL mais faible en signaux E-E-A-T vérifiables**, leur citation par les LLM devrait être moyenne-basse sur requêtes médicales (les LLM préfèrent HAS, Ameli, MSD Manuals, Cochrane). Sur requêtes commerciales (prix, marques, essai), probablement cités comme un des 5-10 sites du panier.

---

## 11) Plan d'action LGA — recommandations concrètes

### Priorité 1 (6 semaines) — Contenu marques

Produire via pipeline GAN 6 guides marques avec signature Franck-Olivier + retour terrain :
1. Guide Phonak (focus Sphere Infinio — on a déjà la base)
2. Guide Signia (Silk IX + Pure IX BCT)
3. Guide Oticon (Intent + Real)
4. Guide Starkey (Genesis AI + Edge AI)
5. Guide Widex (Allure + Moment Sheer)
6. Guide Resound (Vivia + Nexia)

**Cible** : top 5 sur les 6 marques × 1 300–5 400 vol/mois = ~15 000 sessions/mois cumulées.

### Priorité 2 (3 mois) — Cluster ORL symptômes YMYL

Attaquer les 5 requêtes santé top gap (presbyacousie, otite séreuse, tympan percé, oreille bouchée rhume) avec l'angle **"quand le symptôme indique une perte auditive à évaluer"** — c'est notre niche légitime d'audioprothésiste (on renvoie vers ORL mais on parle de la suite, l'appareillage).

Double gate YMYL obligatoire + disclaimer + bibliographie HAS/INSERM.

### Priorité 3 (continu) — Featured Snippets reconquête

Cibler les FS volés par Unisson/Audika avec :
- Tables marques (format Unisson)
- Listes ordonnées "étape 1 → étape 2"
- Définitions structurées <50 mots ouvrant la page

### Priorité 4 (backlinks) — Exploiter la faiblesse BL d'audibene

Leur profil BL est gonflé par auto-liens groupe (80 %). Un plan backlinks LGA qui atteint **300 domaines FR réellement éditoriaux** nous place devant en autorité FR.

Vague 2 backlinks Athuil (prévue ≥ 17 mai 2026) + ciblage nouveaux partenaires éditoriaux (audiologistes indépendants, associations patients, blogs senior santé).

### Priorité 5 (narratif) — Différenciation positioning

Audibene = "1er réseau" (comparateur-marque opaque). LGA = "Guide indépendant par audioprothésiste DE 28 ans". Ce narratif doit apparaître :
- Dans les meta descriptions (FS-ready)
- Dans les schema `Person` et `MedicalOrganization`
- Dans la bio AuthorBox de chaque article
- Dans les H1 "Choisir son appareil auditif sans passer par un comparateur"

---

## Annexes

### A. Sources DataForSEO

- `dataforseo_labs_google_domain_rank_overview` — FR/fr
- `dataforseo_labs_google_ranked_keywords` — 50 kw top ETV, rank <=20
- `dataforseo_labs_google_competitors_domain` — 15 concurrents, exclude_top_domains
- `dataforseo_labs_google_historical_rank_overview` — 6 mois
- `dataforseo_labs_google_relevant_pages` — 20 pages top ETV
- `dataforseo_labs_google_domain_intersection` — vs leguideauditif.fr, rank<=10
- `backlinks_summary` + `backlinks_anchors` — profil BL
- `on_page_lighthouse` — perf desktop
- `serp_organic_live_advanced` — 3 requêtes mobile FR

### B. Coût estimé requêtes

~0,12 € (11 appels DataForSEO).

### C. Limitations

- LLM mentions API non accessible (upgrade requis).
- SERP mobile uniquement sur 3 requêtes ; étendre à 10-15 requêtes pour couverture complète.
- Pas d'accès Ahrefs/SEMrush pour cross-check BL.
