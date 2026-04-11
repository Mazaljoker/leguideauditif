# Bible de Contenu — LeGuideAuditif.fr

> Document de référence pour toute création de contenu sur le site.
> Dernière mise à jour : 11 avril 2026.

---

## 1. Identité du site

**Nom** : LeGuideAuditif.fr
**Tagline** : Le guide indépendant pour mieux entendre
**Mission** : Aider les Français malentendants et leurs proches à comprendre leur perte auditive, choisir le bon appareillage et naviguer le remboursement — avec l'expertise d'un audioprothésiste DE indépendant.

**Auteur principal** : Franck-Olivier, audioprothésiste diplômé d'État, 28 ans d'expérience. Parcours 360° : Amplifon (1998-2000), Audika (2007-2013), 18 centres Alain Afflelou Acousticien, Auzen.com (5 ans). 3000+ patients appareillés.

**Positionnement** : site expert indépendant — ni fabricant, ni enseigne, ni mutuelle. Contenu YMYL santé auditive, E-E-A-T maximisé par l'expertise terrain de Franck-Olivier.

---

## 2. Audience cible

### Persona principal : Le senior malentendant (55-80 ans)

- **Situation** : Ressent une gêne auditive depuis plusieurs mois/années, entourage qui se plaint
- **Parcours type** :
  1. Gêne progressive (TV trop forte, conversations difficiles)
  2. Consultation ORL → audiogramme
  3. Recherche prix en ligne (choc : 1500-4000€/oreille)
  4. Découverte du 100% Santé (reste à charge 0€ possible)
  5. Recherche d'un audioprothésiste / comparaison d'appareils
  6. Période d'essai 30 jours → adaptation → suivi

- **Questions fréquentes** : Combien coûte un appareil ? Serai-je remboursé ? Quel est le meilleur ? Classe 1 ou 2 ? Les acouphènes, ça se soigne ?

- **Freins** : Stigma social, prix perçu, peur technologie, méfiance commerciaux, déni.

### Persona secondaire : L'aidant (40-65 ans)
Enfant adulte qui constate la perte auditive d'un parent.

### Persona tertiaire : Le jeune actif exposé au bruit (25-45 ans)
Exposé au bruit professionnel ou récréatif, acouphènes débutants.

---

## 3. Règles éditoriales

### Ton et style
- **Vouvoiement systématique** dans tout le contenu publié
- **Expert accessible** : langage clair, pas de jargon sans explication immédiate
- **Empathique** : reconnaître les émotions sans condescendance
- **Factuel** : s'appuyer sur des données (HAS, INSERM, ameli.fr)
- **Indépendant** : jamais de favoritisme fabricant

### Vocabulaire préféré

| Éviter | Préférer |
|--------|----------|
| Prothèse auditive | Aide auditive, appareil auditif |
| Sourd | Malentendant |
| Vieux | Senior, personne âgée |
| Traitement des acouphènes | Prise en charge, soulagement |
| Guérir la surdité | Compenser, corriger, améliorer |
| Prix fixe | Fourchette de prix |
| Meilleur (seul) | Meilleur pour [situation spécifique] |

### Obligations YMYL / E-E-A-T

Chaque article DOIT contenir : encadré auteur, disclaimer santé, sources médicales, dates pub/MAJ, disclosure affiliée (comparatifs).

### Double Gate de publication

- **Gate 1** : `nposts-content-evaluator` v2 — score ≥ 75/100 ET terrain ≥ 80
- **Gate 2** : `me-eeat-compliance` v2 — score ≥ 80/100
- HARD BLOCK : aucune publication sans les 2 PASS.

---

## 4-11. [Sections identiques à la v1]

Les sections 4 (Architecture 8 clusters), 5 (Maillage), 6 (Données produits), 7 (Concurrence), 8 (Calendrier), 9 (Templates), 10 (Design), 11 (Sources) restent identiques.

---

## 12. Workflow de production (v2)

