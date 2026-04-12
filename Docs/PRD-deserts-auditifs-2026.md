# PRD — Étude "Déserts Auditifs en France 2026"

## Contexte

LeGuideAuditif.fr est un site d'information santé auditive (Astro 6 + React 19 + Tailwind v4 + Vercel). L'objectif de cette page est de publier la première carte interactive des déserts auditifs en France, basée sur le croisement des données RPPS (audioprothésistes) et INSEE (population par département).

**Pourquoi :** cette étude est un aimant à backlinks. Les journalistes santé et presse régionale ont besoin de sources à citer quand ils parlent d'accès aux soins. LeGuideAuditif devient cette source.

**Repo :** https://github.com/Mazaljoker/leguideauditif
**Branche :** `feat/etude-deserts-auditifs`

---

## 1. Page à créer

**URL :** `/etudes/deserts-auditifs-france-2026`
**Fichier :** `src/pages/etudes/deserts-auditifs-france-2026.astro`
**Layout :** `GuideLayout.astro` (breadcrumbs, TOC, auteur, disclaimer)

---

## 2. Sources de données

### 2.1 RPPS Audioprothésistes

- **Source :** Table Supabase `rpps_audioprothesistes` (données RPPS data.gouv.fr, Licence Ouverte)
- **Accès :** Supabase SDK déjà configuré dans le projet (URL + anon key dans `.env`)
- **Lignes :** 7 146 audioprothésistes uniques en France
- **Colonnes :** rpps, civilite, nom, prenom, mode_exercice (L=libéral/S=salarié/B=les deux), siret, raison_sociale, enseigne, num_voie, type_voie, voie, code_postal, commune, pays, telephone, telephone2, email, departement_code, departement_lib
- **Attention :** `departement_code` est vide pour toutes les lignes. Dériver le département depuis `code_postal` (2 premiers chiffres, sauf 97x/98x = 3 chiffres, 20xxx = 2A/2B Corse)
- **Couverture :** 5 742 ont un code postal (80%), 1 404 sans adresse
- **IMPORTANT :** Ne jamais exposer de données nominatives (nom, prénom, téléphone, email) côté client. Le script agrège par département uniquement.

### 2.2 INSEE Population par département

- **Source :** INSEE, Estimation de population au 1er janvier 2025
- **URL :** https://www.insee.fr/fr/statistiques/8331297
- **Fichier :** Excel "Estimation de population par département, sexe et grande classe d'âge - Années 1975 à 2025"
- **Sheet :** `2025`
- **Colonnes utiles (sheet 2025, ligne 6+) :**
  - Col A : code département
  - Col B : nom département
  - Col F : population 60-74 ans (Ensemble)
  - Col G : population 75 ans et plus (Ensemble)
  - Col H : population totale (Ensemble)
- **Population cible :** 60+ ans = col F + col G (approximation raisonnable : 90% des appareillés ont 60+)

### 2.3 Données pré-calculées (résultats du croisement)

Le croisement a déjà été fait. Voici les résultats clés à utiliser :

**Moyenne nationale :** 8,4 audioprothésistes pour 100 000 habitants

**Top 5 pires (métropole) :**

| Dept | Nom | Audios | Population | Ratio/100k |
|------|-----|--------|------------|------------|
| 52 | Haute-Marne | 7 | 167 047 | 4,19 |
| 23 | Creuse | 5 | 114 103 | 4,38 |
| 28 | Eure-et-Loir | 22 | 433 148 | 5,08 |
| 61 | Orne | 14 | 271 896 | 5,15 |
| 70 | Haute-Saône | 12 | 231 932 | 5,17 |

**Top 5 meilleurs :**

| Dept | Nom | Audios | Population | Ratio/100k |
|------|-----|--------|------------|------------|
| 75 | Paris | 351 | 2 048 472 | 17,13 |
| 46 | Lot | 24 | 176 432 | 13,60 |
| 09 | Ariège | 20 | 156 787 | 12,76 |
| 56 | Morbihan | 89 | 789 465 | 11,27 |
| 84 | Vaucluse | 64 | 573 683 | 11,16 |

**Chiffre choc :** Seine-Saint-Denis (93) = 5,32 pour 100 000 (91 audios, 1 711 876 hab.) — quasiment la moitié de la moyenne nationale, et c'est en Île-de-France.

**Outre-mer :** Mayotte (0,3), Guyane (0,34), Guadeloupe (3,42), Martinique (4,22), Réunion (4,46)

---

## 3. Structure de la page

### 3.1 SEO

```yaml
title: "Carte des déserts auditifs en France (2026) — Étude RPPS"
description: "Première carte interactive des audioprothésistes par département. Où manque-t-il des professionnels de l'audition ? Données RPPS 2026 × INSEE 2025."
```

- Schema.org : `Article` + `Dataset` (pour les données)
- Breadcrumbs : Accueil > Études > Déserts auditifs France 2026

