---
title: "Audit SEO concurrent — audika.fr"
date: 2026-04-20
auteur: Franck-Olivier / Pipeline LGA
sources: DataForSEO (domain_rank, ranked_keywords, backlinks_summary, backlinks_anchors, historical, relevant_pages, domain_intersection, lighthouse), WebFetch
---

# Audit SEO complet — audika.fr (FR)

## Executive summary

**Audika est le poids lourd technique de l'audition FR** — groupe Demant (Oticon), 630+ centres physiques, 200 000 patients/an, 45 ans d'ancienneté. Le site SEO reflète cette force : **106 822 ETV/mois**, 4 210 keywords rankés, 1 031 referring domains.

**3 forces majeures**
1. **Trafic YMYL santé dominant** — top pages (9 351 ETV sur "protections auditives", 5 518 sur "oreille bouchée traitements", 4 687 sur homepage brand).
2. **Performance technique exceptionnelle** — Lighthouse Perf **97/100**, SEO **100/100**, LCP **1 041 ms**, byte weight 1,2 MB (best-in-class de tous les concurrents audités).
3. **Shop secondaire** — `boutique.audika.fr` génère ~25 % du trafic sur "bouchons d'oreilles" (22 200 vol, pos 2) et "roger on" (33 100 vol, pos 3).

**3 faiblesses exploitables**
1. **Tendance baissière -11 % kw en 5 mois** (6 011 en déc 2025 → 4 210 en avril 2026). Perte de 1 801 positions malgré ETV stable.
2. **Profil backlinks artificiellement gonflé** : 70 961 BL sur 2 ancres seules ("site web" + "prendre un rdv", 1 domaine chacune) = **72 % du profil** vient de 2 partenaires sitewide. 1 031 RD réels mais concentration extrême.
3. **Contenu YMYL sans auteur identifié** — pas de page auteur, pas de credentials audioprothésistes nominatifs, schema.org santé absent. Vulnérable à Helpful Content Update.

---

## 1) Autorité & volume organique

### Snapshot avril 2026 (France)

| Métrique | Valeur | Lecture |
|----------|:------:|---------|
| Mots-clés rankés | **4 210** | Fort (vs Unisson 3 704, audibene 624) |
| ETV (trafic estimé) | **106 822 / mois** | Top 3 du secteur FR |
| Positions 1 | **555** | Excellent (14× audibene) |
| Positions 2-3 | 509 | 11× audibene |
| Positions 4-10 | 1 104 | |
| Positions 11-30 | 1 096 | Reservoir exploitable |
| Coût trafic payant équiv. | 97 106 €/mois | Valeur business élevée |
| Rank domaine DataForSEO | **409** | Fort (vs audibene 260) |
| Paid (SEA actif) | 18 pos-1, ETV 166 | Campagne limitée |

### Tendance 6 mois (historical_rank_overview)

```
Nov 2025 : 6 002 kw | ETV 110 118
Dec 2025 : 5 975    | ETV 113 929   (+3 %)
Jan 2026 : 6 011    | ETV 115 316   (+1 %)
Fev 2026 : 5 405    | ETV 116 452   (stable) — PIC
Mar 2026 : 4 687    | ETV 107 236   (-9 %)
Avr 2026 : 4 210    | ETV 106 822   (-11 % kw, -6 % ETV sur 3 mois)
```

**Lecture** : Audika perd des keywords queues-longues depuis février 2026. L'ETV résiste car les top positions (555 pos-1) compensent. Signal probable d'un nettoyage algorithmique Google (contenu YMYL faible qualité dévalorisé) OU d'une consolidation éditoriale volontaire. À surveiller sur les 3 prochains mois.

---

## 2) Pages stars (concentration du trafic)