```
BRIEF (bible + brief-writer)
    ↓
RÉDACTION (me-affiliate-writer v2 — blocs terrain obligatoires)
    ↓
HUMANISATION (nposts-seo-humanizer v2 — finition stylistique uniquement)
    ↓
GATE 1 : content-evaluator v2 ≥ 75 ET terrain ≥ 80
    ↓
GATE 2 : eeat-compliance v2 ≥ 80 (experience signal score)
    ↓
IMAGES (me-image-generator)
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

---

## 14. Content Moat — Contenus incopiables

Le content moat rend LeGuideAuditif impossible à rattraper, même par un concurrent avec IA + budget SEO.

### Type 1 : Insight terrain exclusif

Contenus basés sur des observations cliniques que seul un praticien peut faire :
- "Les 7 erreurs que font 80% des patients avant leur premier appareil"
- "Ce que je regarde en 30 secondes sur un audiogramme"
- "Pourquoi certains patients n'entendent toujours pas bien avec un appareil"

Impossible à cloner sans 28 ans de terrain.

### Type 2 : Contenu anti-consensus

Prises de position tranchées qui diffèrent du consensus du marché :
- "Le 100% Santé est une bonne chose... mais dans ces cas, non"
- "Les appareils invisibles ne sont pas toujours une bonne idée"
- "Pourquoi le prix n'est pas le bon critère"
- "Classe 2 ne veut pas dire mieux — voici quand le Classe 1 gagne"

### Type 3 : Framework propriétaire

Outils conceptuels exclusifs à LeGuideAuditif :
- **La méthode FO** : 4 étapes pour choisir un appareil auditif
- **Le FO Index** : score de gêne auditive personnalisé (0-100)
- **Les 4 profils de patients** : classification pratique des situations
- **Le test des 3 situations** : auto-évaluation rapide de la gêne

### Objectif annuel

- 5 articles insight terrain exclusif / trimestre
- 2 articles anti-consensus / trimestre
- 1 framework propriétaire / semestre

---

## 15. Règle de mémorabilité

Chaque article DOIT contenir au minimum :

### 1 idée contre-intuitive
- "Un audiogramme normal ne signifie pas que vous entendez bien."
- "Un appareil plus cher peut être MOINS adapté."
- "La plupart des patients attendent 7 ans de trop."

### 1 phrase retenable
- "Entendre et comprendre, ce n'est pas la même chose."
- "Le meilleur appareil, c'est celui que vous porterez."
- "Votre cerveau oublie les sons qu'il n'entend plus."

### 1 insight terrain non évident
- "La chute à 4kHz impacte les consonnes sifflantes — d'où la plainte 'j'entends mais je ne comprends pas'."
- "Une perte légère asymétrique gêne plus qu'une perte modérée symétrique."

Si absent → kill switch mémorabilité du content-evaluator.

---

## 16. Maillage narratif

Le maillage doit être NARRATIF — le lecteur comprend POURQUOI cliquer.

Au lieu de :
> "Consultez notre guide sur les [types d'appareils](/guides/appareils-auditifs/types/)."

Écrire :
> "Si vous êtes dans ce cas — gêne principalement au restaurant — le choix du type change complètement. C'est ce que j'explique dans [ce guide](/guides/appareils-auditifs/types/)."

### Patterns
- **Par situation** : "Si vous vous reconnaissez, lisez aussi..."
- **Par approfondissement** : "C'est exactement ce que je détaille ici..."
- **Par contradiction** : "Attention, exception importante que j'explique dans..."
- **Par décision** : "Pour trancher, j'ai écrit un guide dédié..."

Minimum 3 liens internes par article, dont 1 narratif et 1 cross-cluster.

---

## 17. CTA contextualisé

Les CTA doivent être contextualisés selon la douleur de l'article.

**Perte auditive** : "Si vous vous reconnaissez et que personne ne comprend, un bilan en 30 minutes peut tout clarifier."

**Audiogramme** : "Si votre audiogramme semble normal mais que vous peinez à comprendre, vous êtes dans le cas que je vois le plus souvent."

**Appareils** : "Vous hésitez entre deux modèles ? Un essai de 30 jours gratuit vous donnera la réponse."

**Acouphènes** : "Les acouphènes ne disparaîtront peut-être pas complètement — mais on peut les rendre beaucoup plus supportables."

**Remboursement** : "Avant de vous inquiéter du prix, renseignez-vous — vous pourriez être agréablement surpris."

Chaque article DOIT avoir un CTA contextualisé en fin d'article.

---

## 18. KPIs de différenciation (v2)

| Métrique | Objectif M+3 | Objectif M+6 | Mesure |
|----------|-------------|-------------|--------|
| % articles avec insight terrain | 80% | 100% | terrain_checklist |
| Score non-généricité moyen | ≥ 75 | ≥ 85 | axe terrain evaluator |
| Score EEAT Experience moyen | ≥ 70 | ≥ 80 | experience signal |
| Articles content moat | 5 | 15 | tag dans base éditoriale |
| Taux scroll > 75% | 30% | 50% | GA4 scroll depth |
| Passages quote-worthy/article | ≥ 1 | ≥ 2 | kill switch mémorabilité |

---

## 19. Cinq angles éditoriaux dominants

Ces 5 angles sont le TERRITOIRE de LeGuideAuditif. Ils infusent tout le contenu.

### Angle 1 : "Ce que votre ORL ne vous dit pas (faute de temps)"
L'ORL diagnostique. L'audioprothésiste accompagne. LeGuideAuditif comble le vide.
Décliner : audiogramme, parcours patient, premier rdv, adaptation.

### Angle 2 : "La réalité du cabinet vs le marketing"
Les fabricants promettent. Les enseignes vendent. LeGuideAuditif dit ce qui se passe VRAIMENT.
Décliner : comparatifs, technologies, prix, Classe 1 vs 2.

### Angle 3 : "Entendre n'est pas comprendre"
Plainte n°1 des patients. Structure tout le discours perte auditive + appareillage.
Décliner : perte auditive, audiogramme, appareils, acouphènes.

### Angle 4 : "Le bon appareil, c'est celui que vous porterez"
Anti-obsession du "meilleur". Le meilleur = adapté, accepté, porté.
Décliner : choix appareil, Classe 1 vs 2, premier appareil, adaptation.

### Angle 5 : "28 ans de terrain — voici ce que j'ai appris"
L'expérience de Franck-Olivier est LE différenciateur. Parcours 360° : Amplifon, Audika, Afflelou, Auzen.
Décliner : méthode FO, erreurs fréquentes, cas réels, frameworks propriétaires.

### Utilisation
Pour chaque article, identifier l'angle dominant. L'article doit en être imprégné.
Plusieurs angles cohabitent, mais UN domine.
