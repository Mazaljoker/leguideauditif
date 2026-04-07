# Bible de Contenu — LeGuideAuditif.fr

> Document de référence pour toute création de contenu sur le site.
> Dernière mise à jour : 7 avril 2026.

---

## 1. Identité du site

**Nom** : LeGuideAuditif.fr
**Tagline** : Le guide indépendant pour mieux entendre
**Mission** : Aider les Français malentendants (et leurs proches) à comprendre leur perte auditive, choisir le bon appareillage et naviguer le remboursement — avec l’expertise d’un audioprothésiste DE indépendant.

**Auteur principal** : Franck-Olivier, audioprothésiste diplômé d’État, 25+ ans d’expérience (18 centres Alain Afflelou, audioprothésiste senior chez Auzen).

**Positionnement** : site expert indépendant — ni fabricant, ni enseigne, ni mutuelle. Contenu YMYL santé auditive, E-E-A-T maximisé par l’expertise terrain de Franck-Olivier.

---

## 2. Audience cible

### Persona principal : Le senior malentendant (55-80 ans)

- **Situation** : Ressent une gêne auditive depuis plusieurs mois/années, entourage qui se plaint
- **Parcours type** (issu du MANUAL BOOK Auzen) :
  1. Gêne progressive (TV trop forte, conversations difficiles en famille, réunions)
  2. Consultation ORL → audiogramme
  3. Recherche prix en ligne (choc : 1500-4000€/oreille)
  4. Découverte du 100% Santé (reste à charge 0€ possible)
  5. Recherche d’un audioprothésiste / comparaison d’appareils
  6. Période d’essai 30 jours → adaptation → suivi

- **Questions fréquentes** :
  - "Combien coûte un appareil auditif ?"
  - "Est-ce que je serai remboursé ?"
  - "Quel est le meilleur appareil auditif ?"
  - "Comment savoir si j’ai besoin d’un appareil ?"
  - "Classe 1 ou Classe 2 ?"
  - "Les acouphènes, ça se soigne ?"

- **Freins** :
  - Stigma social ("je ne suis pas vieux")
  - Prix perçu comme élevé
  - Peur de la technologie
  - Méfiance envers les commerciaux
  - Déni de la perte auditive

### Persona secondaire : L’aidant (40-65 ans)

- Enfant adulte qui constate la perte auditive d’un parent
- Recherche des solutions pour convaincre le parent de s’appareiller
- Cherche des informations claires à transmettre

### Persona tertiaire : Le jeune actif exposé au bruit (25-45 ans)

- Exposé au bruit professionnel ou récréatif (concerts, écouteurs)
- Intéressé par la prévention
- Peut avoir des acouphènes débutants

---

## 3. Règles éditoriales

### Ton et style
- **Vouvoiement systématique** dans tout le contenu publié (audience seniors)
- **Expert accessible** : langage clair, pas de jargon sans explication immédiate
- **Empathique** : reconnaître les émotions (peur, honte, frustration) sans condescendance
- **Factuel** : toujours s’appuyer sur des données (HAS, INSERM, ameli.fr, études cliniques)
- **Indépendant** : jamais de favoritisme fabricant, toujours expliquer les critères objectifs

### Vocabulaire préféré

| Éviter | Préférer |
|--------|----------|
| Prothèse auditive | Aide auditive, appareil auditif |
| Sourd | Malentendant, personne ayant une perte auditive |
| Vieux | Senior, personne âgée |
| Traitement des acouphènes | Prise en charge, soulagement, gestion des acouphènes |
| Guérir la surdité | Compenser, corriger, améliorer l’audition |
| Prix fixe | Fourchette de prix, à partir de |
| Meilleur (seul) | Meilleur pour [situation spécifique] |

### Obligations YMYL / E-E-A-T

Chaque article DOIT contenir :

1. **Encadré auteur** (composant `AuthorBox`) : nom, titre (audioprothésiste DE), années d’expérience, photo
2. **Disclaimer santé** (composant `HealthDisclaimer`) : "Ce contenu est informatif et ne remplace pas une consultation avec un professionnel de santé."
3. **Sources médicales** : HAS, INSERM, ameli.fr, SFRL, études publiées — citées dans le texte et en fin d’article
4. **Date de publication + date de mise à jour** : visibles et dans le schema.org
5. **Disclosure affiliée** (comparatifs uniquement, composant `AffiliateDisclosure`)

