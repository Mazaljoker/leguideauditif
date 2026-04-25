# Plan ETL rpps_audioprothesistes → centres_auditifs

**Date** : 2026-04-20
**Contexte décisionnel** : campagne LinkedIn 2026-04-21 "ta fiche existe déjà, va la voir". Impossible à publier tant que le trou RPPS n'est pas comblé.
**Statut** : **PLAN — pas d'exécution tant que non validé**

---

## 1. Diagnostic précis

Matching **strict** tri-critère (direct RPPS OR SIRET OR adresse normalisée) impossible en une requête (timeout sur les LIKE). Le matching **par SIRET seul est décisif** : 100 % des RPPS ont un SIRET, 98,6 % des centres aussi.

### Chiffres exacts (requêtes validées 2026-04-20)

| Métrique | Valeur |
|----------|--------|
| Total pros RPPS | **7 146** |
| Matchés par SIRET (fiche existe) | **3 844** (53,8 %) |
| Non matchés par SIRET | **3 302** (46,2 %) |
| Dont **sans CP** (inexploitables) | **1 404** |
| Dont **avec CP complet** (récupérables) | **1 898** |
| SIRET uniques parmi les 1 898 | **1 717** |
| Centres avec colonne `rpps` remplie | **11 / 7 475** (inutilisable comme clé) |

**Taux réel de manquants RÉCUPÉRABLES : 1 898 / 7 146 = 26,6 %** (vs 44,8 % majorant initial).

### Les 1 404 sans CP : hors-scope définitif

Requête de contrôle : sur les 1 404 lignes sans CP, **0 ont un SIRET, 0 ont une voie, 0 ont une commune**. Totalement vides (sauf nom/prenom/rpps). Ce sont des pros dont l'ingestion RPPS n'a pas extrait l'établissement.

**Action** : hors-scope ETL. Chantier upstream séparé pour corriger l'ingestion RPPS source (regex / parser).

### Distribution top 20 départements (pros manquants récupérables)

| Dep | Manquants | Dep | Manquants |
|----:|----------:|----:|----------:|
| 75  | 97        | 31  | 46        |
| 13  | 96        | 78  | 45        |
| 59  | 65        | 83  | 42        |
| 92  | 62        | 38  | 40        |
| 69  | 61        | 62  | 40        |
| 33  | 54        | 95  | 40        |
| 94  | 50        | 06  | 36        |
| 34  | 49        | 93  | 34        |
| 35  | 46        | 91  | 34        |
|     |           | 77  | 33        |
|     |           | 76  | 31        |

Concentration métropoles : 17 des 20 top dep sont urbains/périurbains. Cohérent avec la densité RPPS.

### SIRET dupliqués (même magasin, plusieurs pros)

| Cas | Nombre |
|-----|-------:|
| SIRET à 1 pro (magasin solo) | **1 555** (90,6 %) |
| SIRET à 2 pros (cas Beauquis+Lezier) | **146** (8,5 %) |
| SIRET à 3+ pros | **16** (0,9 %) |
| Max pros par SIRET | **5** |

**181 pros supplémentaires partagent un magasin avec un autre pro** (10 % de doublons de magasin).

---

## 2. Stratégie d'insertion

### Options

**Option A — 1 fiche centres_auditifs par RPPS** (recommandé)
- 1 898 nouvelles fiches
- Chaque pro a sa fiche dédiée → message "ta fiche existe déjà" tient
- 181 fiches sont des doublons physiques (même adresse/SIRET)
- Slug différencié par `-{nom-pro-slugifié}` en suffixe
- `claim_attributions` : chaque RPPS revendique SA fiche, aucune collision

**Option B — 1 fiche par SIRET unique**
- 1 717 nouvelles fiches
- Plus propre architecturalement (1 magasin physique = 1 fiche)
- MAIS : Lezier devrait revendiquer la fiche au nom de Beauquis → confusion, échec de la promesse LinkedIn
- Nécessite une colonne `rpps_additionnels[]` ou une table de jointure → refactor sortant du scope

### Recommandation : **Option A**

