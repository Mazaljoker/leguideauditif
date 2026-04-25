---
title: "Audit SEO concurrent — vivason.fr"
date: 2026-04-20
auteur: Franck-Olivier / Pipeline LGA
sources: DataForSEO (domain_rank, ranked_keywords, backlinks_summary, backlinks_anchors, historical, relevant_pages, domain_intersection, lighthouse), WebFetch
---

# Audit SEO complet — vivason.fr (FR)

## Executive summary

VivaSon est un **réseau d'audioprothésistes indépendants** (70 ans d'expérience, 10 537 avis). Chiffres clés avril 2026 : **50 534 ETV/mois** (top 4 des concurrents audités), 3 059 keywords rankés, 739 referring domains, **spam score 2** (excellent).

**3 forces**
1. **Cluster cristaux oreille interne** — pos 1 sur "cristaux oreille" (14 800 vol), page /votre-audition/oreille/cristaux-oreille-interne = 5 408 ETV (meilleure page du site).
2. **Requêtes commerciales top** — pos 1 sur "comment déboucher oreille" (12 100), "appareils auditif prix" (8 100), "audiogramme" (3 600). Pos 2 sur "appareils auditifs" (27 100).
3. **2 auteurs identifiés** : Ruben Krief et Marcel Ben Soussan (rare dans ce secteur — embryon d'E-E-A-T).

**3 faiblesses critiques**
1. **Tendance -55 % keywords en 5 mois** (6 827 en déc 2025 → 3 059 en avril 2026). Chute massive, ETV -24 %. **Pénalité algorithmique probable en cours**.
2. **Profil backlinks ultra-concentré** : **90 % des 42 851 BL sur 4 ancres sitewide** ("Site internet" 13 704 + "Prise de RDV en ligne" 12 037 + "site web" 6 558 + "prendre un rdv" 6 376). Seulement 4 domaines concernés.
3. **CLS désastreux** : 0,325 (seuil rouge Google, vs LGA <0,05). Impact Core Web Vitals direct sur ranking mobile seniors.

---

## 1) Autorité & volume organique

### Snapshot avril 2026 (France)

| Métrique | Valeur | Lecture |
|----------|:------:|---------|
| Mots-clés rankés | **3 059** | Top 5 secteur |
| ETV (trafic estimé) | **50 534 / mois** | Top 4 |
| Positions 1 | 228 | |
| Positions 2-3 | 266 | |
| Positions 4-10 | 696 | |
| Rank domaine DataForSEO | **345** | Fort |

### Tendance 6 mois — CHUTE CRITIQUE

```
Nov 2025 : 6 232 kw | ETV 61 300
Dec 2025 : 6 827    | ETV 66 366  <- PIC
Jan 2026 : 6 235    | ETV 63 313
Fev 2026 : 4 485    | ETV 60 160  (-28 % kw)
Mar 2026 : 3 484    | ETV 50 512  (-22 % kw, -16 % ETV)
Avr 2026 : 3 059    | ETV 50 534  (-12 % kw, stable ETV)
```

**Perte cumulative** : -55 % keywords en 5 mois. Pire baisse observée parmi les 8 concurrents audités. Signal algorithmique probable corrélé au profil BL trop concentré.

---

## 2) Pages stars

| # | URL (chemin) | KW | ETV | Pos-1 |
|---|---|:---:|:---:|:---:|
| 1 | `/votre-audition/oreille/cristaux-oreille-interne` | 27 | **5 408** | 6 |
| 2 | `/votre-audition/oreille/vertige-oreille-interne` | 298 | 3 924 | 8 |
| 3 | `/votre-audition/oreille/bouchee` | 123 | 3 252 | 6 |
| 4 | `/votre-audition/acouphene/acouphenes-pulsatiles` | 148 | 3 028 | 19 |
| 5 | `/nos-appareils-auditifs` | 8 | 2 927 | 3 |
| 6 | `/votre-audition/oreille/os-etrier` | 49 | 2 228 | 10 |
| 7 | `/votre-audition/test-auditif/lire-audiogramme` | 24 | 1 651 | 3 |
| 8 | `/` (homepage) | 9 | 1 399 | 1 |
| 9 | `/votre-audition/maladies-auditives/otalgie` | 74 | 1 359 | 2 |
| 10 | `/votre-audition/maladies-auditives/bouchon-de-cerumen` | 159 | 961 | 1 |
| 11 | `/votre-audition/maladies-auditives/hydrops` | 19 | 879 | 3 |
| 12 | `/votre-audition/maladies-auditives/labyrinthite` | 9 | 816 | 1 |
| 13 | `/votre-audition/perte-auditive/sourd-et-malentendant-quelle-difference` | 31 | 804 | 2 |
| 14 | `/votre-audition/acouphene/hypertension` | 27 | 800 | 10 |
| 15 | `/votre-audition/maladies-auditives/trompes-eustache-bouchees` | 60 | 758 | 0 |

### Observations

- **Structure `/votre-audition/{cluster}/{page}`** — identique Audika (même agence SEO ou framework mutualisé).
- **Déjà pos 1 sur "labyrinthite"** (page dédiée ranking 1-3, total 816 ETV). Concurrent direct sur l'opportunité LGA identifiée.
- Pas de section e-commerce shop : `/nos-appareils-auditifs` est catalogue, pas vente.

---

## 3) Top mots-clés positionnés

### Top 20 par ETV

| Rank | Volume | ETV | Keyword | URL (chemin) |
|:---:|:---:|:---:|---|---|
| 1 | 14 800 | 4 499 | cristaux oreille | /oreille/cristaux-oreille-interne |
| **2** | **27 100** | 4 390 | **appareils auditifs** | /nos-appareils-auditifs |
| 1 | 12 100 | 3 678 | comment déboucher oreille | /oreille/bouchee |
| 1 | 8 100 | 2 462 | **appareils auditif prix** | /nos-appareils-auditifs |
| 1 | 8 100 | 2 462 | prix des appareil auditifs | /nos-appareils-auditifs |
| 4 | 22 200 | 1 463 | oreilles | /oreille/oreille-externe |
| 1 | 4 400 | 1 337 | acouphène pulsatile | /acouphene/acouphenes-pulsatiles |
| 1 | 4 400 | 1 337 | vivason (brand) | / |
| 2 | 8 100 | 1 312 | oreille interne | /oreille/vertige-oreille-interne |
| 7 | 49 500 | 1 267 | acouphènes | /acouphene |
| 3 | 12 100 | 1 177 | comment déboucher les oreilles | /oreille/bouchee |
| **1** | **3 600** | 1 094 | **audiogramme** | /test-auditif/lire-audiogramme |
| 2 | 6 600 | 1 069 | cristaux interne oreille | /oreille/cristaux-oreille-interne |

**Force commerciale notable** : pos 1 sur "appareils auditif prix" et "prix des appareil auditifs" (8 100 vol chacun). Double page `/nos-appareils-auditifs` + pos 2 sur "appareils auditifs" générique (27 100).

---

## 4) Profil backlinks — 90 % sitewide

### Métriques globales

| Métrique | Valeur | Analyse |
|----------|:------:|---------|
| Total backlinks | **42 851** | Très élevé |
| Referring domains | 739 | Bon volume |
| Main domains | 681 | |
| Nofollow | 25 806 (60 %) | TRÈS élevé |
| Spam score domaine | **2** | Excellent nominal |
| Target spam score | 14 | Zone orange |
| Links FR | **40 363 (94 %)** | Profil 100 % local |
| Links section | 38 975 | Quasi tout en section éditoriale |

### Pattern caché : 4 ancres dominent 90 % du profil

| Ancre | BL | # RD | % total |
|---|:---:|:---:|:---:|
| `Site internet` | **13 704** | 3 (.fr) | 32 % |
| `Prise de RDV en ligne` | **12 037** | 1 | 28 % |
| `site web` | **6 558** | 1 (.com) | 15 % |
| `prendre un rdv` | **6 376** | 1 (.com) | 15 % |
| `Prendre rendez-vous` | 553 | 4 | 1 % |
| Ancre vide (.ma alternate) | 412 | 48 | 1 % |
| **Sous-total top 4 sitewide** | **38 675** | **6** | **90 %** |

**Interprétation** : ~90 % des BL vivason proviennent de **4-6 domaines partenaires** (probablement Doctolib + mutuelles + annuaires santé avec widget embed sitewide). Profil éditorial réel : ~4 000 BL sur ~730 RD.

### Signal positif

- Spam score 2 (aucun réseau Telegram détecté, contrairement à Unisson)
- 94 % FR (profil 100 % local)
- Ancres .ma (246 BL) = partenaire Maroc probable (entreprise liée ou prestation externalisée)

---

## 5) Audit technique (Lighthouse desktop)

| Catégorie | Score | Seuil LGA |
|---|:---:|:---:|
| Performance | **76** | 90+ (faible) |
| Accessibility | 87 | 95+ |
| Best Practices | 92 | 95 |
| SEO | 92 | 95+ |

### Web Vitals — CLS catastrophique

- FCP : 585 ms (excellent)
- **LCP : 1 833 ms** (bon)
- **CLS : 0,325** (**ZONE ROUGE** — seuil Google "Poor" >0,25)
- TBT : 61 ms (bon)
- Interactive : 2 401 ms
- Total byte weight : 1,9 MB

### Stack

**Drupal + React** + Google Tag Manager + Bing Ads + **Tradedoubler** (affiliation) + Google Analytics + **dexem.net** (call tracking).

**Lecture** : CLS 0,325 = **impact ranking Core Web Vitals** direct. Couplé à la chute -55 % kw, hypothèse = pénalité Helpful Content Update + CWV conjuguée. Vulnérabilité double.

---

## 6) Keyword gap vs LGA

**20 requêtes où VivaSon est top 10 et LGA absent** (volume cumulé ~120 000/mois) :

| Keyword | Volume | Pos VivaSon | CPC |
|---|:---:|:---:|:---:|
| **cristaux oreille** | 14 800 | **1** | 0,23 € |
| comment déboucher une oreille | 12 100 | 5 | 0,51 € |
| otospongiose | 9 900 | 7 | 0,59 € |
| sonotone | 8 100 | 8 | 1,21 € |
| **appareils auditif prix** | 8 100 | **1** | 1,12 € |
| hyperacousie | 8 100 | 7 | 0,82 € |
| douleur oreille | 6 600 | 9 | 0,77 € |
| déboucher l'oreille | 6 600 | 6 | 0,43 € |
| déboucher oreilles | 6 600 | 4 | 0,43 € |
| oreille interne vertige | 5 400 | 2 | 0,50 € |
| oreille bouchée que faire | 5 400 | 8 | 0,48 € |
| acouphène pulsatile | 4 400 | 3 | 0,46 € |
| otalgie | 4 400 | 2 | 0 € |
| **signia** | 3 600 | 9 | 2,04 € |

### Lecture stratégique

VivaSon rank **pos 1-3 sur plusieurs requêtes prioritaires LGA identifiées dans la synthèse** (cristaux oreille, audiogramme, otalgie, déboucher oreille, hydrops, labyrinthite). C'est un concurrent direct sur le cluster YMYL ORL santé.

**MAIS** : chute -55 % kw + CLS rouge = positions fragiles. Opportunité de les dépasser avec contenu E-E-A-T supérieur.

---

## 7) E-E-A-T & on-page (WebFetch homepage)

### Title / Meta / H1

- **Title** : non détecté dans extract (probablement cause perf homepage)
- **H1** : *"Appareils auditifs et prothèses auditives | VivaSon - L'audition pour tous"* (trop long)
- **H2** : 8 H2 commerciaux + FAQ + actualités

### Trust signals

- **10 537 avis / 70 000 clients / 96 % satisfaction**
- **Attestation TrustVille certifiée** (label tiers)
- **70 ans d'expérience**
- **Auteurs identifiés** : **Ruben Krief, Marcel Ben Soussan** (2 audioprothésistes nommés — rare dans le secteur)
- Mission humanitaire Madagascar (différenciateur RSE)
- Liste marques : Signia, Starkey, Resound, Phonak, Oticon, Widex

### Gaps E-E-A-T

1. **Pas de page auteur structurée** avec credentials DE/ADELI vérifiables pour Krief/Ben Soussan.
2. **Pas de schema.org** visible (Person, MedicalOrganization, Article).
3. **Title non visible** → potentiel pb SEO technique homepage.
4. **70 ans d'expérience** = claim non sourcé (l'entreprise existe depuis quand précisément ?).