| # | URL (chemin) | KW | ETV | Pos-1 |
|---|---|:---:|:---:|:---:|
| 1 | `boutique.audika.fr/pages/protections-auditives` | 52 | **9 351** | 2 |
| 2 | `/votre-audition/troubles-auditifs/sensation-oreille-bouchee-traitements` | 119 | **5 518** | 21 |
| 3 | `/` (homepage) | 53 | 4 687 | 4 |
| 4 | `/votre-audition/cerumen/extraire-bouchon-cire` | 111 | 4 401 | 17 |
| 5 | `/votre-audition/cerumen/nettoyer-oreilles` | 66 | 3 559 | 13 |
| 6 | `boutique.audika.fr/products/micro-phonak-roger-on-3` | 2 | 3 229 | 0 |
| 7 | `/votre-audition/troubles-auditifs/otite/adultes` | 42 | 3 170 | 0 |
| 8 | `/votre-audition/troubles-auditifs/sensation-oreille-bouchee-traitements/rhume` | 96 | 2 695 | 12 |
| 9 | `/votre-audition/troubles-auditifs/acouphenes/bourdonnement-oreille-nuit` | 47 | 2 629 | 0 |
| 10 | `/votre-audition/troubles-auditifs/cristaux-oreilles` | 42 | 2 430 | 2 |
| 11 | `/votre-audition/troubles-auditifs/trompe-eustache-bouchee` | 48 | 2 421 | 13 |
| 12 | `/votre-audition/troubles-auditifs/sensation-oreille-bouchee-traitements/eau` | 69 | 2 385 | 13 |
| 13 | `/votre-audition/systeme-auditif/schema-oreille` | 47 | 2 321 | 5 |

### Observations structurelles

