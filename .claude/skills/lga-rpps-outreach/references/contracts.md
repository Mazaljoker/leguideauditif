# LGA RPPS Outreach — Contrat JSON

## INPUT

```json
{
  "type": "rpps_enriched",
  "payload": {
    "enriched_practitioners": [
      {
        "rpps_id": "string",
        "nom": "string",
        "prenom": "string",
        "ville": "string",
        "change_type": "new | address_change",
        "email": "string | null",
        "linkedin_url": "string | null",
        "enseigne": "string | null",
        "icp_score": "number",
        "enrichment_quality": "high | medium | low"
      }
    ]
  }
}
```

Produit par : `lga-rpps-enricher`

## OUTPUT

```json
{
  "type": "rpps_outreach_sent",
  "payload": {
    "sent": [
      {
        "rpps_id": "string",
        "nom": "string",
        "email": "string",
        "template_used": "welcome_new | welcome_move",
        "sent_at": "ISO8601",
        "apollo_sequence_id": "string | null"
      }
    ],
    "skipped": [
      {
        "rpps_id": "string",
        "nom": "string",
        "reason": "no_email | low_quality | already_contacted"
      }
    ],
    "stats": {
      "eligible": "number",
      "sent": "number",
      "skipped": "number"
    }
  }
}
```

Consommé par : aucun (fin de chaîne). Reporting dans Notion.
