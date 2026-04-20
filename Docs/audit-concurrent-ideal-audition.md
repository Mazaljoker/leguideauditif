---
title: "Audit SEO concurrent — ideal-audition.fr"
date: 2026-04-20
auteur: Franck-Olivier / Pipeline LGA
sources: DataForSEO (domain_rank, ranked_keywords, backlinks_summary, backlinks_anchors, historical, relevant_pages, domain_intersection, lighthouse), WebFetch
---

# Audit SEO complet — ideal-audition.fr (FR)

## Executive summary

Ideal Audition est un **réseau d'audioprothésistes indépendants** avec 93 centres en France. Chiffres avril 2026 : **24 123 ETV/mois**, 1 604 keywords rankés, 459 referring domains. Petit acteur du top 8, mais **pos 1 sur "appareils auditifs" (27 100 vol)** et compétitif sur le cluster symptômes ORL.

**3 forces**
1. **Pos 1 sur "appareils auditifs" (27 100 vol) + "nettoyage oreille" (8 100)** — 2 requêtes massives sur la page `/appareil-auditif` et `/nos-conseils/bien-laver-ses-oreilles`.
2. **Pages produits marques** — structure `/appareil-auditif/{marque}/{modele}` (ex: Signia Pure Charge Go 7IX pos 1). Monétisation produits différenciée.
3. **Cluster "oreille bouchée"** — pos 1 sur "oreille bouchée que faire" (5 400) et "oreille bouchée" (4 400). Page `/nos-conseils/que-faire-en-cas-doreilles-bouchees` = 4 945 ETV.

**3 faiblesses critiques**
1. **Tendance -41 % keywords en 5 mois** (2 726 en nov 2025 → 1 604 en avril 2026). Perte ETV -6 %. Signal pénalité algorithmique.
2. **Lighthouse Best Practices : 58/100** (CRITIQUE — plus bas score observé sur les 8 concurrents). Probable CSP manquant, cookies tiers non sécurisés.
3. **Total byte weight : 18,2 MB** (massive) — homepage très lourde. Impact mobile seniors direct.

---

## 1) Autorité & volume organique

### Snapshot avril 2026 (France)

| Métrique | Valeur | Lecture |
|----------|:------:|---------|
| Mots-clés rankés | **1 604** | Modeste |
| ETV (trafic estimé) | **24 123 / mois** | Top 6 |
| Positions 1 | 110 | |
| Positions 2-3 | 100 | |
| Positions 4-10 | 306 | |
| Rank domaine DataForSEO | **291** | Fort (vs vivason 345) |

### Tendance 6 mois — DÉCROISSANCE

```
Nov 2025 : 2 726 kw | ETV 24 781
Dec 2025 : 2 625    | ETV 25 642
Jan 2026 : 2 489    | ETV 22 990
Fev 2026 : 2 210    | ETV 22 340
Mar 2026 : 1 868    | ETV 24 243
Avr 2026 : 1 604    | ETV 24 123  (-41 % kw sur 5 mois, ETV résiste)
```

**Perte** : -1 122 keywords en 5 mois. ETV maintenu grâce aux pos 1 générant volume. Même pattern que VivaSon (-55 %), Audika (-11 %), Unisson (-31 %) — **tendance algorithmique systémique sur le secteur**.

---

## 2) Pages stars

| # | URL (chemin) | KW | ETV | Pos-1 |
|---|---|:---:|:---:|:---:|
| 1 | `/nos-conseils/que-faire-en-cas-doreilles-bouchees` | 147 | **4 945** | 4 |
| 2 | `/nos-conseils/bien-laver-ses-oreilles` | 48 | **3 596** | 5 |
| 3 | `/nos-conseils/anatomie-oreille-externe` | 96 | 2 440 | 5 |
| 4 | `/appareil-auditif` | 23 | 1 704 | 1 |
| 5 | `/nos-conseils/otite-sereuse` | 182 | 1 216 | 0 |
| 6 | `/nos-conseils/comment-enlever-des-bouchons-de-cerumen-soi-meme` | 97 | 1 084 | 0 |
| 7 | `/nos-conseils/otospongiose` | 21 | 591 | 5 |
| 8 | `/nos-conseils/casque-anti-bruit-bebe` | 18 | 483 | 0 |
| 9 | `/appareil-auditif/phonak-tout_type-toute_option-haut_de_gamme_des_1200_euros` | 4 | 420 | 1 |
| 10 | `/nos-conseils/bourdonnement-oreille` | 86 | 411 | 0 |
| 11 | `/appareil-auditif/siemens-signia/pure-charge-go-7ix` | 8 | 408 | 6 |
| 12 | `/nos-conseils/misophonie` | 64 | 393 | 2 |
| 13 | `/nos-conseils/hallucination-auditive-que-faire` | 15 | 359 | 1 |
| 14 | `/nos-conseils/bouchon-oreille-pour-moto` | 6 | 256 | 1 |
| 15 | `/nos-conseils/tympan-perce-causes-consequences-traitement` | 45 | 253 | 1 |

