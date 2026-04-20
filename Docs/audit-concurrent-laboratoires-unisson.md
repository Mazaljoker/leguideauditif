---
title: "Audit SEO concurrent — laboratoires-unisson.com"
date: 2026-04-20
auteur: Franck-Olivier / Pipeline LGA
sources: DataForSEO (domain_rank, ranked_keywords, backlinks_summary, backlinks_anchors, historical, relevant_pages, domain_intersection, lighthouse), WebFetch
priority: ADVERSAIRE STRATÉGIQUE PRINCIPAL
---

# Audit SEO complet — laboratoires-unisson.com (FR)

## Executive summary

**Laboratoires Unisson est le vrai concurrent stratégique de LGA en 2026**. Contrairement aux annuaires (annuaire-audition, 1001audios, mon-centre-auditif) et aux acteurs B2B2C (audibene), Unisson est un **réseau d'audioprothésistes indépendants avec un corpus éditorial santé ORL qui monopolise les Featured Snippets commerciaux**.

**Chiffres clés avril 2026** :
- **ETV : 111 338 / mois** (supérieur à Audika !)
- **3 704 keywords rankés**
- **345 pos-1** (bien que moins qu'audika 555, meilleure conversion positions)
- **932 referring domains**
- **FS sur "prix appareil auditif 2026" + "meilleur appareil auditif 2026"** (confirmé sur notre audit SERP audibene)

**3 forces majeures**
1. **Corpus FAQ YMYL santé ultra-profond** — 15 pages top ETV sur bouchon oreille (7 483), otite séreuse (5 893), douleur mâchoire (5 176), otite remède naturel (4 523), cristaux oreille (3 661), oreille qui siffle (3 140).
2. **Monopole Featured Snippets** — table marques/modèles reconnue comme standard par Google sur requêtes commerciales top.
3. **Stack moderne optimisé** — WordPress + Cloudflare + WP Rocket + Imagify + React. Lighthouse Perf 95/100, LCP 1,41 s.

**3 faiblesses critiques (exploitables LGA)**
1. **Profil backlinks toxique** — **au moins 611 backlinks spam Telegram** avec spam scores 24-81 (@SEO_ANOMALY 190, @SEO_CARTEL 165, @BHS_LINKS 141, @SALESOVEN 85, @MASSLINKER 30). Risque Google SpamBrain majeur.
2. **Tendance baissière SÉVÈRE** : -30 % kw en 5 mois (5 347 en déc 2025 → 3 704 en avril 2026). Pénalité algorithmique probable en cours.
3. **E-E-A-T cosmétique** — pas d'auteur identifié sur les 15 pages top trafic, pas de credentials audioprothésistes nominatifs. Certification "Positive Company" floue.

---

## 1) Autorité & volume organique

### Snapshot avril 2026 (France)

| Métrique | Valeur | Lecture |
|----------|:------:|---------|
| Mots-clés rankés | **3 704** | Top 3 secteur (vs audika 4 210) |
| ETV (trafic estimé) | **111 338 / mois** | **N°1 des 6 concurrents audités** |
| Positions 1 | 345 | 2,2× audika en ratio (345/3704 = 9,3 % vs audika 555/4210 = 13 %) |
| Positions 2-3 | **549** | |
| Positions 4-10 | 1 206 | |
| Positions 11-30 | 812 | |
| Coût trafic payant équiv. | 68 968 €/mois | |
| Rank domaine DataForSEO | **284** | Très fort |

### Tendance 6 mois (historical_rank_overview) — ALERTE BAISSE

```
Nov 2025 : 5 239 kw | ETV 118 834
Dec 2025 : 5 347    | ETV 118 223
Jan 2026 : 5 264    | ETV 129 937   <- PIC ETV
Fev 2026 : 4 658    | ETV 124 535   (-12 % kw)
Mar 2026 : 4 125    | ETV 111 546   (-11 % kw, -10 % ETV)
Avr 2026 : 3 704    | ETV 111 338   (-10 % kw, stable ETV)
```

**Lecture critique** : perte de **1 643 keywords en 5 mois** (-31 %). ETV maintient grâce à une concentration sur les top positions, mais signal algorithmique très fort. **Hypothèse prioritaire** : pénalité Google liée au profil backlinks toxique Telegram (cf. §4). À surveiller avril-mai pour confirmer mouvement.

---

## 2) Pages stars (concentration YMYL santé)

| # | URL (chemin) | KW | ETV | Pos-1 |
|---|---|:---:|:---:|:---:|
| 1 | `/faq/audition/bouchon-oreille` | 109 | **7 483** | 10 |
| 2 | `/faq/audition/comment-guerir-dune-otite-sereuse` | 43 | **5 893** | 4 |
| 3 | `/faq/audition/douleur-a-la-machoire-et-a-loreille-quelles-causes-possibles` | 118 | **5 176** | 15 |
| 4 | `/faq/audition/otite-remede-naturel` | 95 | 4 523 | 9 |
| 5 | `/actualites/comment-remettre-en-place-les-cristaux-de-loreille-interne` | 28 | 3 661 | 8 |
| 6 | `/faq/audition/oreille-qui-siffle` | 63 | 3 139 | 8 |
| 7 | `/actualites/echelle-des-decibels-comment-mesurer-le-bruit` | 164 | 3 135 | 1 |
| 8 | `/faq/audition/oreille-qui-gratte` | 49 | 3 131 | 14 |
| 9 | `/faq/audition/bourdonnement-dans-les-oreilles-que-faire` | 89 | 2 819 | 1 |
| 10 | `/faq/audition/l-otite-est-elle-contagieuse` | 23 | 2 813 | 9 |
| 11 | `/faq/appareillage-auditif/sonotone` | 5 | 2 789 | 1 |
| 12 | `/actualites/auriculotherapie-quels-bienfaits` | 15 | 2 686 | 1 |
| 13 | `/faq/audition/bouton-dans-loreille-quand-sinquieter-et-que-faire` | 56 | 2 613 | 18 |
| 14 | `/faq/technique/manoeuvre-de-valsalva` | 13 | 2 386 | 2 |
| 15 | `/faq/audition/acouphenes-quels-traitements-naturels` | 45 | 2 235 | 3 |

### Observations structurelles

- **Format `/faq/{cluster}/{question}`** = structure FAQ-driven, idéale pour Featured Snippets (Google privilégie le format Q/R). C'est leur arme secrète.
- **Clusters dominants** : otite (4 pages), acouphènes/bourdonnement (3 pages), oreille symptômes (4 pages), appareillage (2 pages).
- **Long-tail médical** : ils couvrent des requêtes nichées que personne d'autre ne traite ("bouton dans l'oreille", "manœuvre de Valsalva", "oreille qui gratte", "auriculothérapie bienfaits").

---

## 3) Top mots-clés positionnés

### Top 20 par ETV

| Rank | Volume | ETV | Keyword | URL (chemin) |
|:---:|:---:|:---:|---|---|
| 1 | 14 800 | 4 499 | otite séreuse | /faq/audition/otite-sereuse |
| 1 | 8 100 | 2 462 | acouphène traitement | /faq/audition/acouphenes-traitements-naturels |
| 1 | 8 100 | 2 462 | **sonotone** | /faq/appareillage-auditif/sonotone |
| 2 | 14 800 | 2 397 | auriculothérapie | /actualites/auriculotherapie |
| 2 | 14 800 | 2 397 | cristaux oreilles | /actualites/cristaux-oreille-interne |
| 1 | 6 600 | 2 006 | cristaux interne oreille | /actualites/cristaux-oreille-interne |
| 1 | 6 600 | 2 006 | eczéma oreille | /actualites/eczema-oreille |
| 1 | 6 600 | 2 006 | otite contagion | /faq/audition/otite-contagieuse |
| 2 | 12 100 | 1 960 | bourdonnement dans les oreilles | /faq/audition/bourdonnement-oreilles |
| 3 | 18 100 | 1 761 | bouchons aux oreilles | /faq/audition/bouchon-oreille |
| 1 | 5 400 | 1 641 | douleur oreille mâchoire | /faq/audition/douleur-machoire-oreille |
| 5 | 33 100 | 1 552 | audioprothèse | / |
| 4 | 22 200 | 1 463 | otite symptome | /faq/audition/otite-moyenne |
| 3 | 14 800 | 1 440 | cristaux dans les oreilles | /actualites/cristaux-oreille-interne |

**Concentration YMYL santé** : sur les 20 top kw, **18 sont des pathologies ORL** (otite, cristaux, acouphène, bouchon, eczéma, douleur). Corpus éditorial 100 % tourné santé.

---

## 4) Profil backlinks — TOXIQUE RÉCENT

### Métriques globales

| Métrique | Valeur | Analyse |
|----------|:------:|---------|
| Total backlinks | 4 331 | Modéré |
| Referring domains | **932** | Bon volume (proche audika 1 031) |
| Main domains | 867 | |
| Spam score | 17 | **Attention — zone rouge** |
| Spam score cible | 2 | Moyenne OK |
| Links FR-based | 2 772 (64 %) | Majoritairement FR |
| Links section (éditorial) | 2 354 | Dominant éditorial |

### Pattern toxique : 611+ backlinks spam Telegram/SEO

**Signal d'alarme majeur** — campagne massive de spam backlinks détectée :

| Ancre spam | BL | # RD | Spam score | Date apparition |
|---|:---:|:---:|:---:|---|
| `TELEGRAM @SEO_ANOMALY - SEO BACKLINKS, BLACK-LINKS` | **190** | 97 | 60 | août 2025 |
| `@SEO_CARTEL IN TELEGRAM – SEO BACKLINKS, BULK LINK POSTING` | **165** | 45 | 29 | novembre 2025 |
| `TG @BHS_LINKS - BEST SEO LINKS` | **141** | 41 | **81** | avril 2026 |
| `🍪 TELEGRAM @SALESOVEN | ACCESS TO HACKED SITES FOR SEO` | **85** | 28 | février 2026 |
| `TELEGRAM @MASSLINKER | SOFTWARE TO PUBLISH BACKLINKS YOURSELF` | **30** | 26 | janvier 2026 |

**Total spam identifié** : **611 backlinks** répartis sur 237 domaines avec spam scores 24-81. Tous apparus entre août 2025 et avril 2026 — campagne agressive en cours.

**Interprétation** : profil typique d'une attaque SEO négative OU d'une campagne black-hat volontaire. Google **SpamBrain** détecte ce pattern avec une grande précision depuis 2024. La **baisse de -31 % de keywords en 5 mois** corrèle temporellement avec l'apparition de ces spams.

### Pattern caché additionnel

| Ancre | BL | # RD | Lecture |
|---|:---:|:---:|---|
| `site web` | 921 | 1 | Sitewide partenaire |
| `prendre un rdv` | 849 | 1 | Sitewide CTA |
| `laboratoires-unisson` | 227 | 156 | Éditorial (mais spam score 58 — suspect) |
| `laboratoires-unisson.com` | 53 | 49 | Éditorial (spam score 48 — suspect) |

**Profil propre estimé hors sitewide + spam** : ~2 000 BL sur ~600 RD réellement éditoriaux. C'est du volume correct mais bien inférieur à l'apparence.

---

## 5) Audit technique (Lighthouse desktop)

| Catégorie | Score | Seuil LGA |
|---|:---:|:---:|
| Performance | 95 | 90+ |
| Accessibility | 90 | 95+ |
| **Best Practices** | **77** | 95 (faible !) |
| **SEO** | **100** | 95+ |

### Web Vitals (desktop, throttling simulé)

- **FCP** : 627 ms (excellent)
- **LCP** : 1 412 ms (bon)
- **CLS** : 0,001 (quasi parfait)
- **TBT** : 49 ms (excellent)
- **Interactive** : 4 410 ms (lent — probable JS React)
- **Total byte weight** : 3,5 MB (plus lourd qu'Audika mais acceptable)

### Stack technique

WordPress + **React** + **WP Rocket** (Remove Unused CSS, Delay JS) + **Imagify** (conversion WebP) + Cloudflare + Google Fonts + **imgix** + **axept.io** (CMP RGPD) + YouTube embeds + Google Ads.

**Lecture** : optimisation WordPress professionnelle (WP Rocket + Imagify + Cloudflare). React sur WordPress est un choix hybride probablement pour le quiz interactif. Best Practices à 77 suggère des problèmes de sécurité (CSP manquant ?) ou de cookies tiers.

---

## 6) Keyword gap vs LGA

**20 requêtes où Unisson est top 10 et LGA absent** (volume cumulé ~320 000/mois) :

### Tier 1 — Très gros volume YMYL

| Keyword | Volume | Pos Unisson | CPC |
|---|:---:|:---:|:---:|
| **labyrinthique** (pathologie oreille interne) | **60 500** | 9 | 0,13 € |
| roger on | 33 100 | 6 | 0,33 € |
| otite symptome | 22 200 | 4 | 0,25 € |
| bouchons aux oreilles | 18 100 | 3 | 1,05 € |
| bouchon oreille | 18 100 | 4 | 1,05 € |
| trompe d'Eustache | 14 800 | 10 | 0,69 € |
| **otite séreuse** | 14 800 | **1** | 0,32 € |
| cristaux oreille | 14 800 | 3 | 0,23 € |
| auriculothérapie | 14 800 | 2 | 0,64 € |
| oreille qui siffle | 12 100 | 5 | 0,75 € |
| sifflement oreille | 12 100 | 3 | 0,75 € |
| bourdonnement oreille | 12 100 | 7 | 0,64 € |
| oreille qui bourdonne | 12 100 | 4 | 0,64 € |
| comment déboucher une oreille | 12 100 | 10 | 0,51 € |
| oreille gauche qui siffle | 9 900 | 6 | 1,82 € |
| decibel | 9 900 | 10 | 0,62 € |
| oreilles gauche qui sifflent | 9 900 | 8 | 1,82 € |
| oreille en chou fleur | 8 100 | 8 | 0 € |
| oreille interne | 8 100 | 4 | 0,57 € |
| **sonotone** | **8 100** | **1** | 1,21 € |

### Cas unique — "labyrinthique" à 60 500 vol

Keyword énorme (60 500/mois), kw difficulty faible (1/100), Unisson en pos 9. **Un guide LGA avec signature Franck-Olivier + lien presbyacousie/vertiges peut facilement atteindre top 3**. 1er coup à jouer.

---

## 7) E-E-A-T & on-page (WebFetch homepage)

### Title / Meta / H1

- **Title** : *"Santé auditive : Appareil auditif et prothèse auditive Moins Cher jusqu'à -40% | Unisson"* (89 chars, trop long — coupé sur SERP)
- **H1** : *"Unisson : Des audioprothésistes d'excellence et les appareils auditifs au meilleur prix"* (87 chars, aligné title)
- **H2** : "Audioprothésistes de confiance", "Nos appareils", "Trouvez votre centre", "Test auditif en ligne", "Quiz Quel appareil", "Prix de nos aides auditives"

### Trust signals

- **97 % patients satisfaits** (vs audika 9,1/10 sur 199 k avis → Unisson plus opaque)
- **20 000+ patients** (10× moins qu'audika)
- **Certification "Positive Company"** (douteux — pas un label santé reconnu)
- 12+ marques partenaires (Signia, Widex, Phonak, Oticon)
- 20 ans d'expertise
- Quiz "Quel appareil vous convient" (outil lead gen)
- Test auditif en ligne

### Gaps E-E-A-T exploitables

1. **Aucun schema.org visible** (pas de JSON-LD sur homepage)
2. **Pas d'auteur identifié** sur les 15 pages top-trafic FAQ santé
3. **Signature "Positive Company"** = certification RSE généraliste, pas un label santé (ISO, HON Code, ANSSI) — vulnerable à la comparaison LGA/ADELI/DE
4. **Aucune mention Cass. Nationale Audioprothésiste** ou ordre professionnel
5. **Title et H1 trop commerciaux** pour YMYL ("-40 %", "Moins Cher") — Google Helpful Content dévalorise les signaux trop promotionnels sur santé

---

## 8) Le vrai danger : les Featured Snippets commerciaux

### SERP déjà audité (cf. audit audibene)

| Requête | Volume | Position Unisson | Format |
|---|:---:|:---:|---|
| prix appareil auditif 2026 | élevé | **1 (FS)** | Featured Snippet description |
| meilleur appareil auditif 2026 | élevé | **1 (FS)** | Featured Snippet **TABLE** marques/modèles |

**Format gagnant** — la table Signia/Starkey/Widex/Signia dans le FS est reproduite dans les PAA Google. C'est du contenu structuré que Google adore servir aux seniors.

### Reconquête LGA possible

1. Reproduire une table **meilleure** (nos 6 flagships 2026 = Phonak Sphere + Signia IX + Oticon Intent + Starkey Genesis + Widex Allure + Resound Vivia).
2. Ajouter une colonne "note expert Franck-Olivier" (différenciateur irréplicable).
3. Placer en ATF avec schema `HowTo` + `FAQPage`.
4. Cibler aussi "meilleur appareil auditif 2026", "prix appareil auditif 2026" dans nos titles.

---

## 9) Plan d'action LGA — reconquête stratégique

### Priorité 1 (immédiat) — Featured Snippets commerciaux

Le **seul terrain où Unisson nous dépasse est les FS commerciaux**. Nous devons :
1. Reproduire le format table modèles/marques sur `/meilleur-appareil-auditif-2026/`
2. Ajouter schema `HowTo` ou `FAQPage` pour éligibilité FS
3. Lancer schema audit complet du classement Top 6 LGA

### Priorité 2 — Contenu FAQ YMYL sur "labyrinthique" (60 500 vol)

Guide LGA dédié avec signature Franck-Olivier, bibliographie HAS, lien vers audioprothésiste compétent. Pipeline GAN double gate. Cible : top 3 en 3 mois.

### Priorité 3 — Opportunité pénalisation Unisson

Si la baisse continue (-31 % kw en 5 mois), les positions 1-5 d'Unisson sur 345 pos-1 vont se libérer progressivement. **Surveiller mensuellement** les 15 top pages Unisson (bouchon oreille, otite séreuse, douleur mâchoire, etc.) et préparer des guides LGA de remplacement prêts à publier.

### Priorité 4 — Ne PAS reproduire leur stratégie backlinks spam

Les 611 BL Telegram toxiques sont un repoussoir. Rester sur profil propre LGA (Athuil vague 2, francemedicale, blogs seniors, institutions audiologie — cf. synthèse).

### Priorité 5 — Schema.org avantage instantané

Unisson n'a **aucun schema** visible. LGA avec schema complet (MedicalOrganization + Person auteur + MedicalWebPage + FAQPage + HowTo + Review/AggregateRating + LocalBusiness) → avantage Google rich snippets immédiat.

---

## Annexe — sources et limitations

### Sources DataForSEO utilisées

- `dataforseo_labs_google_domain_rank_overview` — FR/fr
- `dataforseo_labs_google_ranked_keywords` — 30 top ETV, rank<=10
- `dataforseo_labs_google_historical_rank_overview` — 6 mois
- `dataforseo_labs_google_relevant_pages` — 15 top ETV
- `dataforseo_labs_google_domain_intersection` — vs leguideauditif.fr, rank<=10
- `backlinks_summary` + `backlinks_anchors` — profil BL + détection spam
- `on_page_lighthouse` — perf desktop
- WebFetch homepage

### Coût estimé

~0,13 € (11 appels DataForSEO).

### Limitations

- SERP mobile non re-audité (utilisation des données audit audibene : FS confirmés sur 2/3 requêtes commerciales).
- LLM mentions API non accessible (upgrade requis pour GEO).
- CrUX real user metrics à croiser via PageSpeed API.
