# Audit + ménage prospects ↔ centres revendiqués — 2026-04-22

## Contexte

Le pivot `prospect_centres` était totalement vide (0 ligne) malgré 65 centres revendiqués (`claim_status IN ('pending','approved')`) et 7 prospects en base. L'auto-création de liens dans [src/pages/api/admin/prospects/create.ts](../src/pages/api/admin/prospects/create.ts) ne s'était jamais déclenchée parce que les 7 prospects existants venaient du seed SQL de la migration 012 (insérés directement en base, hors flow API).

## État avant / après

| Métrique | Avant | Après |
|---|---:|---:|
| Prospects | 7 | **44** (+37) |
| Liens `prospect_centres` | 0 | **64** (+64) |
| Centres revendiqués | 65 | 65 |
| Centres orphelins (sans prospect) | 65 | **1** (centre test admin, volontaire) |
| Prospects `entrant` sans centre | 3 | 0 |
| Doublons prospects | 0 | 0 |
| Divergences nom audio vs prospect | 0 | 0 |

## Actions exécutées

### Étape 1 — Backfill des 3 prospects `entrant` existants (5 liens)

Matching validé par jointure `CP prospect = CP centre + nom audio ⊆ claimed_by_name` :

| Prospect | Centres liés |
|---|---|
| Céline Portal | `audition-juan-les-pins-antibes-0017` |
| Nathalye Poirot | `audition-le-val-d-ajol-88340` (primary) + `audition-88160-le-thillot` |
| Sandrine Brion-Bogard | `audio-2000-contrexeville-88140` (primary) + `audition-88000-epinal` |

### Étape 2 — Batch A : 11 nouveaux prospects multi-centres (33 liens)

| # | Prospect | Entité | Centres | Note |
|---|---|---|---:|---|
| 1 | Victor Dardenne | Sonance Audition / Dardenne Audition | **9** | Gros compte Normandie, prio |
| 2 | Jacques Tourre | Acoustique Santé | 3 | Bouches-du-Rhône |
| 3 | Anthony Athuil | Laboratoire Auditif Athuil | 3 | **PREMIUM + is_fondateur=TRUE** |
| 4 | Julie Moreaux | Audition Moreaux Delmas | 2 | Pyrénées-Atlantiques |
| 5 | Aurélie Badel Faurite | Saône Audition | 2 | Ain / Rhône |
| 6 | Justine Tossut | Chez L'Audio | 2 | Charente-Maritime |
| 7 | Catherine Frébutte | Audika | 2 | Salariée Audika (Demant) |
| 8 | Nicolas Gouesnard | Audition Gouesnard | 2 | Aisne / Marne |
| 9 | Emilie Hardier | Audition Hardier / Hainaut | 3 | **3 emails distincts fusionnés** |
| 10 | Benjamin Astruc | Meilleur Audio | 3 | **3 emails distincts fusionnés** |
| 11 | Aymeric Juen | Alain Afflelou Acousticien | 2 | **2 emails distincts fusionnés** |

### Étape 2 — Batch B : 26 nouveaux prospects mono-centre (26 liens)

Margaux Younes, Fabien Andreo, Florian Goujon, Eliot Simon, Yann Michaud, Catherine Legros, Axelle Vaqué, Anthony Rogard, Romain Giroud-Argoud, Amaury Montiel, Noam Amsellem, Laurent Thouvenot, Nathan Marciano, Avy Knafo, Avidan Sayada, Mathieu Bodin, Jonathan Ouanounou, Camille Mandrant, Hugo Delatour, Michael Brahami, Julie Alexis, Céline Verroust Rety, Maxime Lemonnier, Gaelle Nezonde Hollart, Pascal Celma, Lucie Bertrand.

**Cas spéciaux** :
- `audio.bertrand@gmail.com` partagé entre 2 personnes (Pascal Celma @ Castelnau 31620, Lucie Bertrand @ Beaumont-de-Lomagne 82500) → 2 prospects distincts, 1 centre chacun.
- `franckolivierchabbat@gmail.com` (centre test admin `le-guide-auditif-69630-chaponost`) → **volontairement skippé** (1 seul orphelin restant).

### Étape 3 — UI carte prospect (3 fichiers)