### Observations structurelles

- **Architecture `/nos-conseils/` + `/appareil-auditif/{marque}/{modele}`** — structure hybride contenu/catalogue.
- **Pages produits marques détaillées** : Phonak haut de gamme +1200€, Signia Pure Charge Go 7IX. Rare pattern dans le secteur (audika boutique similaire).
- **Niches santé exploitées** : misophonie, hallucination auditive, bouchon oreille pour moto — long-tail bien ciblée.

---

## 3) Top mots-clés positionnés

### Top 20 par ETV

| Rank | Volume | ETV | Keyword | URL (chemin) |
|:---:|:---:|:---:|---|---|
| **1** | **27 100** | **8 238** | **appareils auditifs** | /appareil-auditif |
| 1 | 8 100 | 2 462 | **nettoyage oreille** | /nos-conseils/bien-laver-ses-oreilles |
| 1 | 8 100 | 2 462 | nettoyer oreille | /nos-conseils/bien-laver-ses-oreilles |
| 1 | 5 400 | 1 641 | **oreille bouchée que faire** | /que-faire-en-cas-doreilles-bouchees |
| 1 | 4 400 | 1 337 | **oreille bouchée** | /que-faire-en-cas-doreilles-bouchees |
| 2 | 8 100 | 1 312 | appareils auditif prix | /appareil-auditif |
| 2 | 8 100 | 1 312 | oreille nettoyage | /nos-conseils/bien-laver-ses-oreilles |
| 2 | 8 100 | 1 312 | prix des appareil auditifs | /appareil-auditif |
| 3 | 12 100 | 1 177 | comment déboucher une oreille | /que-faire-en-cas-doreilles-bouchees |
| 4 | 14 800 | 975 | casque anti bruit pour bébé | /casque-anti-bruit-bebe |
| 4 | 14 800 | 975 | otites séreuses | /nos-conseils/otite-sereuse |
| 7 | 33 100 | 847 | audioprothèse | /appareil-auditif |
| 1 | 2 400 | 729 | aide auditive | /appareil-auditif |
| 5 | 14 800 | 694 | oreille bouchée | /que-faire-en-cas-doreilles-bouchees |

**Lecture** : domination du cluster "oreille bouchée / nettoyage oreille" avec 4 pos 1. Page `/appareil-auditif` pos 1 sur kw générique "appareils auditifs" = 8 238 ETV = **pilier trafic**.

---

## 4) Profil backlinks — petit mais propre

### Métriques globales

| Métrique | Valeur | Analyse |
|----------|:------:|---------|
| Total backlinks | 1 902 | Faible |
| Referring domains | **459** | Bon |
| Main domains | 447 | |
| Spam score | 9 | OK |
| Target spam score | 0 (non renseigné) | Bon |
| Links FR | 493 (26 %) | Mixte FR + international |

### Pattern backlinks

| Ancre | BL | # RD | Commentaire |
|---|:---:|:---:|---|
| `https://www.ideal-audition.fr/` | 360 | 13 | URL nue (probablement annuaires) |
| `ideal-audition.fr` | 267 | **139** | Éditorial large (spam score 33 - zone rouge) |
| Ancre vide | 105 | 50 | Images legit |
| `www.ideal-audition.fr` | 95 | 9 | URL nue |
| `site web` | 84 | 3 | Sitewide partenaire |
| `Visit website` | 39 | 1 | Anglais (janvier 2026) |
| `Visitar sitio web` | 32 | 1 | Espagnol .es (janvier 2026) |
| `prendre un rdv` | 51 | 1 | CTA |
| `ideal-audition` | 18 | 16 | Blogs CMS (spam score **61** !) |

### Signal spam modéré

- **18 BL ancre "ideal-audition"** spam score **61** — réseaux blogs .com CMS, apparus mai 2024
- **Zones linguistiques anglais/espagnol** récentes (janvier 2026) — probable soumissions annuaires internationaux (pas forcément spam)

Profil globalement propre par rapport à Unisson ou audibene, mais moins robuste que Audika ou annuaire-audition.

---

## 5) Audit technique (Lighthouse desktop) — CRITIQUE

| Catégorie | Score | Seuil LGA |
|---|:---:|:---:|
| Performance | 81 | 90+ |
| Accessibility | 84 | 95+ |
| **Best Practices** | **58** | 95 (**ZONE ROUGE**) |
| SEO | 92 | 95+ |

