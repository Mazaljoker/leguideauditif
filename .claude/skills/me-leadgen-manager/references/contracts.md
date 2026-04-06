# Contrats JSON — me-leadgen-manager

## Output Contract

```json
{
  "type": "me-leadgen-manager",
  "payload": {
    "period": "string (ISO week)",
    "leads_total": "number",
    "leads_qualified": "number",
    "leads_dispatched": "number",
    "partners": [
      {
        "name": "string",
        "leads_sent": "number",
        "converted": "number"
      }
    ],
    "conversion_rate": "number (0-1)",
    "revenue_estimated": "number (€)",
    "top_pages": ["string (slug)"],
    "actions": ["string"]
  }
}
```

## Consumed by

- `nposts-analytics-interpreter` : corrélation trafic organique ↔ volume leads
- `nposts-linkedin-copywriter` : chiffres social proof pour posts ("42 demandes de devis cette semaine")

## Lead Qualification Criteria

- Code postal couvert par au moins 1 partenaire
- Perte auditive déclarée (légère/moyenne/sévère/profonde)
- Consentement RGPD coché
- Téléphone valide (format FR)

## Partner Pricing Model

- Lead qualifié standard : 15-20€
- Lead qualifié premium (classe 2, budget >1500€) : 25-30€
- Facturation mensuelle, paiement à 30j