- **Architecture `/votre-audition/{cluster}/{page}`** très cohérente sémantiquement (bien meilleure que les `/homepage/` d'audibene).
- **Clusters forts** : otite (3 pages top), acouphènes/bourdonnements (2 pages), oreille bouchée (4 variations), cerumen (3 pages).
- **Dual-site shop + corpo** : boutique.audika.fr capte 20 % de l'ETV sur accessoires (Phonak Roger, protections).

---

## 3) Top mots-clés positionnés

### Top 20 par ETV

| Rank | Volume | ETV | Keyword | URL (chemin) |
|:---:|:---:|:---:|---|---|
| 1 | 14 800 | **4 499** | audika | / |
| 1 | 14 800 | 4 499 | cristaux dans les oreilles | /troubles-auditifs/cristaux-oreilles |
| 2 | 22 200 | 3 596 | bouchon d'oreille | boutique/protections-auditives |
| 2 | 22 200 | 3 596 | bouchons d'oreilles | boutique/protections-auditives |
| 3 | 33 100 | 3 220 | roger on | boutique/micro-phonak-roger-on-3 |
| 4 | 40 500 | 2 668 | **otite** | /troubles-auditifs/otite/adultes |
| 2 | 14 800 | 2 397 | trompes d'Eustache | /troubles-auditifs/trompe-eustache-bouchee |
| 2 | 12 100 | 1 960 | bourdonnement dans les oreilles | /acouphenes/bourdonnement-nuit |
| 6 | 49 500 | 1 673 | **acouphènes** | /acouphenes/exercices |
| 3 | 14 800 | 1 440 | cristaux oreilles | /troubles-auditifs/cristaux-oreilles |
| 2 | 8 100 | 1 312 | nettoyer oreilles | /cerumen/nettoyer-oreilles |

**Force massive sur YMYL santé ORL** : otite (40 500), acouphènes (49 500), bourdonnement (12 100), cristaux oreilles (14 800), trompe d'Eustache (14 800). Audika capture ~150 000 vol/mois cumulé sur ces seules requêtes.

---

## 4) Profil backlinks — fort mais concentré

### Métriques globales

| Métrique | Valeur | Analyse |
|----------|:------:|---------|
| Total backlinks | **98 013** | Très élevé |
| Referring domains | **1 031** | 5× audibene |
| Main domains | 920 | |
| Dofollow / Nofollow | ~67 000 / 3 336 | 3 % nofollow (très bon) |
| Spam score domaine | 1 | Quasi parfait |
| Spam score backlinks | 4 | Excellent |
| Links FR-based | **84 739** (86 %) | Profil 100 % local |
| Links nav/header/footer | 4 092 | Faible sitewide proportion |
| Links section (éditorial) | 76 194 | Dominant = éditorial |

### Pattern caché : 2 ancres dominent 72 % du profil

| Ancre | BL | # RD | Lecture |
|---|:---:|:---:|---|
| `site web` | 35 511 | 3 | 1 domaine principal sitewide (section) |
| `prendre un rdv` | 35 450 | 1 | 1 seul domaine sitewide (CTA) |
| Ancre vide | 8 433 | 106 | Liens image alternate (legit) |
| `Prendre rendez-vous` | 2 814 | 5 | CTAs partenaires |
| `Prendre RDV` | 2 589 | 1 | Nav partenaire |
| `cliquez ici` | 1 296 | 2 | |
| `audika.fr` | 1 284 | 144 | Éditorial + UGC (678 nofollow) |

**Interprétation** : 70 961 BL sur 2 ancres + 1-3 domaines = **72 % du profil vient de ~4 partenaires sitewide** (probablement un réseau d'annuaires médicaux ou mutuelles avec widget intégré). Profil réel hors sitewide : ~27 000 BL sur ~1 020 RD = beaucoup plus modeste.

### Signal spam récent (août 2025)

- **367 BL** via ancre "TELEGRAM @SEO_ANOMALY - SEO BACKLINKS" (spam score 60, 98 domaines .space/.website/.online/.site) — campagne spam détectée. Même signal que sur laboratoires-unisson (voir audit correspondant). Profil probable : site attaqué par réseau spam externe, pas volontaire.

---

## 5) Audit technique (Lighthouse desktop)

| Catégorie | Score | Seuil LGA |
|---|:---:|:---:|
| **Performance** | **97** | 90+ (on dépasse à peine) |
| Accessibility | 93 | 95+ |
| Best Practices | 96 | 95 |
| **SEO** | **100** | 95+ |

### Web Vitals (desktop, throttling simulé)

- **FCP** : 869 ms (excellent)
- **LCP** : **1 041 ms** (best-in-class — vs audibene 1 714 ms, Unisson 1 412 ms)
- **CLS** : 0,024 (bon)
- **Speed Index** : 1 080 ms (excellent)
- **Total byte weight** : 1,2 MB (excellent pour seniors mobile)
- **Bootup time** : 1 206 ms (un peu lourd — probable JS GTM/VWO)

### Stack technique

WordPress + Apache/OpenSSL + Demant CDN + Cookie Information (CMP) + Google Tag Manager + **VWO (A/B testing)** + Google Ads DoubleClick + Adobe TypeKit.

**Lecture** : infra professionnelle, testing A/B actif (VWO), budget technique conséquent. LGA ne peut pas rivaliser sur ce terrain sans investissement lourd, mais notre avantage statique Astro nous place dans la même catégorie perf (LGA <1,2 s LCP typique).

---

## 6) Keyword gap vs LGA

**20 requêtes où audika est top 10 et LGA absent** (volume cumulé ~230 000/mois) :

### Tier 1 — Gros volume YMYL santé

| Keyword | Volume | Pos audika | CPC | URL audika |
|---|:---:|:---:|:---:|---|
| **otite** | 40 500 | 4 | 0,40 € | /troubles-auditifs/otite/adultes |
| **roger on** (Phonak) | 33 100 | 3 | 0,33 € | boutique/micro-phonak-roger-on-3 |
| **bouchons d'oreilles** (protections) | 22 200 | 2 | 1,12 € | boutique/protections-auditives |
| auriculothérapie | 14 800 | 9 | 0,64 € | /blog/lifestyle/soins-oreilles |
| cristaux oreille | 14 800 | 4 | 0,23 € | /troubles-auditifs/cristaux-oreilles |
| otite externe | 14 800 | 7 | 0,26 € | /troubles-auditifs/otite/types/externe |
| trompe d'Eustache | 14 800 | 8 | 0,69 € | /troubles-auditifs/trompe-eustache-bouchee |
| oreille qui siffle | 12 100 | 8 | 0,75 € | /acouphenes/bourdonnement-nuit |
| oreille qui bourdonne | 12 100 | 5 | 0,64 € | /acouphenes/bourdonnement-nuit |
| sifflement oreille | 12 100 | 5 | 0,75 € | /acouphenes/bourdonnement-nuit |
| comment déboucher une oreille | 12 100 | 7 | 0,51 € | /sensation-oreille-bouchee |
| oreille gauche qui siffle | 9 900 | 5 | 1,82 € | /acouphenes/bourdonnement-nuit |
| **appareils auditif prix** | 8 100 | 4 | 1,12 € | /appareils-auditifs/prix-et-financement |
| sonotone | 8 100 | 4 | 1,21 € | /appareils-auditifs/tout-savoir/sonotones |
| nettoyer oreilles | 8 100 | 4 | 0,84 € | /cerumen/nettoyer-oreilles |
| oreille interne | 8 100 | 5 | 0,57 € | /systeme-auditif/oreille-interne |

### Lecture stratégique

**Audika domine structurellement tout le cluster YMYL santé ORL**. C'est leur arme anti-LGA : ils ont de l'ancienneté + autorité + volume éditorial. Pour chaque requête, leur position 4-8 tient parce qu'aucun concurrent n'a d'E-E-A-T supérieur.

**Le levier LGA** : **franchir la barrière E-E-A-T avec signature Franck-Olivier DE 28 ans + sources HAS/INSERM/PubMed + schema MedicalWebPage complet**. Audika a le volume, mais leurs articles n'ont aucun auteur identifié. Google 2026 (Helpful Content + YMYL) valorise l'expertise vérifiable — nous passons devant à moyen terme si le contenu est supérieur.

---

## 7) E-E-A-T & on-page (WebFetch homepage)

### Title / Meta / H1

- **Title** : *"Audika France : Appareils auditifs & tests de l'audition"* (56 chars, optimisé)
- **H1** : *"Testez votre audition avec un audioprothésiste et découvrez nos appareils auditifs"* (aligné CTA, 82 chars — un peu long)
- **H2** : 9 H2 cluster produits (Blink Mini, Blink, 100% Santé, Extra, centres, pôles)

### Trust signals forts

- **9,1/10 sur 199 435 avis** (phénoménal — plus que tout autre concurrent)
- **630+ centres en France**
- **200 000 patients/an**
- Garantie légale 4 ans
- Mention "Mutuelles et partenaires"
- 45 ans d'expertise

### Gaps E-E-A-T exploitables par LGA

1. **Aucun schema.org structuré détecté** (pas de MedicalOrganization, pas de Review aggregate, pas de LocalBusiness schema structuré sur homepage).
2. **Pas d'auteur identifié** sur les 13 pages top-trafic santé (otite, cerumen, acouphènes, cristaux, trompe d'Eustache — toutes anonymes).
3. **Pas de bibliographie scientifique visible** dans les articles (sources HAS/INSERM absentes en survol).
4. **Modèle enseigne physique** → message "essai gratuit + RDV" plutôt que "guide indépendant". Différenciation narrative LGA claire.

---

## 8) Opportunités concrètes pour LGA

### Priorité 1 — Concurrencer audika sur leur cluster YMYL fort

Plutôt que créer de nouveaux clusters, LGA doit **battre audika en qualité E-E-A-T** sur les requêtes où ils sont pos 4-8 :

| Guide LGA à produire | Vol cible | Pos audika | Stratégie |
|---|:---:|:---:|---|
| Otite adulte/enfant (guide complet + lien perte auditive) | 40 500 | 4 | Signature DE + schema MedicalWebPage + sources HAS |
| Cristaux oreille / VPPB | 14 800 | 4 | "Quand consulter un audioprothésiste après VPPB" |
| Trompe d'Eustache bouchée | 14 800 | 8 | Guide plongée/avion/rhume avec retour terrain |
| Oreille bouchée causes | 12 100 | 5-8 (3 pages audika) | Guide unique consolidé avec arbre décisionnel |
| Nettoyer oreilles + cerumen | 16 200 | 2-4 (3 pages audika) | Guide anti-coton-tige + retours cabine |
| Acouphènes guide global | 49 500 | 6 | Cluster LGA + bibliographie + expérience patients |

### Priorité 2 — Ne pas copier leur shop

La boutique audika (protections + Roger On) capte ~25 % de leur ETV mais **c'est un modèle e-commerce**, pas LGA. Rester sur l'affiliation/recommandation experte, pas vendre.

### Priorité 3 — Intercepter trafic "audika + ville"

Audika a 630 centres. Pages `/centres-audika/{ville}` LGA avec angle "Audika à Lille : avis audioprothésiste indépendant + alternatives" = stratégie de long-tail à exploiter avec nos 7 654 centres FINESS.
