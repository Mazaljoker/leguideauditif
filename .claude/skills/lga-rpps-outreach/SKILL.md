---
name: lga-rpps-outreach
description: "Envoie un email de bienvenue personnalisé via Apollo aux nouveaux audioprothésistes enrichis, proposant la fiche LGA gratuite. Utiliser dès que l'utilisateur dit 'envoie les emails', 'outreach nouveaux centres', 'welcome email RPPS'. Produit un statut d'envoi + mise à jour Notion. NE PAS utiliser pour détecter (lga-rpps-detector), enrichir (lga-rpps-enricher), ni pour la prospection LinkedIn (skill-message)."
---

# LGA RPPS Outreach v1.0

Envoie l'email de bienvenue aux nouveaux audioprothésistes détectés par le pipeline RPPS.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

JSON `"type": "rpps_enriched"` produit par `lga-rpps-enricher`.
Seuls les praticiens avec `enrichment_quality: "high" | "medium"` ET `email != null` sont éligibles.

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

## EXECUTION

Via Apollo MCP : ajouter les contacts à une séquence Apollo dédiée.
OU via Gmail MCP : envoyer email individuel si pas d'Apollo sequence.

## WORKFLOW

1. Lire JSON `rpps_enriched` en input
2. Filtrer : garder uniquement `email != null` ET `enrichment_quality != "low"`
3. Vérifier dans Notion pipeline : déjà contacté ? → skip
4. Pour chaque éligible :
   a. Choisir template : `welcome_new` (nouveau) ou `welcome_move` (changement adresse)
   b. Personnaliser : {prénom}, {ville}, {enseigne si connue}, lien vers sa fiche LGA
   c. Envoyer via Apollo sequence OU Gmail
   d. Mettre à jour Notion : Statut = "Email envoyé", Date contact
5. Produire JSON `rpps_outreach_sent`

## TEMPLATES

### welcome_new
Objet : Votre centre apparaît déjà sur LeGuideAuditif.fr
Corps : Confrère, j'ai créé LeGuideAuditif.fr, le guide indépendant de l'audition.
Votre centre à {ville} y est déjà référencé gratuitement.
Vous pouvez enrichir votre fiche (spécialités, marques, horaires) ici : {lien_fiche}
— Franck-Olivier Chabbat, audioprothésiste DE

### welcome_move
Objet : Félicitations pour votre nouveau centre à {ville}
Corps : Confrère, j'ai vu que vous venez d'ouvrir à {ville}.
Votre nouveau centre apparaît déjà sur LeGuideAuditif.fr.
{même CTA}

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 OUTREACH RPPS — {date}

Éligibles : {eligible}
Envoyés : {sent}
Skippés : {skipped} ({raisons})

Détail envois :
{nom, ville, template pour chaque}

→ Confirmer l'envoi ? (oui/non)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Update fiches dans pipeline : `e69d548d-c812-409c-ad60-485c4f8b8379`
Champs : Statut="Email envoyé", Date contact={sent_at}, Canal="Email RPPS"
