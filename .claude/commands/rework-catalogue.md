# Commande : Reecrire les fiches produits du catalogue

Reecrire les fiches produits JSON dans `src/content/catalogue-appareils/`
avec le pipeline produit Grade A+. AUTONOMIE COMPLETE.

## ARGUMENT OPTIONNEL

- `/rework-catalogue` → traite TOUTES les fiches (par marque, ordre de priorite)
- `/rework-catalogue signia` → traite seulement Signia
- `/rework-catalogue phonak` → traite seulement Phonak
- `/rework-catalogue legacy` → marque les produits obsoletes comme legacy
- `/rework-catalogue [slug]` → traite une seule fiche specifique

## PREREQUIS — LIRE AVANT DE COMMENCER

```
.claude/BIBLE-CONTENU-PRODUITS.md (regles, 7 axes, 4 modes terrain, calibration ton)
.claude/references/hearadvisor-database.md (benchmarks performance — CONFIDENTIEL)
.claude/references/product-existence-map.md (carte d'existence des produits)
.claude/skills/me-product-researcher/SKILL.md
.claude/skills/me-product-writer/SKILL.md
.claude/skills/me-product-evaluator/SKILL.md
src/content.config.ts (schema Zod catalogueAppareils)
src/lib/catalogue-utils.ts (utilitaires)
```

## CE QUE TU NE TOUCHES PAS

- **slug** : NE PAS changer (casse les URLs)
- **marque, marqueLabel, groupe** : NE PAS changer (sauf erreur avouee)
- **modele** : NE PAS changer (sauf accents manquants)
- **formeType** : NE PAS changer (sauf erreur)
- **image** : garder le meme path

## CE QUE TU REECRITS

Pour CHAQUE fiche produit :

### Etape 1 : Verifier l'existence

Consulter `.claude/references/product-existence-map.md` :
- **EXISTS** → continuer le pipeline
- **LEGACY** → marquer `"legacy": true` + `"legacyReason": "Remplace par [successeur]"` et NE PAS reecrire le contenu
- **NOT FOUND** → alerter l'utilisateur, ne pas toucher

### Etape 2 : Recherche (me-product-researcher)

Pour les produits EXISTS :
1. WebSearch sur le site fabricant officiel pour confirmer les specs
2. Consulter `.claude/references/hearadvisor-database.md` si le produit y figure
3. WebSearch prix France (audioprothesistes.fr, laboratoires-unisson.com, ideal-audition.fr)
4. Verifier la classe (1 ou 2) et le prix EUR

### Etape 3 : Redaction (me-product-writer)

Reecrire les champs suivants :

1. **descriptionCourte** (max 200 chars) — verdict + profil, ZERO marketing
2. **descriptionComplete** (800-1500 mots, 6 blocs) :
   - Bloc 1 : Accroche (pas "Le [X] est un appareil...")
   - Bloc 2 : Ce que fait l'appareil (calme/bruit/streaming)
   - Bloc 3 : Terrain — CHOISIR LE BON MODE :
     - Big Six + avant 2025 → experience directe
     - Big Six + 2025+ → retour confrere
     - Sous-marque → experience plateforme
     - Aucun retour → analyse technique
   - Bloc 4 : Pour qui / pas pour qui
   - Bloc 5 : Vs predecesseur + concurrent
   - Bloc 6 : Verdict + note
3. **pointsForts** (4-6, specifiques et differenciants)
4. **pointsFaibles** (3-5, honnetes et contextualises)
5. **noteExpert** — calculee avec les 7 axes terrain :
   - Efficacite conversationnelle (x2.5)
   - Streaming/musique (x1.0)
   - Connectivite (x1.5)
   - Praticite (x1.5)
   - Discretion (x1.0)
   - Robustesse (x1.0)
   - Innovation (x1.5)
6. **metaTitle** (< 60 chars) : "[Marque] [Modele] [Niveau] : prix, avis et fiche"
7. **metaDescription** (< 155 chars) : verdict + profil + fourchette prix

Completer si manquant :
- **classe** ("1" ou "2")
- **prix.eur** ({ min, max } ou { unitaire })
- **antiFeedback**, **capteursSante** si connus

### Etape 4 : Chaine GAN adaptee produit

La descriptionComplete est du contenu editorial — elle passe par la chaine GAN
MAIS avec des regles ADAPTEES aux fiches produits (pas identiques aux articles).

```
descriptionComplete brute (writer)
  → nposts-seo-humanizer (MODE PRODUIT — voir ci-dessous)
  → me-detector-inverse (Gate 1.5)
  → nposts-content-evaluator (MODE PRODUIT — seuils adaptes)
  → me-eeat-compliance (MODE PRODUIT — seuils adaptes)
  → nposts-seo-fixer (corrections si necessaire)
```

**HARD BLOCK** : ne JAMAIS publier une descriptionComplete sans passage GAN.
**Protocole RETRY** : evaluateur juge, ne modifie jamais. Max 3 iterations.

