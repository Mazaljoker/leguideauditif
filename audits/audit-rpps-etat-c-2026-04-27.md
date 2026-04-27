# Audit RPPS — fiches `etat_administratif='C'` (établissements cessés)

- **Date** : 2026-04-27
- **Branche** : `fix/etat-administratif-public-filter`
- **Source** : projet Supabase `ftinchxyuqpnxilypmyk` (LeGuideAuditif), table `public.centres_auditifs`
- **Trigger** : signal terrain Aurélie Azam (Carcassonne), 27 avril 2026 — 2 fiches `UNION MUTUALITE FRANCAISE AUDE` affichées en public alors que l'entité juridique est cessée

## Volumes

### Total table

| Métrique | Valeur |
|---|---|
| Total fiches `centres_auditifs` | 9 393 |
| Fiches `etat_administratif='A'` (actif) | 9 108 |
| Fiches `etat_administratif='C'` (cessé) | **283** |
| Fiches `etat_administratif='F'` (fermé) | 2 |
| Fiches `etat_administratif IS NULL` | 0 |

État C = **3,01%** du parc total.

### Top 20 villes les plus impactées par l'état C

| Rang | Ville | Fiches C |
|---|---|---|
| 1 | PARIS | 6 |
| 2 | PARIS 10 | 3 |
| 3 | Paris 12e Arrondissement | 3 |
| 4 | MARSEILLE | 3 |
| 5 | TOULOUSE | 3 |
| 6 | SARREBOURG | 2 |
| 7 | BORDEAUX | 2 |
| 8 | PERPIGNAN | 2 |
| 9 | BAYONNE | 2 |
| 10 | MONTPELLIER | 2 |
| 11 | Manosque | 2 |
| 12 | Lille | 2 |
| 13 | BOURG-EN-BRESSE | 2 |
| 14 | SAINTE-FOY-LES-LYON | 2 |
| 15 | Quimper | 2 |
| 16 | LONS-LE-SAUNIER | 2 |
| 17 | **CARCASSONNE** | **2** |
| 18 | Tours | 2 |
| 19 | Rennes | 2 |
| 20 | METZ | 2 |

→ Carcassonne confirme bien le signal Aurélie (les 2 fiches Union Mutualité Française Aude).

### Cas Carcassonne (signal Aurélie)

```
slug : union-mutualite-francaise-aude-carcassonne-11000-f8ab98
adresse : 375 AV PAUL HENRI MOUTON, 11000 CARCASSONNE
etat : C (cessé)

slug : union-mutualite-francaise-aude-carcassonne-11000-e66257
adresse : 445 RUE MAGELLAN, 11000 CARCASSONNE
etat : C (cessé)
```

Ces 2 fiches sont issues du même SIREN `UNION MUTUALITE FRANCAISE AUDE` (entité juridique cessée). L'entité repreneuse `MUTUALITE FRANCAISE GRAND SUD SSAM` n'a apparemment pas encore été synchronisée dans `centres_auditifs`. La sync RPPS bi-mensuelle (Sujet B) devrait corriger ce type de cas à l'avenir.

## Cas particuliers — décisions actées par Franck-Olivier (27/04)

### Q1 — Fiches en `etat_administratif='F'` (fermé)

| ID | Slug | Établissement | Ville |
|---|---|---|---|
| `8ae948d4-3760-4b73-a271-cf791c2d9744` | `amplifon-marmande-2529` | Amplifon Marmande (CCA-AMPLIFON) | Marmande (47200) |
| `282cdaf9-048d-4501-861c-32c5c995012d` | `ac-deserces-47200-marmande` | AC-DESERCES | Marmande (47200) |

**Décision** : la vue n'exclut que `C` (spec stricte). Côté page `/centre/[slug]`, on étend le 410 + page explicative aux fiches `F` aussi avec libellé adapté ("Ce centre est fermé" au lieu de "a cessé son activité"). Les 2 fiches `F` restent comptabilisées dans les listings de villes/départements (impact négligeable, 2/9393).

### Q2 — Fiches en état C **avec** `claim_status='approved'`

| ID | Slug | Email revendicateur | Ville |
|---|---|---|---|
| `4dd605ad-6c95-4541-a3e6-e1dfe61a1fa7` | `audilas-92160-antony` | `antony@sonoraudition.fr` | Antony (92160) |
| `cbf03c17-14e6-4b09-beef-aed3717216fb` | `audilas-93300-aubervilliers` | `aubervilliers@ideal-audition.fr` | Aubervilliers (93300) |

**Décision** : ces 2 fiches restent en exception car validées avant cette migration. La vue inclut donc `OR claim_status='approved'`. La page `/centre/[slug]` n'active pas le 410 si `claim_status='approved'`, même si `etat='C'/'F'`.

### Q3 — Numéro de migration

`main` à `ff69096` contient déjà `032_audiopro_unsubscribe_level.sql` (PR #100 mergée juste avant ce sprint). La migration de ce sprint a été renommée `033_centres_public_view.sql` après rebase.

## Décisions actées (final)

1. ✅ Vue Postgres `v_centres_auditifs_public` : `etat IS DISTINCT FROM 'C' OR claim_status='approved'`
2. ✅ Toutes les requêtes publiques pointent vers la vue (jamais admin)
3. ✅ Page `/centre/[slug]` lit la table complète et retourne **HTTP 410 Gone** + page explicative + 5 centres proches pour `etat IN ('C','F') AND claim_status != 'approved'`
4. ✅ Libellé adapté : "Ce centre est fermé" pour `F`, "Ce centre a cessé son activité" pour `C`
5. ✅ Migration numérotée `033_centres_public_view.sql` (032 occupé par PR #100)

## Requêtes SQL utilisées

```sql
-- Volume total
SELECT COUNT(*) FROM centres_auditifs WHERE etat_administratif = 'C';

-- Distribution
SELECT etat_administratif, COUNT(*) FROM centres_auditifs GROUP BY etat_administratif;

-- Top 20 villes
SELECT ville, COUNT(*) FROM centres_auditifs WHERE etat_administratif = 'C'
GROUP BY ville ORDER BY COUNT(*) DESC LIMIT 20;

-- Cas claim approved
SELECT id, slug, claimed_by_email FROM centres_auditifs
WHERE etat_administratif = 'C' AND claim_status = 'approved';

-- Cas Carcassonne
SELECT id, slug, adresse FROM centres_auditifs
WHERE ville ILIKE 'CARCASSONNE' AND etat_administratif = 'C';
```