### Double Gate de publication

Tout contenu DOIT passer :
- **Gate 1** : `nposts-content-evaluator` — score ≥ 70/100 (PASS)
- **Gate 2** : `me-eeat-compliance` — score ≥ 80/100 (PASS)
- HARD BLOCK : aucune publication sans les 2 PASS.

---

## 4. Architecture de contenu — 8 clusters

### CLUSTER 1 : Perte auditive (pilier informatif)

**Page pilier** : `/guides/perte-auditive/`
*"Perte auditive : comprendre, détecter et agir"*

**Satellites** :

| Slug | Titre | Intent | Mots-clés cibles |
|------|-------|--------|-------------------|
| perte-auditive-symptomes | Les 7 symptômes d’une perte auditive | Info | symptômes perte auditive, signes surdité |
| perte-auditive-causes | Causes de la perte auditive : âge, bruit, maladie | Info | causes surdité, presbyacousie |
| perte-auditive-types | Perte de transmission, perception, mixte : les différences | Info | types surdité, surdité transmission |
| audiogramme-comprendre | Comment lire votre audiogramme | Info/HowTo | audiogramme, comprendre audiogramme |
| perte-auditive-enfant | Perte auditive chez l’enfant : dépistage et signes | Info | surdité enfant, dépistage auditif |
| perte-auditive-soudaine | Surdité brusque : urgence médicale | Info | surdité brusque, perte auditive soudaine |
| test-auditif-en-ligne | Test auditif en ligne : fiable ou pas ? | Info | test auditif en ligne, test audition gratuit |
| presbyacousie | Presbyacousie : la perte auditive liée à l’âge | Info | presbyacousie, perte audition age |
| quand-consulter-orl | Quand consulter un ORL pour votre audition | Info | consultation ORL audition, quand voir ORL |

**Expertise Auzen mobilisée** : Questionnaire de découverte patient (MANUAL BOOK section 2 "Understanding the lead"), parcours patient type, vidéo explicative perte auditive (YouTube ref dans le manual).

---

### CLUSTER 2 : Appareils auditifs (pilier commercial + informatif)

**Page pilier** : `/guides/appareils-auditifs/`
*"Appareils auditifs : le guide complet pour bien choisir"*

**Satellites informatifs** :

| Slug | Titre | Intent |
|------|-------|--------|
| types-appareils-auditifs | Contour, intra, RIC, invisible : quel type choisir ? | Info |
| classe-1-vs-classe-2 | Classe 1 vs Classe 2 : quelles différences concrètes ? | Info/Commercial |
| premier-appareil-auditif | Premier appareil auditif : ce qu’il faut savoir | Info |
| adaptation-appareil-auditif | Période d’adaptation : les 30 premiers jours | Info/HowTo |
| entretien-appareils-auditifs | Entretien de vos appareils : le guide complet | HowTo |
| appareil-auditif-rechargeable | Rechargeable ou à piles : avantages et inconvénients | Info |
| appareil-auditif-bluetooth | Bluetooth et connectivité : streaming, téléphone, TV | Info |
| appareil-auditif-invisible | Appareils invisibles : options et limites | Info |
| accessoires-auditifs | TV Connector, micro distant, chargeur : les accessoires essentiels | Info |

**Satellites comparatifs** (collection `comparatifs`) :

| Slug | Titre | Intent |
|------|-------|--------|
| meilleur-appareil-auditif-2026 | Meilleur appareil auditif 2026 : notre classement | Commercial |
| comparatif-phonak-signia-resound | Phonak vs Signia vs ReSound : le match | Commercial |
| meilleur-appareil-classe-1 | Meilleur appareil Classe 1 (100% Santé) | Commercial |
| meilleur-intra-auriculaire | Meilleur intra-auriculaire invisible 2026 | Commercial |
| meilleur-appareil-acouphenes | Meilleur appareil auditif contre les acouphènes | Commercial |
| meilleur-tv-connector | Meilleur TV Connector pour appareil auditif 2026 | Commercial |
| meilleur-accessoire-auditif | Accessoires auditifs : les indispensables comparés | Commercial |
| meilleure-protection-auditive | Meilleures protections auditives 2026 : notre sélection | Commercial |
| meilleure-app-audition | Meilleures apps smartphone pour appareils auditifs | Commercial |