**Arguments** :
1. **Métier** : la campagne repose sur un message individuel ("TA fiche"). Lezier doit voir "Amélie Lezier — Écouter Voir Cognin", pas "Beauquis — Écouter Voir Cognin" qu'elle devrait revendiquer.
2. **Simplicité** : pas de changement de schéma, pas de table de jointure.
3. **Cohérence** : les 5 Savoie urgents ont été insérés hier en mode A (ex: Beauquis + Lezier = 2 fiches distinctes).
4. **Dédup ultérieure possible** : si v2 souhaite fusionner, un script dédup peut le faire (merge `claim_attributions`, redirect 301 vers la fiche principale).

**Coût** : 181 doublons visuels (~10 %). Impact SEO mineur — Google consolidera via le canonical si nécessaire (cf. section 6).

### Schéma d'insertion par fiche

```
legacy_id       : 'rpps-{rpps}'                         (unique, format ancrage)
slug            : '{enseigne-slug}-{ville-slug}-{cp}-{nom-pro-slug}'
nom             : enseigne RPPS (fallback: "Prenom Nom Audioprothésiste" si enseigne null)
adresse         : '{num_voie} {type_voie} {voie}' normalisé
cp              : code_postal (RPPS)
ville           : commune (RPPS)
departement     : extraction CP (ou LEFT 2/3 selon DOM)
lat, lng        : géocodage BAN (fallback null si unmatched)
siret           : r.siret
rpps            : r.rpps                                (colonne unique respectée : max 1 pro par siret partagé)
plan            : 'rpps'
source          : 'rpps_etl_bulk_2026-04-20'
audio_prenom    : r.prenom                              (cohérence display)
claim_status    : 'none' (défaut)
```

---

## 3. Géocodage BAN

### Volume et durée

- **1 898 appels** à `api-adresse.data.gouv.fr/search/`
- Rate limit BAN public : **50 req/s** → théorique 38 s
- Latence réelle (roundtrip France) : **~200 ms/req en sériel** → 1 898 × 200 ms = **6 min 20 s**
- Parallélisation batch 10 → **~45 s**
- Durée totale à prévoir : **2-10 min selon parallélisation**

### Taux de match attendu

Basé sur les 4 géocodages déjà effectués (Savoie) :
- Score 0.95 pour Drumettaz-Clarafond (adresse complète)
- Score 0.82 pour Cognin 16 Route de Lyon
- Score 0.82 pour Ugine 19 Avenue Paul Girod
- Score 0.59 pour Cognin "Centre Commercial Rue de l'Épine" (adresse non numérique)

**Hypothèse basse** : 85 % avec score ≥ 0.7 (seuil SEO/carte acceptable).
**Hypothèse haute** : 92 % (ordre des adresses INSEE).

### Stratégie unmatched (≤ 15 % estimé, soit ~300 fiches)

1. **Score ≥ 0.5 mais < 0.7** : garder mais flagger `geocode_confidence='low'` pour review future
2. **Score < 0.5 ou NO_MATCH** : insérer sans lat/lng, avec `ville` renseignée (fallback géocodage par commune via BAN `/search?q={commune}` pour centrer la carte)
3. **Aucun fallback possible** : fiche créée mais exclue de la carte interactive (filtre `lat/lng NOT NULL` déjà en place dans [trouver-audioprothesiste/](src/pages/trouver-audioprothesiste/))

Aucune fiche n'est rejetée à ce stade — toutes sont créées pour que le pro puisse la revendiquer depuis la campagne LinkedIn.

---

## 4. Génération slug

### Règle

```
slug = slugify(`${nom} ${ville} ${cp}`) + '-' + slugify(`${prenom} ${nom_pro}`)
     = slugify(`${enseigne} ${commune} ${cp}`) + '-' + slugify(`${prenom_pro} ${nom_pro}`)
```

Avec `slugify` = la fonction `slugifyVille` de [src/lib/departements.ts](src/lib/departements.ts) (Lot 1 fix ligatures déjà déployé).

