# LGA RPPS Enricher — Contrat JSON

## INPUT

```json
{
  "type": "rpps_detected",
  "payload": {
    "new_practitioners": [
      {
        "rpps_id": "string",
        "nom": "string",
        "prenom": "string",
        "adresse_exercice": "string",
        "code_postal": "string",
        "ville": "string",
        "telephone": "string | null",
        "change_type": "new | address_change"
      }
    ]
  }
}
```

Produit par : `lga-rpps-detector`

## OUTPUT

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
        "email_source": "apollo | web | null",
        "linkedin_url": "string | null",
        "gbp_url": "string | null",
        "gbp_rating": "number | null",
        "gbp_reviews": "number | null",
        "website": "string | null",
        "enseigne": "string | null",
        "icp_score": "number (0-100)",
        "enrichment_quality": "high | medium | low"
      }
    ],
    "stats": {
      "total": "number",
      "with_email": "number",
      "with_linkedin": "number",
      "with_gbp": "number",
      "high_quality": "number"
    }
  }
}
```

Consommé par : `lga-rpps-outreach`