---

## 8) Opportunités concrètes pour LGA

### Priorité 1 — Dépasser VivaSon sur "cristaux oreille" (14 800 vol)

Ils sont pos 1. Mais perf CLS 0,325 + chute -55 % kw = positions instables. Guide LGA avec signature Franck-Olivier + sources HAS/INSERM + schema MedicalWebPage complet + angle "quand consulter audioprothésiste après VPPB" = dépasse en 3 mois.

### Priorité 2 — Requêtes commerciales prix/appareils auditifs

VivaSon pos 1 sur "appareils auditif prix" + "prix des appareil auditifs" (8 100 vol chacune). Page `/nos-appareils-auditifs` simple catalogue. LGA avec comparatif + verdict expert peut faire mieux sur ces requêtes.

### Priorité 3 — Cluster "déboucher oreille" (40 k vol cumulé)

VivaSon pos 1-6 sur 6 variations ("comment déboucher oreille", "comment déboucher une/les oreilles", "déboucher l'oreille"). Guide LGA consolidé avec arbre décisionnel (bouchon cerumen / rhume / eau / trompe Eustache) + signature experte.

### Priorité 4 — Niche otospongiose/hyperacousie/otalgie

VivaSon pos 2-9 sur pathologies rares (otospongiose 9 900, hyperacousie 8 100, otalgie 4 400). Volume cumulé ~22 500. Guides LGA ciblés = top 3 accessible.
