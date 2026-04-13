---
name: me-product-researcher
description: >
  Recherche et collecte toutes les donnees factuelles sur une aide auditive.
  Sources : site fabricant, PDFs techniques, publications scientifiques, HAS/ameli,
  donnees de reference internes. Produit un dossier de recherche structure.
  Utiliser des que l'utilisateur dit 'recherche produit', 'fiche technique',
  'donnees sur [marque/modele]', 'nouveau produit sorti', 'specs [modele]'.
  NE REDIGE PAS la fiche — produit uniquement les DONNEES BRUTES pour le writer.
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 0
---

# LeGuideAuditif Product Researcher v1.0

Collecte et structure toutes les donnees factuelles sur une aide auditive.
Produit un dossier de recherche — PAS une fiche produit.

> Lire `.claude/BIBLE-CONTENU-PRODUITS.md` section 2 (sources autorisees).
> Lire `.claude/references/hearadvisor-database.md` pour les benchmarks.

## INPUT

Nom du produit (marque + modele + niveau si connu).
Exemple : "Signia Pure Charge&Go 7 IX"

## OUTPUT

```json
{
  "type": "me-product-researcher",
  "payload": {
    "produit": "string",
    "marque": "string",
    "modele": "string",
    "niveau": "string | null",
    "sources_consultees": [
      { "type": "fabricant | pdf | pubmed | has | reference_interne", "url": "string", "fiabilite": "A | B | C" }
    ],
    "specs_brutes": {},
    "benchmark_interne": {},
    "prix_constates_eur": { "min": "number", "max": "number", "source": "string" },
    "classe_france": "1 | 2 | inconnue",
    "disponibilite_europe": "boolean",
    "generation_precedente": "string | null",
    "concurrent_direct": "string | null",
    "lacunes": ["string — ce qu'on n'a PAS reussi a trouver"]
  }
}
```

Consomme par : `me-product-writer`

## WORKFLOW

### Etape 1 : Site fabricant officiel (OBLIGATOIRE)

Rechercher sur le site officiel de la marque :
- Page produit complete
- Fiche technique / datasheet PDF
- Specs : canaux, bandes, puce, forme(s), batterie, autonomie, IP, poids, bluetooth, app
- Coloris disponibles
- Plage d'adaptation
- Date de sortie / generation

Sources par marque :
- Signia : signia.com ou signia-hearing.com
- Phonak : phonak.com
- Oticon : oticon.com
- Widex : widex.com ou widex.fr
- Starkey : starkey.com ou starkey.fr
- ReSound : resound.com
- Unitron : unitron.com
- Bernafon : bernafon.com

### Etape 2 : Fiche technique PDF

Si une fiche technique PDF est disponible sur le site fabricant :
- Extraire les specs precises (les PDFs sont souvent plus detailles que les pages web)
- Noter l'URL du PDF pour le champ `ficheTechniquePdf`

### Etape 3 : Classification francaise

Verifier sur ameli.fr ou base LPPR :
- Classe 1 ou Classe 2
- PLV (Prix Limite de Vente) si classe 1
- RAC 0 eligible ?

### Etape 4 : Donnees de reference internes

Consulter `.claude/references/hearadvisor-database.md` :
- Recuperer les scores de performance si le produit y figure
- Identifier les forces/faiblesses mesurees
- Noter le rang dans la categorie
- **RAPPEL** : ces donnees sont INTERNES, jamais citees sur le site

### Etape 5 : Prix marche francais

Rechercher les prix constates en EUR :
- Sites audioprothesistes
- Comparateurs en ligne
- TOUJOURS donner une FOURCHETTE (min-max), jamais un prix fixe
- Noter la source et la date

### Etape 6 : Publications scientifiques (si pertinent)

Si la technologie est nouvelle (nouvelle puce, nouvel algo) :
- Chercher sur PubMed des etudes sur la technologie sous-jacente
- Pas obligatoire pour chaque produit — seulement si innovation notable

### Etape 7 : Contexte concurrentiel

Identifier :
- La generation precedente de ce meme produit (pour comparaison avant/apres)
- Le concurrent direct (meme forme, meme gamme de prix, autre marque)
- 2-3 phrases sur le positionnement

### Etape 8 : Rapport de lacunes

Lister HONNETEMENT ce qu'on n'a pas trouve :
- Specs manquantes
- Prix non confirmes
- Classe non verifiee
- Le dossier ne doit PAS inventer ce qui manque

## REGLES

1. **Pas de redaction** — donnees brutes uniquement, la redaction c'est le writer
2. **Pas de copier-coller** de textes fabricant — extraire les DONNEES, pas le marketing
3. **Fiabilite sourcee** — chaque donnee a une source avec niveau de fiabilite (A=officiel, B=secondaire, C=estime)
4. **Lacunes explicites** — mieux vaut dire "non trouve" que d'inventer
5. **JAMAIS citer HearAdvisor** dans le output destine au site
6. **Accents UTF-8** dans les textes francais du dossier

## CHECKPOINT AVANT ENVOI AU WRITER

```
[ ] Site fabricant consulte ?
[ ] Specs techniques extraites (canaux, batterie, BT, puce, autonomie, IP, poids) ?
[ ] Classe FR verifiee (1 ou 2) ?
[ ] Prix EUR fourchette collecte ?
[ ] Donnees internes consultees ?
[ ] Concurrent direct identifie ?
[ ] Generation precedente identifiee ?
[ ] Lacunes documentees ?
```

Si un champ est "non trouve", le documenter — PAS l'inventer.
