---
name: me-eeat-compliance
description: "Vérifie la conformité E-E-A-T et YMYL de chaque page LeGuideAuditif avant publication. Utiliser AUTOMATIQUEMENT après nposts-content-evaluator (double gate YMYL), ou quand l'utilisateur dit 'E-E-A-T', 'YMYL', 'conformité santé', 'mentions légales', 'auteur', 'sources médicales', 'crédibilité', 'Google santé', 'vérifier la page'. Produit un score E-E-A-T /100 + corrections. NE PAS utiliser pour la rédaction (content-writer, affiliate-writer) ni l'audit technique SEO (seo-auditor)."
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 4
---

# LeGuideAuditif E-E-A-T Compliance v1.0

Gate 2 du pattern GAN : audite chaque contenu pour conformité E-E-A-T et YMYL santé avant publication.

> Lire `references/contracts.md` pour les schémas JSON.

## INPUT

JSON `"type": "nposts-content-evaluator"` avec verdict PASS ≥70. Si le content-evaluator a REJECT/REVISE, NE PAS lancer ce skill — renvoyer au générateur.

## OUTPUT

```json
{
  "type": "me-eeat-compliance",
  "payload": {
    "slug": "string",
    "score_eeat": 85,
    "score_experience": 90,
    "score_expertise": 95,
    "score_authority": 75,
    "score_trust": 80,
    "verdict": "PASS|REVISE|REJECT",
    "issues": [
      { "type": "missing_author_bio", "severity": "high", "fix": "Ajouter encadré auteur avec DE + années exp" }
    ],
    "fixes_applied": ["Ajout mention légale", "Source HAS ajoutée"]
  }
}
```

Consommé par : `nposts-seo-fixer` (applique les corrections avant PR).

## WORKFLOW

1. **Check Auteur** : Page `/auteur/franck-olivier/` existe ? Bio (DE, 25 ans, 18 centres) ? Photo réelle ? Liens vérifiables (LinkedIn, ADELI) ? Encadré auteur en bas ?
2. **Check Sources** : Chaque claim médicale sourcée (HAS, INSERM, OMS, PubMed) ? Liens vers primaires ? Sources < 3 ans ? Pas de claims thérapeutiques non prouvées ?
3. **Check YMYL** : Disclaimer santé ? Mention affiliation si liens commerciaux ? Politique confidentialité ? CGU éditeur ? RGPD formulaires ?
4. **Check Confiance** : HTTPS ? Pas de pub intrusive ? Cohérence inter-pages ? Pas de superlatifs sans nuance ? Dates pub/MAJ visibles ?
5. **Scoring** : Score /100 par pilier, Trust pondéré ×1.75 (YMYL). Seuils : PASS ≥80 | REVISE 60-79 | REJECT <60.
6. **Fixes auto** : Pour issues severity=high, injecter le fix exact (templates ci-dessous).

## TEMPLATES À INJECTER

### Encadré Auteur
```markdown
**À propos de l'auteur** — Franck-Olivier est audioprothésiste diplômé d'État avec plus de 25 ans d'expérience. Il a dirigé 18 centres Alain Afflelou Acousticien et accompagné des milliers de patients dans leur parcours d'appareillage auditif. [En savoir plus →](/auteur/franck-olivier/)
```

### Disclaimer Santé
```markdown
> ⚕️ **Information santé** — Les informations contenues dans cet article sont données à titre indicatif et ne sauraient se substituer à l'avis d'un professionnel de santé. Consultez un médecin ORL pour un diagnostic personnalisé.
```

### Mention Affiliation
```markdown
> 📋 **Transparence** — Certains liens de cet article sont des liens affiliés. Si vous effectuez un achat via ces liens, nous percevons une commission sans surcoût pour vous. Notre avis reste totalement indépendant. [Notre politique éditoriale →](/a-propos/politique-editoriale/)
```

## CHECKPOINT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ E-E-A-T AUDIT — {slug}

Score global : {X}/100
  Experience : {X} | Expertise : {X}
  Authority  : {X} | Trust : {X} (×1.75)

Verdict : {PASS|REVISE|REJECT}
Issues : {N} ({N} high, {N} medium, {N} low)
Fixes auto-appliqués : {N}

→ Passer au fixer ? (oui/corriger)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## NOTION

Logger le score E-E-A-T par article dans la base éditoriale ME.