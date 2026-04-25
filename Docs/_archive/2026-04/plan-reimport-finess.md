# Plan de ré-import FINESS — Fix centres franchises corrompus

**Date** : 2026-04-20
**Statut** : PLAN — pas encore implémenté
**Scope** : distinct du Lot 1 GSC (noindex/404/slug)
**Trigger** : le diagnostic de `scripts/fix-centre-audika-france.ts` a révélé 640 fiches corrompues, pas 1

---

## 1. Problème

**640 centres** en base `centres_auditifs` ont `ville=null` et `nom` = enseigne générique (pas le nom réel de l'agence). Répartition :

| Enseigne | Nombre | Exemples de nom |
|----------|--------|------------------|
| AMPLIFON | 225 | `AMPLIFON FRANCE` |
| AUDIKA | 222 | `AUDIKA FRANCE` |
| SONOVA | 80 | `SONOVA AUDIOLOGICAL CARE FRANCE SAS` |
| Autres SAS/franchises | ~50 | `MIOPTICO FRANCE`, etc. |
| AUDILAB | 19 | — |
| ACUITIS | 8 | — |
| Autres | ~36 | — |

Conséquences :
- URLs `/centre/{enseigne}-france-{cp}/` (ex: `audika-france-30000`)
- Pages générées avec `displayVille = cp` (fallback dans [centre/[slug].astro:40](src/pages/centre/%5Bslug%5D.astro#L40))
- Breadcrumbs incomplets (pas de fil département → ville → centre)
- Google les flagge en "redirection échec" ou "explorée non indexée"

Export complet : [reports/centres-audika-corrompus.csv](reports/centres-audika-corrompus.csv).

## 2. Pourquoi les 640 sont corrompus

Hypothèse la plus probable : lors de l'import initial depuis FINESS / SIRENE (voir [scripts/migrate-centres.ts](scripts/migrate-centres.ts)), le champ `rs` ("raison sociale" = nom juridique) a été utilisé comme `nom`, au lieu du champ `enseigne` (= nom de l'agence physique). Ce qui donne "AUDIKA FRANCE" (la SAS mère) au lieu de "Audika Nîmes" (l'agence spécifique).

Le champ `ville` vient d'un autre endroit du CSV FINESS et a peut-être échoué sur ces lignes spécifiques (décalage de colonnes, encodage).

## 3. Prérequis diagnostic (à faire AVANT toute action)

Requêtes à lancer via script dédié (pas ad-hoc) pour caractériser l'état :

**D1. Combien ont un SIRET ?**
- Si oui : enrichissement INSEE possible → récupération ville/adresse propre
- Sinon : voie INSEE impossible, fallback FINESS CSV

**D2. Combien ont un FINESS ?**
- Si oui : lookup direct dans [scripts/finess-geoloc.csv](scripts/finess-geoloc.csv) (205k lignes, source officielle)
- Le FINESS est stable : chaque centre physique a un FINESS unique

**D3. Combien ont été revendiqués (`plan='claimed'` ou `'premium'`) ?**
- Si > 0 : **risque élevé** de perdre des données utilisateur (a_propos, photos, horaires, audio_prenom) lors du fix
- Prévoir merge intelligent (préserver les champs enrichis utilisateur, ne remplacer que ville/nom)

**D4. Combien ont `lat/lng` valides ?**
- Si oui : la coordonnée géographique suffit pour reverse-geocode via BAN (api-adresse.data.gouv.fr) ou Nominatim

Script à produire : `scripts/diagnostic-centres-corrompus.ts` (SELECT only, pas d'update).

## 4. Voies de ré-enrichissement (au choix selon diagnostic)

### Voie A — INSEE Sirene API (recommandée si SIRET présent)

Réutiliser [scripts/enrich-insee.mjs](scripts/enrich-insee.mjs) en retirant les franchises de `ENSEIGNES_EXCLUES` pour ce batch spécifique.

Champs récupérables via `/api-sirene/3.11/siret/{siret}` :
- `adresseEtablissement.libelleCommuneEtablissement` → `ville`
- `adresseEtablissement.codePostalEtablissement` → `cp` (déjà présent)
- `adresseEtablissement.numeroVoieEtablissement` + `typeVoieEtablissement` + `libelleVoieEtablissement` → `adresse`
- `periodesEtablissement[0].enseigne1Etablissement` → **enseigne réelle de l'agence** (celle qu'on veut comme `nom`)

Quota API : 30 req/min en clé intégration → 640 centres = ~22 min de traitement.

**Avantage** : source officielle, données à jour.
**Limite** : nécessite SIRET. Si manquant sur certains, voie B.

### Voie B — Lookup FINESS CSV (fallback)

Parser [scripts/finess-geoloc.csv](scripts/finess-geoloc.csv) (délimiteur `;`, 32 colonnes).

Structure pertinente :
- col 2 : `nofinesset` (FINESS établissement, unique)
- col 4 : `rs` (raison sociale)
- col 5 : `rslongue` (raison sociale longue)
- col 9-11 : numéro voie + type voie + libellé voie
- col 14 : CP + ville concaténés (ex: `30000 NIMES`)
- col 16 : département

Matching : par FINESS si présent, sinon par `SIRET → finess` si la correspondance est en base, sinon adresse + CP.

**Avantage** : pas de quota API.
**Limite** : ne couvre que les centres référencés FINESS (les audioprothésistes indépendants oui, mais pas certaines franchises qui peuvent avoir un référencement SIRENE uniquement).

### Voie C — Reverse-geocode (si lat/lng présents)

API publique : `https://api-adresse.data.gouv.fr/reverse/?lon=X&lat=Y`
Retourne ville + adresse normalisée.

**Avantage** : indépendant de SIRET/FINESS.
**Limite** : requêtes limitées à ~50/s sans clé API, et si lat/lng foireux → mauvaise ville.

### Voie D — Hybride recommandée

1. D'abord SIRET (plus fiable, meilleure enseigne)
2. Si échec → FINESS CSV
3. Si échec → reverse-geocode lat/lng
4. Si échec → flag `ville='À vérifier'` + noindex permanent (rescue group, investigation manuelle)

## 5. Stratégie d'exécution

### Étape 1 — Backup (NON NÉGOCIABLE)
- `pg_dump` Supabase des 640 lignes ciblées avant toute modification
- Stockage : `reports/backup-centres-corrompus-{date}.sql`

### Étape 2 — Diagnostic (read-only)
- Lancer `scripts/diagnostic-centres-corrompus.ts`
- Résultat : combien ont SIRET / FINESS / lat-lng / claim
- Décider quelle voie (A/B/C/D) appliquer

### Étape 3 — Script de fix dédié
Créer `scripts/reimport-franchises-from-finess.mjs` :
- Lit `reports/centres-audika-corrompus.csv` (les 640 ids)
- Pour chaque id : applique la voie choisie, récupère {nom, ville, adresse} propres
- Regénère slug : `slugifyCentre(nom, ville, cp, idSuffix)`
- Update Supabase uniquement les champs ciblés (ville, nom, adresse, slug)
- **PRÉSERVE** les champs enrichis utilisateur si `plan ∈ {claimed, premium}` : `a_propos`, `photo_url`, `horaires`, `marques`, `specialites`, `audio_prenom`, etc.
- Mode `--dry-run` par défaut, `--apply` explicite, batch size = 50
- Logs détaillés + rapport final CSV

### Étape 4 — Redirects 301 pour les anciens slugs
Les 640 URLs `/centre/{ancien-slug}/` ont pu être indexées par Google (ne serait-ce qu'à titre de "non indexée explorée"). Pour éviter les 404 en cascade :
- Générer `.json` des mappings `{ oldSlug, newSlug }` pendant le fix
- Les ajouter en bulk à `vercel.json` ou mieux : table Supabase `centre_redirects` + middleware Astro qui lookup et redirige 301

### Étape 5 — Validation
- `npm run build` (vérifier 0 erreur Astro)
- Test manuel : 5 URLs random parmi les 640 → nouvelle URL, fiche complète, breadcrumb OK
- Crawler interne (Pagefind rebuild)
- GSC : resoumettre le sitemap `sitemap-centres.xml` (il contiendra maintenant les bons slugs, car filtre plan≠'rpps' du Lot 1)

### Étape 6 — Monitoring
- À J+7 : pages indexées de la cohorte via GSC
- À J+30 : ranking sur requêtes `audioprothesiste {ville}` pour les 640 agences

## 6. Risques et mitigations

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Perte de données utilisateur sur fiches claimed | Moyenne | Merge explicite, jamais d'overwrite sur {a_propos, photo_url, horaires} |
| 404 en cascade sur anciens slugs | Élevée | Redirects 301 bulk (étape 4) |
| API INSEE quota / latence | Faible | Rate limit 28 req/min + retry + fallback FINESS CSV |
| Données FINESS obsolètes | Moyenne | CSV daté 2026-03-11, acceptable pour ~1 mois |
| SIRET absent sur franchises | Possible | Voie B/C fallback |
| Mauvaise ville INSEE (siège vs établissement) | Possible | Toujours utiliser `adresseEtablissement` (pas `adresseUniteLegale`) |

## 7. Timeline estimée

- Étape 1 (backup) : 15 min
- Étape 2 (diagnostic) : 1 h (script + analyse)
- Étape 3 (script fix + tests) : 4-6 h (dev + batch tests sur 10 fiches)
- Étape 4 (redirects 301) : 2 h (implémentation middleware + données)
- Étape 5 (validation) : 1 h
- Étape 6 (monitoring) : passif, suivi hebdo

**Total actif** : 8-10 h réparties sur 2-3 jours.

## 8. Fichiers attendus en sortie

- `scripts/diagnostic-centres-corrompus.ts` — diagnostic read-only
- `scripts/reimport-franchises-from-finess.mjs` — script de fix principal
- `src/middleware.ts` (ou extension existante) — redirects 301 centre_redirects
- `reports/backup-centres-corrompus-{date}.sql` — backup avant fix
- `reports/reimport-log-{date}.csv` — log de chaque update
- Table Supabase `centre_redirects(old_slug PK, new_slug, created_at)` — migration SQL

## 9. Relation avec le Lot 1 GSC

**Le Lot 1 peut être mergé sans attendre ce chantier.** Le filtre `plan ∈ {claimed, premium}` du sitemap-centres.xml exclut déjà automatiquement les 640 fiches corrompues (aucune n'est claimed, toutes sont `plan='rpps'`). Elles sortent donc des sitemaps soumis et reçoivent `noindex,follow` — Google les désindexera naturellement.

Le ré-import FINESS est un chantier **d'amélioration de la qualité catalogue** qui débloquera **l'indexation de 640 fiches légitimes** une fois rendues indexables (claimed ou enrichies automatiquement).

## 10. Décisions à valider avant implémentation

1. **Voie privilégiée** : A (INSEE), B (FINESS), C (reverse-geocode) ou D (hybride) ?
2. **Fiches premium/claimed** : on préserve quels champs précisément ?
3. **Redirects 301** : middleware Astro ou bulk dans `vercel.json` (limite 1024 entrées Vercel) ?
4. **Délai** : chantier prioritaire post-Lot 1, ou attendre résultats GSC à J+30 pour vérifier l'utilité ?