**Marques couvertes** (données catalogue Auzen) :

| Fabricant | Gammes connues | Pays |
|-----------|---------------|------|
| **Phonak** (Sonova) | Audéo Paradise, Lumity, Slim, Naída Link | Suisse |
| **ReSound** (GN Hearing) | ONE 5/7/9, Nexia, Vivia, Savi | Danemark |
| **Signia** (WS Audiology) | Pure Charge&Go, Styletto, Silk, Active Pro, Insio, Pure IX BCT | Allemagne |
| **Widex** (WS Audiology) | Moment, SmartRIC | Danemark |
| **Oticon** (Demant) | More, Real, Intent | Danemark |
| **Starkey** | Genesis AI, Evolv AI | USA |

**Accessoires par marque** (données ACCESSOIRES.txt) :

- Chargeurs (standard, premium, nomade)
- TV Connectors / Streamers
- Filtres anti-cérumen (Cerushield, Cerustop, Wax Guard)
- Microphones distants (Multi Mic, Streamline Mic, Com-Dex)
- Produits d’entretien (spray, lingettes, déshydratant, capsules)
- Piles Rayovac (tailles 10, 312, 13, 675)

---

### CLUSTER 3 : Acouphènes (pilier informatif — forte demande)

**Page pilier** : `/guides/acouphenes/`
*"Acouphènes : comprendre, soulager, vivre avec"*

**Chiffre clé** : 4-7 millions de Français touchés, 1 adulte sur 10.

**Satellites** :

| Slug | Titre | Intent |
|------|-------|--------|
| acouphenes-causes | Acouphènes : les causes principales | Info |
| acouphenes-traitement | Traitement des acouphènes : ce qui marche en 2026 | Info |
| acouphenes-et-stress | Acouphènes et stress : le cercle vicieux | Info |
| therapie-sonore-acouphenes | Thérapie sonore (TRT, masquage) : comment ça marche | Info |
| acouphenes-pulsatiles | Acouphènes pulsatiles : quand s’inquiéter | Info |
| acouphenes-sommeil | Acouphènes et sommeil : retrouver des nuits calmes | Info |
| appareil-auditif-acouphenes | Appareil auditif et acouphènes : une solution efficace ? | Info/Commercial |
| hyperacousie | Hyperacousie : quand le bruit devient douleur | Info |
| lenire-acouphenes | Dispositif Lenire : le point sur cette innovation | Info |

**Données de recherche 2025-2026** : Lenire (91,5% d’amélioration), stimulation magnétique transcrânienne (67% réduction), approche pluridisciplinaire ×3,7 vs conventionnel (JAMA Otolaryngology 2024).

**Source Google Drive** : "Guide de gestion des acouphènes" (e-book, 14 962 mots) — à exploiter comme base de contenu.

---

### CLUSTER 4 : Prévention auditive (pilier informatif)

**Page pilier** : `/guides/prevention/`
*"Protéger votre audition : le guide prévention"*

**Satellites** :

| Slug | Titre | Intent |
|------|-------|--------|
| bruit-travail-audition | Bruit au travail : 56% des actifs gênés en 2025 | Info |
| protections-auditives | Bouchons et protections : comment choisir | Info/Commercial |
| ecouteurs-volume-risques | Écouteurs et casques : les règles pour préserver votre audition | Info |
| depistage-auditif | Dépistage auditif : à quel âge et à quelle fréquence | Info |
| bilan-auditif-gratuit | Bilan auditif gratuit : où et comment | Info |
| prevention-auditive-seniors | Prévention auditive après 60 ans | Info |
| concert-festival-protection | Concerts et festivals : protéger vos oreilles | Info |

---

### CLUSTER 5 : Remboursement et prix (pilier commercial — très fort volume de recherche)

**Page pilier** : `/guides/remboursement/`
*"Remboursement des appareils auditifs en 2026 : le guide complet"*

**Données clés 100% Santé** (source ameli.fr + web search) :
- Classe 1 : 950€ max/oreille, reste à charge 0€ (contrat responsable)
- Classe 2 : prix libre, base remboursement Sécu 240€/oreille
- 3 types éligibles : contour, micro-contour, intra
- Renouvellement tous les 4 ans
- Piles : 3-10 paquets/an remboursés

**Satellites** :

