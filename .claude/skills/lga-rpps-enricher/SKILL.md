---
name: lga-rpps-enricher
description: "Enrichit chaque nouvel audioprothésiste détecté : email, GBP, site web, LinkedIn via web search + Apollo. Utiliser dès que l'utilisateur dit 'enrichis les nouveaux', 'enrichissement RPPS', 'complète les fiches'. Produit un JSON enrichi consommable par lga-rpps-outreach. NE PAS utiliser pour détecter (lga-rpps-detector) ni envoyer d'emails (lga-rpps-outreach)."
---

# LGA RPPS Enricher v1.0

Enrichit les nouveaux audioprothésistes détectés avec email, GBP, LinkedIn, site web.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

JSON `"type": "rpps_detected"` produit par `lga-rpps-detector`.

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

Consommé par `lga-rpps-outreach`.

## EXECUTION

Chaîne d'enrichissement pour chaque praticien :

1. **Apollo** : chercher par nom + prénom + ville via Apollo MCP `apollo_people_match`
2. **Web search** : `"{prénom} {nom} audioprothésiste {ville}"` → LinkedIn, site web
3. **Web search** : `"{nom centre ou enseigne} audioprothésiste {ville} avis Google"` → GBP
4. Si email trouvé nulle part : marquer `enrichment_quality: "low"`

## WORKFLOW

1. Lire JSON `rpps_detected` en input
2. Pour chaque praticien (batch de 10 max) :
   a. Apollo people_match (nom, prénom, ville, titre "audioprothésiste")
   b. Web search identité → LinkedIn + site web
   c. Web search GBP → rating + avis + URL
   d. Calculer ICP score (présence digitale + type centre + géographie)
3. Classifier enrichment_quality : high (email + LinkedIn), medium (email OU LinkedIn), low (rien)
4. Créer/mettre à jour fiche dans Notion pipeline prospection
5. Upsert dans Supabase table `rpps_practitioners`
6. Produire JSON `rpps_enriched`

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ENRICHISSEMENT — {count} audios traités

Avec email : {with_email}/{total}
Avec LinkedIn : {with_linkedin}/{total}
Avec GBP : {with_gbp}/{total}
Qualité haute : {high_quality}/{total}

Top prospects (ICP > 60) :
{nom, ville, icp_score, enrichment_quality pour les meilleurs}

→ Lancer l'outreach sur les {high_quality} prospects qualifiés ? (oui/non)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Créer/update fiches dans pipeline prospection : `e69d548d-c812-409c-ad60-485c4f8b8379`
Champs : Nom, Ville, Email, LinkedIn, GBP, ICP Score, Source=RPPS, Statut=À contacter