**Exemple** :
- enseigne="ECOUTER VOIR AUDITION MUTUALISTE", commune="Cognin", cp="73160", prenom="Amélie", nom="LEZIER"
- → `ecouter-voir-audition-mutualiste-cognin-73160-amelie-lezier`

### Anti-collision

Avant INSERT, vérifier `SELECT 1 FROM centres_auditifs WHERE slug = $1`. Si match :
- Ajouter suffixe numérique `-2`, `-3`, etc. (rare — cas de 2 pros mêmes prénom+nom+adresse)
- Logger les collisions

**Risque** de collision avec les 7 475 slugs existants : très faible grâce au nom+prénom pro en suffixe. Les slugs existants utilisent `{enseigne}-{ville}-{cp}` (sans pro) → pas de chevauchement.

**Risque post-Chantier FINESS (--apply en cours)** : le script reimport génère aussi des slugs avec suffixe UUID court `-{idSuffix}`. Format différent, pas de collision.

---

## 5. Plan d'exécution

### Pré-requis

- [ ] `--apply` reimport franchises **terminé** (ETA 15:18 aujourd'hui) — sinon concurrence sur colonne `slug`
- [ ] Chantier FINESS committé + mergé (on ne veut pas de conflits git)
- [ ] Table `centre_redirects` prête (déjà OK, migration 010)
- [ ] INSEE_API_KEY en .env.local (déjà OK pour géocodage BAN — pas besoin de clé en fait, public API)

### Étapes

| # | Étape | Durée | Validation |
|---|-------|------:|-----------|
| E1 | Script ETL `scripts/reimport-rpps-to-centres.mjs` : lit rpps_audioprothesistes, filtre non-matchés par SIRET + avec CP, prépare les 1 898 lignes candidates | dev 30 min | - |
| E2 | Géocodage BAN batch 10 parallèle, stocke résultats en JSON | run 5 min | Taux match ≥ 80 % attendu |
| E3 | Génération slugs + check collisions via SELECT batch | run 2 min | 0 collision acceptable |
| E4 | Dry-run : rapport `reports/rpps-etl-preview.csv` (1 898 lignes) avec tous les champs calculés | run 2 min | **Review humaine obligatoire** |
| E5 | Validation humaine : user inspecte 20 lignes random + stats géocodage | 15 min | Go/no-go |
| E6 | Apply INSERT batch 500 via MCP Supabase `execute_sql` | run 3 min | 0 erreur attendu |
| E7 | Vérification sanity : `SELECT COUNT(*) WHERE source = 'rpps_etl_bulk_2026-04-20'` = 1 898 | 1 min | - |
| E8 | Test 10 URLs random sur prod (curl headers + HTTP 200) | 5 min | Toutes retournent la page |

**Durée totale** : ~1h (hors dev + validation humaine).
**Sans attente `--apply` reimport** : impossible avant fin `bmf5ppxxs` (~15:18 aujourd'hui).

### Point de validation humaine E5

User doit valider :
- Taux de match BAN (≥ 80 %)
- Aucun slug collision
- Échantillon 20 fiches : noms d'enseignes corrects, adresses plausibles
- Top 5 enseignes représentées (AMPLIFON, AUDIKA, etc. — doivent déjà exister corrigées)

### Rollback

Facile via MCP SQL :
```sql
DELETE FROM centres_auditifs WHERE source = 'rpps_etl_bulk_2026-04-20';
```
Idempotent. Exécutable en <5 s. Les 5 Savoie manuels ne sont **pas affectés** (ils ont `source = 'rpps_manual_2026-04-20'`, marqueur différent).

---

## 6. Risques et impact SEO

### Sitemap

- Sitemap centres avant : 7 475 URLs
- Sitemap centres après : 7 475 + 1 898 = **9 373 URLs**
- **MAIS** : filtre Lot 1 appliqué = `plan IN ('claimed','premium')` → les 1 898 nouvelles fiches (plan='rpps') **NE SERONT PAS EXPOSÉES AU SITEMAP**. Découverte uniquement via maillage `/audioprothesiste/{ville}/`.
- Impact sitemap : **0 URL supplémentaire pour Google**.
- Impact maillage interne : les pages `/audioprothesiste/{ville}/` listeront automatiquement ces nouvelles fiches → boost du count `centresCount` pour certaines villes → certaines franchissent le seuil `≥ 6` du Chantier 1 → deviennent indexables. **Effet bénéfique en cascade**.

### Carte interactive

- Points avant : 7 475
- Points après : ~9 373 (avec lat/lng valide : ~9 000 après les 5-15 % de géocodage failed)
- Le composant [MiniMap.tsx](src/components/MiniMap.tsx) utilise déjà filtrage CP + pagination. Aucun impact perf.

### Contenu dupliqué (181 doublons magasin)

**Risque réel** : même adresse, même téléphone potentiel, titre similaire. Google peut consolider.

**Mitigation** :
- Slug différent (inclut nom pro)
- `audio_prenom` différent → H1 distinct (`{Enseigne} — {Prénom Nom}`)
- Schema.org `@id` différent
- Mais même lat/lng → même mini-carte

**Si Google consolide** : il choisira un canonical parmi les doublons. Les autres iront en "Autre page avec balise canonique correcte" (cas GSC déjà connu du Lot 1). Pas catastrophique, juste 181 URLs qui rankeront comme 1.

**Alternative à considérer v2** : dédup `centre_audioprothesistes` table (1 centre + N pros). Mais hors scope.

### Impact revendication

Chaque fiche nouvelle a `plan='rpps'` donc potentiellement revendiquable par le pro titulaire du RPPS via `/revendiquer-gratuit/?centre={slug}`.

**Table `claim_attributions`** (cf. migration 009) : aucune collision attendue car chaque fiche est unique par `rpps`. Le pro qui revendique est reconnu par son `claimed_by_email` (vérifié via matching nom+prénom vs RPPS `nom/prenom`).

**Bonus** : pour les 181 "doublons magasin" (2-5 pros au même SIRET), chaque pro peut revendiquer SA fiche sans bloquer les collègues. Bénéfice métier confirmé vs Option B.

### Risque Airflow / pipeline récurrent

**Cette ETL est one-shot 2026-04-20**. La vraie solution long-terme est un pipeline récurrent RPPS → centres_auditifs à chaque ingestion. Hors scope du présent plan. Pour la campagne LinkedIn : le manual fix suffit.

---

## 7. Calendrier proposé

| Échéance | Étape |
|----------|-------|
| **2026-04-20 ~15:20** | `--apply` reimport franchises terminé |
| 2026-04-20 15:30 | Écriture script `reimport-rpps-to-centres.mjs` (1h dev) |
| 2026-04-20 16:30 | Dry-run + géocodage + preview CSV |
| 2026-04-20 17:00 | **Validation humaine** (user inspecte preview) |
| 2026-04-20 17:15 | Apply INSERT prod (3 min) |
| 2026-04-20 17:30 | Tests 10 URLs + check GSC |
| **2026-04-21 matin** | **Campagne LinkedIn OK** — message "ta fiche existe déjà" valide |

Le Chantier FINESS doit être **committé + PR mergé + déployé Vercel** entre 15:20 et 16:30 pour que les slugs corrigés soient en prod avant la campagne. Idéalement je m'en charge en parallèle pendant la phase E1.

---

## 8. Décisions à valider par user

1. **Option A (1 fiche/RPPS)** — recommandée : confirmer ou demander Option B ?
2. **Seuil géocodage** : unmatched < 0.5 → fiche sans lat/lng acceptable ? Ou exclusion ?
3. **Timing** : lancer E1 dès ~15:30 aujourd'hui, ou décaler après test plus large du reimport franchises ?
4. **Hors-scope 1 404 sans CP** : OK pour qu'ils restent absents à la campagne ? Ou on demande un patch upstream à l'ingestion RPPS ce soir ?
5. **Chantier ingestion RPPS upstream** : à planifier en chantier séparé post-campagne (récupérer siret/commune/voie pour les 1 404) ?