| Slug | Titre | Intent |
|------|-------|--------|
| 100-sante-audition | 100% Santé audition : tout comprendre en 5 minutes | Info |
| prix-appareil-auditif | Prix d’un appareil auditif en 2026 : tous les tarifs | Commercial |
| mutuelle-appareil-auditif | Quelle mutuelle pour un appareil auditif ? | Commercial |
| reste-a-charge-zero | Reste à charge zéro : comment en bénéficier | Info |
| devis-appareil-auditif | Comprendre votre devis audioprothésiste | Info |
| aide-financiere-appareil-auditif | Aides financières pour vos appareils auditifs (APA, MDPH) | Info |
| renouvellement-appareil-auditif | Renouveler ses appareils : quand et comment | Info |

---

### CLUSTER 6 : Vie quotidienne avec des appareils (pilier informatif)

**Page pilier** : `/guides/vie-quotidienne/`
*"Vivre au quotidien avec des appareils auditifs"*

**Satellites** :

| Slug | Titre | Intent |
|------|-------|--------|
| appareil-auditif-telephone | Téléphoner avec un appareil auditif | HowTo |
| appareil-auditif-television | Regarder la TV avec un appareil auditif | HowTo |
| appareil-auditif-sport | Sport et appareil auditif : ce qu’il faut savoir | Info |
| appareil-auditif-voyage | Voyager avec ses appareils auditifs | Info |
| entourage-malentendant | Comment communiquer avec un proche malentendant | Info |
| applications-smartphone-audition | Apps smartphone pour vos appareils (myPhonak, Oticon Companion…) | Info/HowTo |
| appareil-auditif-travail | Travailler avec un appareil auditif : droits et conseils | Info |
| panne-appareil-auditif | Panne d’appareil : que faire avant d’aller chez l’audio | HowTo |

---

### CLUSTER 7 : L’audioprothésiste — votre allié (pilier E-E-A-T)

**Page pilier** : `/guides/audioprothesiste/`
*"L’audioprothésiste : rôle, parcours, comment bien choisir"*

Ce cluster renforce le E-E-A-T en positionnant Franck-Olivier comme expert légitime.

**Satellites** :

| Slug | Titre | Intent |
|------|-------|--------|
| choisir-audioprothesiste | Comment choisir son audioprothésiste | Info |
| premier-rdv-audioprothesiste | Premier rendez-vous : à quoi vous attendre | Info |
| suivi-audioprothesiste | Le suivi post-appareillage : pourquoi c’est crucial | Info |
| teleaudiologie | Téléaudiologie : réglages à distance en 2026 | Info |
| audioprothesiste-vs-orl | ORL, audioprothésiste, orthophoniste : qui fait quoi | Info |

---

### CLUSTER 8 : Pages commerciales transversales

| Slug | Titre | Type |
|------|-------|------|
| a-propos | À propos de LeGuideAuditif.fr | Trust |
| contact | Contactez-nous | Lead gen |
| trouver-audioprothesiste | Trouver un audioprothésiste près de chez vous | Lead gen |
| glossaire-audition | Glossaire de l’audition de A à Z | SEO longue traîne |
| faq | Questions fréquentes sur l’audition | FAQ Schema |
| mentions-legales | Mentions légales | Légal |
| politique-confidentialite | Politique de confidentialité | RGPD |

---

## 5. Maillage interne

### Règles de maillage

1. **Chaque satellite → son pilier** : lien contextuel dans l’introduction ou le premier tiers
2. **Pilier → tous ses satellites** : sommaire avec liens en haut de page
3. **Cross-cluster** : 2-3 liens entre clusters connexes par article
4. **CTA lead gen** : chaque article informatif contient au minimum 1 lien vers `trouver-audioprothesiste` ou le formulaire de devis

### Matrice de liens cross-cluster

| De ↓ \ Vers → | Perte auditive | Appareils | Acouphènes | Prévention | Remboursement | Vie quotidienne | Audioprothésiste |
|----------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Perte auditive | — | ✓✓ | ✓ | ✓ | ✓ | · | ✓ |
| Appareils | ✓ | — | ✓ | · | ✓✓ | ✓✓ | ✓ |
| Acouphènes | ✓✓ | ✓ | — | ✓ | · | ✓ | ✓ |
| Prévention | ✓✓ | · | ✓ | — | · | · | ✓ |
| Remboursement | · | ✓✓ | · | · | — | · | ✓✓ |
| Vie quotidienne | · | ✓✓ | ✓ | · | · | — | ✓ |
| Audioprothésiste | ✓ | ✓ | ✓ | · | ✓ | ✓ | — |

