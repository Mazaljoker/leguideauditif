# LGA RPPS Detector — Contrat JSON

## INPUT

Standalone (cron ou manuel). Pas de JSON en entrée.
Dépendances :
- Supabase table `rpps_sync` : `{ last_run_date: "ISO8601" }`
- Supabase table `rpps_practitioners` : snapshot RPPS existant
- Variable d'env `ESANTE_API_KEY`

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

Consommé par : `lga-rpps-enricher`
