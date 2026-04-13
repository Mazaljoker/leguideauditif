---
name: me-product-writer
description: >
  Redige les fiches produits du catalogue LeGuideAuditif a partir du dossier
  de recherche du product-researcher. Produit le JSON complet valide par le
  schema catalogueAppareils + contenu editorial expert.
  Utiliser des que l'utilisateur dit 'ecris la fiche', 'cree le produit',
  'redige la fiche [modele]', 'ajoute au catalogue'.
  NE PAS utiliser pour les articles/guides (utiliser me-affiliate-writer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 1
---

# LeGuideAuditif Product Writer v1.0

Transforme un dossier de recherche en fiche produit JSON complete.
Produit le fichier pret a etre depose dans `src/content/catalogue-appareils/`.

> Lire `.claude/BIBLE-CONTENU-PRODUITS.md` (TOUT le document).
> Lire `src/content.config.ts` pour le schema Zod exact.

## INPUT

Dossier de recherche du `me-product-researcher` (JSON structure).

## OUTPUT

1. Fichier JSON valide pour `src/content/catalogue-appareils/{slug}.json`
2. Rapport de notation (7 axes + noteExpert)

```json
{
  "type": "me-product-writer",
  "payload": {
    "slug": "string",
    "json_path": "src/content/catalogue-appareils/{slug}.json",
    "notation_rapport": {
      "efficacite_conversation": { "note": 0, "justification": "" },
      "streaming_musique": { "note": 0, "justification": "" },
      "connectivite": { "note": 0, "justification": "" },
      "praticite": { "note": 0, "justification": "" },
      "discretion": { "note": 0, "justification": "" },
      "robustesse": { "note": 0, "justification": "" },
      "innovation": { "note": 0, "justification": "" },
      "noteExpert": 0.0
    },
    "editorial_checklist": {
      "description_courte_ok": true,
      "description_complete_6_blocs": true,
      "points_forts_4_6": true,
      "points_faibles_3_5": true,
      "zero_marketing_language": true,
      "accents_utf8": true
    }
  }
}
```

Consomme par : `me-product-evaluator`

## WORKFLOW

### Etape 1 : Remplir les champs techniques du JSON

Mapper les donnees du researcher vers le schema `catalogueAppareils` :

```
slug                → marque-modele-niveau (ex: signia-pure-charge-and-go-7-ix)
marque              → enum (phonak, signia, etc.)
marqueLabel         → nom affichage (Signia, Phonak, etc.)
groupe              → enum (sonova, demant, ws-audiology, gn, starkey)
modele              → nom commercial ("Pure Charge&Go")
formeType           → enum (RIC, BTE, ITE, etc.)
formesDisponibles   → "RIC R|RIC RT|..." si multiple
puce                → plateforme ("IX Platform")
niveau              → "7", "90", "440"...
niveauRaw           → "7IX", "L90"...
niveauPosition      → 1-5 (1=entree, 5=excellence)
classe              → "1" ou "2"
rac0                → true si 100% Sante
prix.eur            → { unitaire, min, max }
annee               → annee de sortie
specs               → { canaux, bandes, batterie, autonomie, ip, reductionBruit, plageAdaptation, poids }
connectivite        → { bluetooth, auracast, application, mainLibre }
fonctionnalites     → { rechargeable, bobineT, acouphenes, antiFeedback, micDirectionnels, capteursSante }
couleurs            → nombre de coloris
image               → URL image fabricant (si autorise) ou null
sourceUrl           → URL page fabricant
venduEnEurope       → true/false
ficheTechniquePdf   → URL du PDF si disponible
```

**REGLE** : si une donnee est absente du dossier de recherche, NE PAS l'inventer.
Omettre le champ optionnel plutot que de deviner.

### Etape 2 : Calculer la noteExpert (7 axes)

Pour chaque axe, attribuer une note /10 avec justification :

#### Efficacite conversationnelle (poids x2.5)
- Utiliser les donnees internes de performance bruit + calme
- Traduire en situations reelles (BIBLE section 3, tableau traduction)
- Score interne >= 4.0 bruit → 8-10 | 3.0-3.9 → 6-8 | 2.0-2.9 → 4-6 | < 2.0 → 2-4

#### Qualite streaming/musique (poids x1.0)
- Score interne musique + retours terrain
- Phonak/Oticon generalement > Signia/ReSound sur cet axe

#### Connectivite (poids x1.5)
- BLE LE Audio + Auracast = 9-10
- BLE classique + app complete + mains libres = 7-8
- BLE basique sans mains libres = 5-6
- Pas de BT direct Android = -2 points

#### Praticite quotidienne (poids x1.5)
- Rechargeable Li-ion boitier = 8-10
- Rechargeable socle = 7-8
- Pile jetable = 4-6
- Autonomie >= 24h streaming = 9-10 | 16-24h = 7-8 | < 16h = 5-6

#### Discretion (poids x1.0)
- IIC/CIC = 9-10 | Slim RIC/Earbud = 8-9 | RIC = 7-8 | BTE = 5-6
- Bonus : poids < 3g, > 10 coloris
- Rappel : "ne pas entendre, ca se voit" — un appareil visible vaut mieux que pas d'appareil

#### Robustesse mecanique (poids x1.0)
- IP68 = baseline (pas de bonus, tout le monde l'a)
- Qualite percue composants + retours SAV terrain
- Marques reputees robustes : Oticon, Phonak > Signia, Widex (tendance terrain)

#### Innovation technologique (poids x1.5)
- Nouvelle puce vs generation precedente = quels gains concrets ?
- Capteurs sante = +2 si vraiment utilisables
- IA embarquee avec gains mesures = +1 a +3
- Rien de nouveau vs predecesseur = 4-5

#### Calcul final

```
noteExpert = (
  efficacite * 2.5 + streaming * 1.0 + connectivite * 1.5 +
  praticite * 1.5 + discretion * 1.0 + robustesse * 1.0 + innovation * 1.5
) / 10.0
```

Arrondir a 1 decimale. Ne JAMAIS arrondir pour plaire.

### Etape 3 : Rediger le contenu editorial

#### descriptionCourte (max 200 caracteres)
Format : [Verdict] [Profil cible]
- Mentionner puce + type + profil
- ZERO language marketing
- Accents obligatoires

#### descriptionComplete (800-1500 mots, 6 blocs)

Suivre STRICTEMENT la BIBLE section 4.2.

> **IMPORTANT — Franck-Olivier ne vend plus d'appareils depuis 2025.**
> Determiner le MODE TERRAIN avant de rediger le Bloc 3.

**Bloc 1 — Accroche** : angle marche/expertise, pas "Le [produit] est..."
**Bloc 2 — Ce que fait cet appareil** : technologie + verdicts calme/bruit/streaming

**Bloc 3 — En pratique** : CHOISIR LE MODE selon le contexte :

| Critere | Mode | Formulation |
|---------|------|-------------|
| Big Six + sorti avant fin 2024 | **Experience directe** | "J'ai adapte ce modele...", cas patient reel |
| Produit sorti 2025+ | **Retour confrere** | "Un confrere partenaire qui adapte le [X] au quotidien m'a confirme..." |
| Sous-marque (Unitron, Bernafon, Hansaton, Rexton, Audio Service, Philips) | **Experience plateforme** | "Je connais cette plateforme via [marque mere]..." |
| Aucun retour | **Analyse technique** | Specs comparatives, mention explicite "pas de retour terrain" |

VARIER les angles : pas 10 fiches de suite avec le meme mode.
Ne JAMAIS inventer un cas patient ou un retour confrere.

**Bloc 4 — Pour qui / Pas pour qui** : profil ideal + profil a eviter + alternative
**Bloc 5 — Positionnement** : vs generation precedente + vs concurrent direct
**Bloc 6 — Verdict expert** : note justifiee + bottom line + CTA

REGLES REDACTION :
- Vouvoiement systematique
- Flesch FR 60-80
- Accents UTF-8 complets (HARD BLOCK)
- ZERO : "revolutionnaire", "ultime", "game-changer", "leader", "performant" seul
- Chaque spec = chiffre precis
- Chaque performance = source ou terrain
- Mention classe obligatoire
- Prix en fourchette + mention "variable selon audioprothesiste"

#### pointsForts (4-6 items)
- Specifiques (pas generiques)
- Verifies (source ou terrain)
- Differenciants (pas ce que TOUT le monde a)

#### pointsFaibles (3-5 items, MINIMUM 3)
- Honnetes (pas adoucis)
- Contextualises (grave pour qui ?)
- Factuels

### Etape 4 : SEO

```
metaTitle    < 60 chars : "[Marque] [Modele] [Niveau] : prix, avis et fiche"
metaDescription < 155 chars : verdict + profil + fourchette prix
```

### Etape 5 : Auto-verification

```
[ ] Tous les champs required du schema remplis ?
[ ] noteExpert calculee avec les 7 axes ?
[ ] descriptionCourte < 200 chars, sans marketing ?
[ ] descriptionComplete = 6 blocs, 800-1500 mots ?
[ ] pointsForts >= 4 items specifiques ?
[ ] pointsFaibles >= 3 items honnetes ?
[ ] Accents UTF-8 complets ?
[ ] Prix en fourchette EUR ?
[ ] Classe 1 ou 2 mentionnee ?
[ ] metaTitle < 60 chars ?
[ ] metaDescription < 155 chars ?
[ ] Zero language marketing ?
```

## CHAINE PRODUIT

```
me-product-researcher → ME-PRODUCT-WRITER → me-product-evaluator
```

Le writer NE PUBLIE PAS le fichier JSON tant que l'evaluator n'a pas donne PASS >= 80.
