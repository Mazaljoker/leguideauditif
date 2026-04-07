---
name: me-leadgen-manager
description: "Gère le pipeline de leads LeGuideAuditif : formulaires devis, tracking conversions, dashboard partenaires audioprothésistes. Utiliser dès que l'utilisateur dit 'leads', 'formulaire devis', 'partenaire audio', 'combien de leads', 'conversion', 'tracking lead', 'dashboard leads', 'audioprothésiste partenaire', 'monetisation'. Produit un rapport de performance lead gen + actions. NE PAS utiliser pour la rédaction SEO (seo-content-writer) ni les visuels (social-creator)."
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: "Level 4 feedback"
---

# LeGuideAuditif Lead Gen Manager v1.0

Gère le cycle complet des leads : collecte via formulaires → qualification → dispatch partenaires → tracking conversion → reporting. Alimente le feedback loop GAN Level 4.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

Aucun JSON requis (standalone) OU rapport `nposts-analytics-interpreter` pour corrélation trafic/leads.

## OUTPUT

```json
{
  "type": "me-leadgen-manager",
  "payload": {
    "period": "2026-W15",
    "leads_total": 42,
    "leads_qualified": 28,
    "leads_dispatched": 25,
    "partners": [
      { "name": "Centre Audition Paris 11", "leads_sent": 8, "converted": 3 }
    ],
    "conversion_rate": 0.12,
    "revenue_estimated": 750,
    "top_pages": ["comparatif-appareil-auditif-classe-1", "prix-aide-auditive-2026"],
    "actions": ["Relancer Centre Lyon — 0 réponse depuis 7j"]
  }
}
```

## CHAÎNE GAN — Rôle Level 4 (Feedback Loop)

```
me-leadgen-manager.top_pages → corrèle avec me-eeat-compliance.score_eeat
  → Si page top_lead + score_eeat < 80 : alerte recalibrage
  → Si page high_eeat + 0 leads : alerte contenu non-convertissant
  → Données consommées par nposts-weekly-retrospective pour recalibrage poids évaluateurs
```

Consommé par : `nposts-analytics-interpreter`, `nposts-linkedin-copywriter` (social proof), `nposts-weekly-retrospective` (Level 3).

## WORKFLOW

1. **Inventaire formulaires** : Lister pages avec formulaire devis. Vérifier UTM source + page référente tracée.
2. **Collecte leads** : Compter leads période via GA4 events (`form_submit`) ou Notion pipeline.
3. **Qualification** : Code postal couvert ? Perte auditive déclarée ? Consentement RGPD ? Téléphone valide ?
4. **Dispatch** : Vérifier envoi au partenaire zone. Identifier leads orphelins (pas de partenaire).
5. **Suivi conversion** : Leads dispatchés > 7j → vérifier retour partenaire. Calculer taux conversion.
6. **Corrélation GAN** : Croiser top_pages avec scores E-E-A-T et content-evaluator → détecter anomalies.

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 LEAD GEN REPORT — {période}

{N} leads collectés | {N} qualifiés | {N} dispatchés
Taux conversion : {X}% | Revenu estimé : {X}€
Top page : {page} (E-E-A-T: {score}/100)
Corrélation GAN : {N} anomalies détectées
Actions : {action_1}, {action_2}

→ Valider et envoyer aux partenaires ? (oui/non)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Écrire dans la base Leads LeGuideAuditif (colonnes : Date, Nom, Téléphone, Code Postal, Page source, Score E-E-A-T page, Partenaire assigné, Statut, Conversion).