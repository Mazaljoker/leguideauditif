---
name: lga-rpps-detector
description: "Interroge l'API FHIR Annuaire Santé pour détecter les audioprothésistes nouvellement inscrits ou ayant changé de lieu d'exercice. Utiliser dès que l'utilisateur dit 'nouveaux centres', 'détection RPPS', 'nouveaux audios', 'cron RPPS'. Produit un JSON de nouveaux audios consommable par lga-rpps-enricher. NE PAS utiliser pour l'enrichissement (lga-rpps-enricher), l'envoi d'emails (lga-rpps-outreach), ni la prospection Apollo (nposts-email-copywriter)."
---

# LGA RPPS Detector v1.0

Détecte les nouveaux audioprothésistes inscrits au RPPS via l'API FHIR Annuaire Santé.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

Aucun JSON requis (standalone). Récupère `last_run_date` depuis Supabase table `rpps_sync`.
Si première exécution : `last_run_date` = date du jour - 7 jours.

## OUTPUT

```json
{
  "type": "rpps_detected",
  "payload": {
    "run_date": "ISO8601",
    "last_run_date": "ISO8601",
    "new_practitioners": [
      {
        "rpps_id": "string",
        "nom": "string",
        "prenom": "string",
        "qualification": "audioprothésiste",
        "adresse_exercice": "string",
        "code_postal": "string",
        "ville": "string",
        "telephone": "string | null",
        "last_updated": "ISO8601",
        "change_type": "new | address_change"
      }
    ],
    "count": "number"
  }
}
```

Consommé par `lga-rpps-enricher`.

## EXECUTION

```bash
cd /home/claude/lga-rpps-detector/scripts
pip install annuaire-sante-fhir supabase --break-system-packages
python detect.py
```

## WORKFLOW

1. Lire `last_run_date` depuis Supabase table `rpps_sync`
2. Appeler API FHIR v2 : `Practitioner?qualification-code=26&active=true&_lastUpdated=ge{last_run_date}`
3. Pour chaque résultat : extraire identité + adresse d'exercice via PractitionerRole
4. Comparer avec la table `rpps_practitioners` Supabase → classifier new / address_change
5. Écrire `run_date` dans Supabase `rpps_sync`
6. Produire JSON `rpps_detected`

> Note : code profession audioprothésiste = "26" dans TRE-G15.
> Clé API FHIR : variable d'env `ESANTE_API_KEY` (obtenue via GRAVITEE portal.api.esante.gouv.fr).

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DÉTECTION RPPS — {run_date}

Période : {last_run_date} → {run_date}
Nouveaux audios : {count_new}
Changements adresse : {count_change}
Total à enrichir : {count}

Liste :
{nom, ville, change_type pour chaque}

→ Lancer l'enrichissement ? (oui/non)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Écrire Type="rpps_detected" dans `e69d548d-c812-409c-ad60-485c4f8b8379`