### 3.2 Contenu (ordre des sections)

#### Section 1 — Accroche (hero)
Chiffre choc en grand : "En Haute-Marne, il y a **2 fois moins** d'audioprothésistes par habitant que la moyenne française."
Sous-titre : "Étude indépendante réalisée par Franck-Olivier Chabbat, audioprothésiste DE, à partir des données officielles RPPS et INSEE."

#### Section 2 — Carte interactive
- **Composant React** : `DesertAuditifsMap.tsx` dans `src/components/etudes/`
- Basé sur **Leaflet** (déjà dans le projet via `AudioMap.tsx`)
- Carte choroplèthe de la France par département
- Couleurs : vert (#4CAF50) → jaune (#FFC107) → rouge (#F44336) selon le ratio
- Seuils :
  - Vert : > 10 pour 100k
  - Jaune : 7-10 pour 100k
  - Orange : 5-7 pour 100k
  - Rouge : < 5 pour 100k
- Au survol : tooltip avec nom département, nombre d'audios, population, ratio
- Au clic : lien vers `/trouver-audioprothesiste?dept=XX`
- **GeoJSON :** utiliser un GeoJSON des départements français (ex: `france-geojson` sur npm ou GitHub)
- **Source de données :** fichier JSON statique `src/data/deserts-auditifs-2026.json` généré au build

#### Section 3 — Classement complet
- **Composant React** : `DepartementRanking.tsx`
- Tableau des 101 départements, triable par : ratio, nombre d'audios, population
- Colonnes : Rang, Département, Audios, Population totale, Pop 60+, Ratio/100k, Indicateur (pastille couleur)
- Barre de recherche pour trouver son département
- Mobile-friendly : scroll horizontal ou cards sur petit écran

#### Section 4 — Analyse par Franck-Olivier (MDX ou Astro)
Contenu éditorial (500-800 mots), en vouvoiement, ton professionnel. Points à couvrir :
- La fracture territoriale est réelle : écart de 1 à 4 en métropole
- Le paradoxe Seine-Saint-Denis : département jeune et peuplé, pourtant sous-doté
- Le couloir nord-est : Haute-Marne, Meuse, Orne, Eure — une diagonale du vide auditif
- Le sud surreprésenté : Ariège, Lot, Var — attractivité du cadre de vie pour les professionnels
- L'angle 60+ : il ne suffit pas de compter la population totale, il faut regarder la population âgée
- Ce que ça implique pour les patients : temps de trajet, délais de RDV, suivi compliqué

**Composants obligatoires (YMYL santé) :**
- `AuthorBox.astro` après l'analyse
- `HealthDisclaimer.astro` en bas de page

#### Section 5 — Méthodologie
- Source RPPS : data.gouv.fr, extraction avril 2026, 7 146 audioprothésistes
- Source INSEE : estimation population au 1er janvier 2025
- Calcul : nombre d'audioprothésistes géolocalisés par département / population × 100 000
- Limites : 1 404 audios (20%) sans adresse dans le RPPS, probablement salariés multi-sites non déclarés individuellement
- Le ratio utilise la population totale (pas 60+) pour comparabilité avec les données DREES publiées

#### Section 6 — CTA
- "Trouvez l'audioprothésiste le plus proche de chez vous" → `/trouver-audioprothesiste`
- "Vous êtes audioprothésiste ? Revendiquez votre fiche" → `/revendiquer`

---

## 4. Composants à créer

### 4.1 `DesertAuditifsMap.tsx`
- Framework : React 19
- Lib : Leaflet (déjà en dépendance)
- GeoJSON départements : à télécharger au build ou à bundler
- Props : `data: DepartementData[]`
- Responsive : 100% width, min-height 500px desktop / 350px mobile
- Légende en bas à gauche (vert/jaune/orange/rouge + seuils)
- Pas d'emoji (icônes Lucide SVG inline si besoin)

### 4.2 `DepartementRanking.tsx`
- Framework : React 19
- Tableau triable (pas de lib externe, tri natif useState)
- Barre de recherche (filtre par nom)
- Pastille couleur par ligne (même code couleur que la carte)
- Accessible : role="table", scope sur headers, aria-sort

### 4.3 `src/data/deserts-auditifs-2026.json`
Fichier JSON statique généré par un script Node.js au build. Structure :

```json
{
  "metadata": {
    "source_rpps": "data.gouv.fr, avril 2026",
    "source_insee": "INSEE, estimation population 1er janvier 2025",
    "total_audios": 5742,
    "total_audios_rpps": 7146,
    "audios_sans_adresse": 1404,
    "moyenne_nationale": 8.4,
    "date_publication": "2026-04-XX"
  },
  "departements": [
    {
      "code": "01",
      "nom": "Ain",
      "audios": 42,
      "population_totale": 688626,
      "population_60plus": 175431,
      "ratio_100k": 6.10,
      "rang": 35,
      "niveau": "jaune"
    }
  ]
}
```

### 4.4 Script de génération : `scripts/generate-deserts-data.mjs`
- Requête Supabase : `select code_postal, mode_exercice, enseigne from rpps_audioprothesistes` (pas de données nominatives)
- Lit le fichier INSEE (Excel ou CSV pré-converti)
- Dérive le département depuis code_postal côté script
- Croise, calcule les ratios
- Écrit `src/data/deserts-auditifs-2026.json`
- Exécuté manuellement (`node scripts/generate-deserts-data.mjs`), pas à chaque build
- Utilise les variables d'environnement existantes (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)

---

## 5. Design

### Palette (existante)
- Marine : #1B2E4A (titres, texte)
- Crème : #F8F5F0 (fond)
- Orange : #D97B3D (accents, CTA)

### Carte — couleurs spécifiques
- Vert : #4CAF50 (> 10/100k)
- Jaune : #FFC107 (7-10/100k)
- Orange : #FF9800 (5-7/100k)
- Rouge : #F44336 (< 5/100k)
- Bordures départements : #1B2E4A, 1px
- Fond carte (mer) : #E8E8E8

### Typographie
- Chiffre choc hero : Merriweather, 48px, marine, bold
- Tableau : Inter, 16px minimum (audience seniors)
- Touch targets : 44x44px minimum

### Accessibilité
- Alt text sur la carte : "Carte de France colorée selon la densité d'audioprothésistes par département"
- Tableau accessible avec headers `scope`
- Contraste WCAG AA sur toutes les pastilles couleur
- Focus visible outline 3px orange
- `prefers-reduced-motion` : pas d'animation sur la carte

---

## 6. SEO technique

- **Schema.org Article** avec author, datePublished, publisher
- **Schema.org Dataset** :
  ```json
  {
    "@type": "Dataset",
    "name": "Densité d'audioprothésistes par département en France (2026)",
    "description": "Nombre d'audioprothésistes pour 100 000 habitants, par département",
    "creator": { "@type": "Person", "name": "Franck-Olivier Chabbat" },
    "datePublished": "2026-04-XX",
    "license": "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
    "distribution": {
      "@type": "DataDownload",
      "encodingFormat": "application/json",
      "contentUrl": "https://leguideauditif.fr/data/deserts-auditifs-2026.json"
    }
  }
  ```
- **Open Graph image** : capture statique de la carte (1200×630)
- **Liens internes obligatoires** :
  - Vers `/trouver-audioprothesiste`
  - Vers `/guides/audioprothesiste/choisir`
  - Vers `/guides/remboursement/100-sante`

---

## 7. Fichiers à créer/modifier (résumé)

| Fichier | Action | Type |
|---------|--------|------|
| `src/pages/etudes/deserts-auditifs-france-2026.astro` | Créer | Page |
| `src/components/etudes/DesertAuditifsMap.tsx` | Créer | React |
| `src/components/etudes/DepartementRanking.tsx` | Créer | React |
| `src/data/deserts-auditifs-2026.json` | Généré par script | Data |
| `scripts/generate-deserts-data.mjs` | Créer | Script |
| `public/data/deserts-auditifs-2026.json` | Copier à la publication | Data (téléchargeable) |

---

## 8. Critères d'acceptation

- [ ] La page build sans erreur (`npm run build`)
- [ ] La carte affiche les 101 départements avec les bonnes couleurs
- [ ] Le tooltip affiche les données correctes au survol
- [ ] Le tableau est triable et cherchable
- [ ] Le tableau est lisible sur mobile (min 375px)
- [ ] AuthorBox et HealthDisclaimer sont présents
- [ ] Schema.org Article + Dataset sont dans le HTML
- [ ] Le fichier JSON est accessible publiquement pour les journalistes
- [ ] Les liens internes sont en place (min 3)
- [ ] Lighthouse accessibility ≥ 90
- [ ] Le contenu éditorial de Franck-Olivier est en placeholder (à rédiger séparément via la chaîne GAN)

---

## 9. Ce qui est hors scope

- Rédaction du contenu éditorial (section 4) → sera fait via la chaîne GAN (affiliate-writer → humanizer → evaluator → eeat-compliance)
- Image OG → sera générée après la page
- Diffusion presse / LinkedIn → stratégie séparée
- Données annuaire des centres (déjà dans le site, pas à refaire)

---

## 10. Priorité

**P0 — Cette feature est critique pour la stratégie de link building de LeGuideAuditif.** C'est le premier contenu conçu pour générer des backlinks externes, ce qui est le principal levier pour faire monter l'autorité du domaine et donc le trafic organique sur l'ensemble du site.

**Conventional commit :** `feat: add étude déserts auditifs France 2026 with interactive map`
**Branche :** `feat/etude-deserts-auditifs`