- [src/types/prospect.ts](../src/types/prospect.ts) — ajout `claimed_by_name` et `claimed_at` sur `CentreAuditif`.
- [src/pages/api/admin/prospects/centres/list.ts](../src/pages/api/admin/prospects/centres/list.ts) — ajout au `SELECT` PostgREST.
- [src/components/admin/prospects/LinkedCentreCard.tsx](../src/components/admin/prospects/LinkedCentreCard.tsx) — affichage `"Revendiquée le 15 avril 2026 par Céline PORTAL"` sous la carte.

## Anomalies détectées (à qualifier humainement)

1. **`audition-amandinois-59230-saint-amand-les-eaux`** : revendiqué par Emilie Hardier (RPPS `10009270090`) mais `audio_prenom/audio_nom` = `MAURICIO MARTINEZ GREVESSE`. À vérifier : claim valide (Hardier employeur/associé) ou données RPPS obsolètes ?
2. **`optical-center-49000-angers`** : `claimed_by_adeli = "1"` — valeur manifestement incorrecte, à corriger.
3. **ADELI avec espaces ou mal formatés** sur plusieurs centres Dardenne (`"832 912 414 00030"`, etc.) — format à normaliser.
4. **Champs `audio_prenom/audio_nom` NULL** sur 30+ centres revendiqués — à enrichir via ETL RPPS ou formulaire de maj fiche.

## Root cause (pourquoi les liens manquaient)

L'auto-création de liens dans `POST /api/admin/prospects/create` ne matche via `claim_attributions` que si le flow UTM complet a été emprunté (landing page → claim avec transaction_id). Les claims effectués sans passage par le formulaire UTM (ou avant la mise en place du tracking) ne peuplaient pas `claim_attributions` → aucun match possible, aucun lien créé.

### Étape 4 — Trigger Postgres (migration 016) — EXÉCUTÉE

Migration `016_auto_link_claimed_centre_trigger` appliquée. Fichier : `supabase/migrations/016_auto_link_claimed_centre_trigger.sql` (traçable via l'historique Supabase).

**Comportement** :
- `AFTER UPDATE OF claim_status ON centres_auditifs` avec `WHEN (NEW.claim_status = 'approved' AND OLD.claim_status IS DISTINCT FROM 'approved')`.
- Si aucun lien `prospect_centres` n'existe pour ce centre :
  - Si un prospect existe déjà pour cet email (via un autre centre lié) → crée seulement le lien (`is_primary=FALSE`)
  - Sinon → crée le prospect (`source='entrant'`, `status='prospect'`, `name=claimed_by_name`, `company=centre.nom`, `cp`, `departement`) + le lien (`is_primary=TRUE`)
- `SECURITY DEFINER` pour bypass RLS sur `prospects`/`prospect_centres` (tables réservées service_role).

**Tests de validation** :

| Cas | Attendu | Résultat |
|---|---|---|
| Claim admin Franck-Olivier (email inconnu du CRM) | Nouveau prospect + lien primary | ✅ Prospect `bf9fb6ce…` créé, lien primary |
| Détacher + re-claim centre Dardenne (email connu) | Lien secondaire seulement, 0 doublon prospect | ✅ `is_primary=FALSE`, Dardenne count reste à 1 |
| Re-approve d'un centre déjà lié | Aucune action | ✅ Garde-fou `EXISTS` respecté |

## Vérification intégrité finale

```sql
SELECT
  (SELECT COUNT(*) FROM prospects)                      AS prospects_total,     -- 45
  (SELECT COUNT(*) FROM prospect_centres)               AS liens_total,         -- 65
  (SELECT COUNT(*) FROM centres_auditifs
     WHERE claim_status IN ('pending','approved'))      AS centres_claimed,     -- 65
  (SELECT COUNT(*)
     FROM centres_auditifs c
     LEFT JOIN prospect_centres pc ON pc.centre_id = c.id
     WHERE c.claim_status IN ('pending','approved')
       AND pc.centre_id IS NULL)                        AS orphelins;           -- 0
```

**État final : 0 centre orphelin, 100% de couverture.** Toute nouvelle revendication approuvée sera automatiquement reliée via le trigger.