### Web Vitals

- FCP : 964 ms (bon)
- LCP : 1 741 ms (bon)
- **CLS : 0,199** (zone orange — seuil Google "Needs Improvement" >0,1)
- TBT : 25 ms (excellent)
- **Interactive : 4 119 ms** (lent)
- **Total byte weight : 18,2 MB** (**CATASTROPHIQUE**)

### Stack

Hébergement CDN Azure + Google Tag Manager + Bing Ads + Facebook + Google Ads + Google Analytics + **CookieYes** (CMP) + **cywyc.fr** (tracking).

**Lecture** : 18,2 MB homepage = drame pour audience seniors mobile. Best Practices 58 suggère : cookies tiers non SameSite, CSP absent, images non optimisées, HTTP errors. Vulnérabilité triple (perf + sécurité + CWV).

---

## 6) Keyword gap vs LGA

**20 requêtes où Ideal Audition est top 10 et LGA absent** (volume cumulé ~105 000/mois) :

### Tier 1 — Gros volume santé + marques

| Keyword | Volume | Pos Ideal | CPC |
|---|:---:|:---:|:---:|
| **casque anti bruit bébé** | 14 800 | 7 | 0,23 € |
| **otite séreuse** | 14 800 | 6 | 0,32 € |
| bourdonnement oreille | 12 100 | 10 | 0,64 € |
| otospongiose | 9 900 | 10 | 0,59 € |
| **appareils auditif prix** | 8 100 | 2 | 1,12 € |
| **nettoyage oreille** | 8 100 | **1** | 0,84 € |
| déboucher l'oreille | 6 600 | 3 | 0,43 € |
| **phonak** | 5 400 | 4 | 1,61 € |
| **oreille bouchée que faire** | 5 400 | **1** | 0,48 € |
| **oreille bouchée** | 4 400 | **1** | 0,97 € |
| **oticon** | 2 900 | 4 | 1,23 € |
| **starkey** | 2 400 | 4 | 1,79 € |
| sensation oreille bouchée | 2 900 | 4 | 1,18 € |
| hallucination auditive | 2 900 | 5 | 0,46 € |

### Lecture stratégique

Ideal Audition rank **top 4-5 sur les marques fabricants** (Phonak 5 400, Oticon 2 900, Starkey 2 400) via leurs pages produits `/appareil-auditif/{marque}`. C'est une réplique directe de la stratégie LGA catalogue.

**Chevauchement avec les opportunités déjà identifiées** : phonak, oticon, starkey (cf. gap audibene déjà documenté). Double confirmation du pattern.

---

## 7) E-E-A-T & on-page (WebFetch homepage)

### Title / Meta / H1

- **Title** : *"Aides auditives premium à prix enfin accessibles ! - Ideal Audition"* (68 chars, commercial)
- **H1** : *"La solution auditive INVISIBLE..."* (très commercial, pas clair)
- **H2** : 6 H2 — Marques, Avis patients, Recommandations, Sélection, Accessible, Pourquoi choisir

### Trust signals

- **93 centres en France**
- **Garantie 4 ans**
- **Essai gratuit 1 mois sur 2 modèles**
- Avis clients section "Nos patients en parlent"
- Logos marques (Signia, Starkey)

### Gaps E-E-A-T

1. **Aucun schema.org** détecté
2. **Pas d'auteur identifié** sur les 15 pages top-trafic
3. **H1 et Title trop commerciaux** pour YMYL ("prix accessibles !", "INVISIBLE")
4. **Best Practices 58/100** = signaux techniques santé YMYL faibles

---

## 8) Opportunités concrètes pour LGA

### Priorité 1 — Concurrencer sur "appareils auditifs" (27 100 vol)

Ideal Audition pos 1 avec page `/appareil-auditif` simple. LGA catalogue + comparatif top 6 2026 avec signature Franck-Olivier peut dépasser.

### Priorité 2 — Cluster "oreille bouchée" (40 k+ vol cumulé)

3 pos 1 à prendre : "oreille bouchée que faire" (5 400), "oreille bouchée" (4 400), "nettoyage oreille" (8 100). Guide LGA consolidé + arbre décisionnel + schema MedicalWebPage.

### Priorité 3 — Pages produits marques (réplique stratégie)

Ideal a pattern `/appareil-auditif/{marque}/{modele}`. LGA a `/catalogue/aides-auditives/`. On peut structurer notre catalogue pour matcher les requêtes "Phonak Sphere", "Signia Silk IX", etc.

### Priorité 4 — Baisse -41 % = fenêtre

Même logique que VivaSon/Unisson. Surveiller mensuellement leurs 15 top pages, préparer des guides LGA de remplacement sur les requêtes qui se libèrent.