✓✓ = lien fort (obligatoire), ✓ = lien recommandé, · = optionnel

---

## 6. Données produits de référence

### Prix par gamme (marché France 2026)

| Gamme | Classe | Prix/oreille | Remboursement |
|-------|--------|-------------|---------------|
| Entrée de gamme | Classe 1 | ≤ 950€ | 100% (RAC 0€) |
| Milieu de gamme | Classe 2 | 1 000 – 1 500€ | Sécu 240€ + mutuelle |
| Haut de gamme | Classe 2 | 1 500 – 2 200€ | Sécu 240€ + mutuelle |
| Premium | Classe 2 | 2 200 – 3 000€+ | Sécu 240€ + mutuelle |

### Technologies par niveau (données catalogue Auzen)

| Niveau | Canaux | Réduction bruit | Directionnalité | Bluetooth | Rechargeable |
|--------|--------|----------------|-----------------|-----------|-------------|
| Essentiel (Classe 1) | 8-12 | Basique | Fixe | Non | Variable |
| Standard | 12-16 | Bonne | Adaptative | Oui | Oui |
| Avancé | 16-20 | Excellente | Multi-directionnel | LE Audio | Oui |
| Premium | 20-48 | IA temps réel | 360° | LE Audio + Auracast | Oui |

### Types de produits (schéma Zod existant)

- **contour** : Contour d’oreille classique (BTE) — le plus puissant
- **RIC** : Receiver-in-Canal — le plus populaire (70%+ du marché)
- **intra** : Intra-auriculaire sur mesure (ITE/ITC)
- **invisible** : Intra-canal profond (CIC/IIC) — le plus discret

---

## 7. Concurrence SEO directe

### Sites à surveiller

| Site | Type | Forces | Faiblesses |
|------|------|--------|------------|
| vivason.fr | Enseigne en ligne | SEO agressif, prix bas, contenu massif | Commercial, pas indépendant |
| audika.fr | Enseigne physique (500+ centres) | Notoriété, blog actif, E-E-A-T fort | Prix élevés, orienté commercial |
| ideal-audition.fr | Enseigne en ligne | Comparatifs bien positionnés, bon SEO | Commercial pur |
| audibene.fr | Enseigne en ligne (hear.com) | Budget marketing fort | Peu d’expertise visible |
| ouie-audition.com | Blog expert | Contenu de qualité, E-E-A-T | Moins de produits comparés |

### Avantage concurrentiel LeGuideAuditif

1. **Indépendance** — pas d’enseigne, pas de fabricant derrière
2. **Expertise terrain** — 25 ans de pratique, pas un rédacteur SEO
3. **Double perspective** — France (Afflelou) + International (Auzen)
4. **E-E-A-T naturel** — audioprothésiste DE, pas un content marketer
5. **Contenu Classe 1 + Classe 2** — pas de biais vers le premium

---

## 8. Calendrier éditorial — Phase de lancement

### Priorité 1 — Fondations (Mois 1-2)

Pages à créer en premier (fort volume de recherche + fort E-E-A-T) :

1. Page d’accueil (déjà créée)
2. À propos + AuthorBox complète
3. **Remboursement appareil auditif 2026** (pilier cluster 5)
4. **100% Santé audition**
5. **Prix appareil auditif 2026**
6. **Meilleur appareil auditif 2026** (comparatif)
7. **Perte auditive : symptômes** (satellite cluster 1)
8. **Classe 1 vs Classe 2**
9. **Les types d’appareils auditifs**
10. **Acouphènes : le guide complet** (pilier cluster 3)

### Priorité 2 — Expansion (Mois 3-4)

- Piliers restants (clusters 1, 2, 4, 6)
- 2-3 satellites par cluster
- Comparatifs : Phonak vs Signia vs ReSound, meilleur Classe 1
- FAQ complète avec schema.org

### Priorité 3 — Profondeur (Mois 5-6)

- Tous les satellites restants
- Glossaire complet
- Contenu HowTo (entretien, applications, TV Connector)
- Lead gen : formulaire devis, trouver un audio

### Rythme cible

- **Phase lancement** : 3-4 articles/semaine
- **Phase croisière** : 2 articles/semaine
- **Mise à jour** : révision des top articles tous les trimestres