#### Adaptations GAN pour fiches produits

**Humanizer (MODE PRODUIT)** :
- Appliquer : casser patterns IA, burstiness, voix Franck-Olivier
- NE PAS appliquer : les 10 blocs terrain v2 (c'est pour les articles)
- Preserver : la structure 6 blocs, les chiffres techniques, les comparaisons
- Attention : texte plus court (800-1500 mots), pas de sur-humanisation qui dilue les specs

**Content evaluator (MODE PRODUIT)** :
- Seuil global : >= 70 (pas 75 — c'est plus court et plus factuel qu'un article)
- Seuil terrain : >= 70 (pas 80 — le mode "experience plateforme" ou "retour confrere" a moins de matiere terrain)
- NE PAS penaliser : l'absence de "hook dissonant" ou de "micro-digression patient" (c'est pour les articles)
- Penaliser : language marketing, descriptions generiques, absence de comparaison

**E-E-A-T compliance (MODE PRODUIT)** :
- Seuil : >= 75 (pas 80 — une fiche produit n'est pas un guide YMYL de 3000 mots)
- Experience Signal : adapte au mode terrain choisi (experience directe OU retour confrere OU plateforme = valide)
- NE PAS exiger : les memes signaux d'experience que pour un article medical complet
- Exiger : coherence temporelle (pas de faux terrain), sources verifiees, ton expert

**GAN allege** (pour fiches courtes < 500 mots, sous-marques en mode analyse technique) :
- Humanizer + detector inverse uniquement
- Pas les 2 evaluateurs complets
- Seuil detector inverse >= 65

### Etape 5 : Evaluation produit (me-product-evaluator)

Evaluer chaque fiche sur 6 axes / 100 pts :
- Completude (25)
- Exactitude (20)
- Editorial (25)
- Notation (15)
- SEO (10)
- Credibilite (5)

**PASS >= 80 ET 0 bloquant** → fiche OK
**FAIL** → corriger et re-evaluer (max 3 iterations)

### Etape 6 : Ecrire le fichier JSON

`Edit` le fichier existant — ne PAS recreer le fichier entier.
Conserver les champs techniques deja corrects.

## REGLES CRITIQUES

1. **VERIFIER L'EXISTENCE** avant toute reecriture — ne pas reecrire un produit qui n'existe plus
2. **Ton bienveillant** — orienter, pas detruire. Note minimum 7.5 pour un premium actuel Big Six
3. **4 modes terrain** — ne JAMAIS pretendre avoir appareille un produit sorti apres fin 2024
4. **Accents UTF-8** — HARD BLOCK sur tout le contenu francais
5. **ZERO language marketing** — pas de "revolutionnaire", "ultime", "performant" seul
6. **Prix en fourchette** — jamais de prix fixe, toujours min-max EUR
7. **Chaque produit premium a des qualites** — trouver l'angle positif avant de nuancer
8. **VARIER les angles** — pas 10 fiches de suite avec le meme pattern d'ecriture

## ORDRE DE TRAITEMENT (si pas d'argument)

### Phase 1 : Big Six premium (priorite SEO)
1. Signia IX (12 fiches)
2. Phonak Infinio + Lumity (13 fiches)
3. Oticon Intent + Real + Zeal (11 fiches)
4. Widex Allure + Moment (8 fiches)
5. Starkey Omega + Genesis + Edge (10 fiches)
6. ReSound Vivia + Nexia (8 fiches)

### Phase 2 : Sous-marques
7. Rexton (4 fiches)
8. Philips (3 fiches)
9. Hansaton (2 fiches)
10. Audio Service (2 fiches)

### Phase 3 : Entree de gamme + Legacy
11. ReSound Key + Omnia + Savi (9 fiches)
12. Unitron toutes gammes (20 fiches)
13. Bernafon toutes gammes (10 fiches)
14. Oticon Ruby + Xceed + Jet (5 fiches)
15. Produits legacy : marquer + legacyReason

### Phase 4 : Anciennes generations
16. Signia AX (3 fiches → legacy)
17. Phonak Paradise + Marvel + Naida Marvel (12 fiches → legacy)

## COMMITS

Apres CHAQUE marque :
```
git add src/content/catalogue-appareils/[fichiers specifiques]
git commit -m "feat(catalogue): rework [marque] — [N] fiches pipeline A+

Notes moyennes: [X]/10 | Legacy: [N] marques
Fiches: [liste slugs]"
```

IMPORTANT : `git add` avec les fichiers specifiques, PAS `git add -A`.

## BUILD TEST

Apres chaque phase :
```
npm run build
```
Verifier que le build passe. Si erreur schema, corriger avant de continuer.

## REPORTING

A la fin de chaque phase, afficher :

```
=== Phase [N] terminee ===
Fiches traitees : [N]
Score evaluator moyen : [X]/100
Fiches legacy marquees : [N]
Build : OK/FAIL
```