---

## 9. Templates de contenu

### Article informatif (collection `guides`)

```
1. H1 : [Titre optimisé ≤ 60 car.]
2. Meta description : [≤ 155 car., inclut mot-clé + bénéfice]
3. Chapô : 2-3 phrases situant le problème + promesse de réponse
4. [HealthDisclaimer]
5. Sommaire (ancres H2)
6. Corps : 5-8 H2 avec contenu expert
   - Chaque H2 : 150-300 mots
   - 1 encadré "L’avis de l’expert" par article (citation de Franck-Olivier)
   - Données chiffrées sourcées
   - Liens internes contextuels (2-3 minimum)
7. FAQ (3-5 questions, schema FAQPage)
8. [AuthorBox]
9. Sources et références (liens vers HAS, INSERM, ameli.fr)
```

### Article comparatif (collection `comparatifs`)

```
1. H1 : [Comparatif / Meilleur + catégorie + année]
2. Meta description avec mot-clé commercial
3. [AffiliateDisclosure]
4. [HealthDisclaimer]
5. Tableau comparatif rapide (composant ComparisonTable)
6. Méthodologie de test / critères de sélection
7. Fiche détaillée par produit :
   - Photo produit
   - Specs : type, classe, canaux, Bluetooth, rechargeable, garantie
   - Points forts / Points faibles
   - "Idéal pour" (situation d’usage)
   - Prix constaté
8. Guide d’achat : comment choisir selon votre situation
9. FAQ
10. [AuthorBox]
11. Sources
```

---

## 10. Palette et design éditorial

### Couleurs "Chaleureux Senior"

| Nom | Hex | Usage |
|-----|-----|-------|
| Marine | #1B2E4A | Titres, header, éléments de confiance |
| Crème | #F8F5F0 | Fond de page, confort de lecture |
| Orange | #D97B3D | CTAs, accents, liens importants |
| Blanc | #FFFFFF | Cards, tableaux, contrastes |

### Typographie

- **Titres** : Inter (sans-serif) — modernité, lisibilité
- **Corps** : Merriweather (serif) — lecture longue, confort
- **Taille base** : 18px minimum (accessibilité seniors)

---

## 11. Sources de données pour les articles

### Sources médicales (obligatoires pour YMYL)

- **HAS** (Haute Autorité de Santé) : recommandations audioprothèse
- **INSERM** : études épidémiologiques audition
- **ameli.fr** : barèmes remboursement, conditions 100% Santé
- **SFRL** (Société Française d’ORL) : recommandations cliniques
- **ANR** : projets de recherche acouphènes
- **IHU reConnect** (Institut Pasteur) : recherche acouphènes

### Sources produits

- Catalogue Auzen (ref produits, codes Cosium, fiches techniques)
- Sites fabricants : phonak.com, resound.com, signia.com, widex.com, oticon.com, starkey.com
- MANUAL GUIDE AUZEN v.2 (méthodologie vente, parcours patient)
- Fiches devis Phonak, spec sheets Signia

### Sources marché

- ENSAO : données marché audioprothèse France
- Audio Infos 365 : actualités secteur
- L’Ouïe Magazine : tendances marché
- SonUp : chiffres clés audition France

---

## 12. Workflow de production

```
BRIEF (bible + brief-writer)
    ↓
RÉDACTION (seo-content-writer OU affiliate-writer)
    ↓
HUMANISATION (seo-humanizer)
    ↓
GATE 1 : content-evaluator ≥ 70
    ↓
GATE 2 : eeat-compliance ≥ 80
    ↓
IMAGES (me-image-generator)
    ↓
VIDÉOS optionnelles (me-video-generator)
    ↓
FIX + PR (seo-fixer → GitHub)
    ↓
POST-PUBLISH (seo-post-publish)
```

---

## 13. KPIs de contenu

| Métrique | Objectif M+3 | Objectif M+6 |
|----------|-------------|-------------|
| Articles publiés | 30 | 60 |
| Mots-clés Top 10 | 15 | 50 |
| Trafic organique/mois | 2 000 | 10 000 |
| Score E-E-A-T moyen | ≥ 85/100 | ≥ 90/100 |
| Taux de rebond | < 65% | < 55% |
| Leads formulaire/mois | 20 | 100 |
| Pages indexées | 40 | 80 |
