# Bible Contenu Produits — LeGuideAuditif v1.0

> Document fondateur pour la redaction des fiches produits du catalogue.
> Objectif : produire des fiches IRREPROCHABLES, basees sur des donnees verifiees,
> qui positionnent LeGuideAuditif comme LA reference francophone des aides auditives.

## 1. Philosophie

**Nous ne vendons pas. Nous informons.**

Chaque fiche produit doit repondre a UNE question : "Est-ce que cet appareil est fait pour MOI ?"

Trois piliers :
1. **Verite** — Pas de language marketing fabricant. Des faits verifies.
2. **Expertise** — L'avis de Franck-Olivier, 28 ans, 3000+ patients, pas un copier-coller de spec sheet.
3. **Utilite** — Le visiteur repart avec une decision claire : oui, non, ou "a tester en rdv".

## 2. Sources autorisees (par ordre de priorite)

| Priorite | Source | Usage |
|----------|--------|-------|
| 1 | **Site fabricant officiel** (signia.com, phonak.com, etc.) | Specs techniques, images, PDFs |
| 2 | **Fiches techniques PDF** (data sheets fabricant) | Donnees precises : canaux, IP, autonomie, poids |
| 3 | **Publications scientifiques** (PubMed, INSERM) | Etudes cliniques sur la technologie |
| 4 | **HAS / ameli.fr** | Classe, remboursement, base de donnees LPPR |
| 5 | **Donnees de reference internes** (.claude/references/) | Calibration notes, benchmarks performance |
| 6 | **Experience clinique Franck-Olivier** | Verdicts, points forts/faibles terrain |

**INTERDIT** : ne JAMAIS citer HearAdvisor, ne JAMAIS copier leurs textes, ne JAMAIS utiliser leur terminology (SoundGrade, SoundScore). Les donnees de reference internes alimentent notre PROPRE analyse.

## 3. Grille de notation expert — 7 axes TERRAIN (noteExpert /10)

> Principe : on note ce qui DEPEND DU MODELE, pas de la forme.
> L'adaptation, le confort de port, la satisfaction long terme dependent de la forme
> (ITE vs BTE vs RIC) et de la motivation du patient — pas du modele.
> L'IP68 est partout aujourd'hui — ce n'est plus un differenciateur.
> Le remboursement varie trop (mutuelles, MDPH) — on ne fait pas de fausse promesse.

Chaque axe est note de 0 a 10. La **noteExpert** est la moyenne ponderee.

| Axe | Poids | Ce qu'on evalue | Comment evaluer |
|-----|-------|-----------------|-----------------|
| **Efficacite conversationnelle** | x2.5 | Le patient comprend-il mieux au restaurant ? En famille ? A 4 personnes ? | Traduire les donnees labo en situations REELLES : "diner a 6 dans un restaurant bruyant", "conversation TV en fond". Donnees internes + fabricant. |
| **Qualite streaming/musique** | x1.0 | Son en appel telephonique, musique, TV | Tres variable entre modeles. Phonak >> ReSound sur cet axe. Tests internes. |
| **Connectivite** | x1.5 | Bluetooth version, Auracast, app compagnon, mains libres, TV Connect | Specs fabricant. Chaque modele est different. L'app compte beaucoup pour les patients actifs. |
| **Praticite quotidienne** | x1.5 | Autonomie batterie reelle, type chargeur, facilite de manipulation, nettoyage | Heures avec/sans streaming, chargeur boitier vs socle, gestes necessaires. Senior-friendly ? |
| **Discretion** | x1.0 | Taille, poids, coloris. ET : "ne pas entendre, ca se voit" | Pas toujours invisible = mieux. Un patient qui n'entend pas et n'a pas d'appareil, ca se VOIT en societe. Mesures poids/taille + nombre coloris. |
| **Robustesse mecanique** | x1.0 | Qualite des composants, durabilite reelle, taux de retour SAV | Pas l'IP68 (tout le monde l'a). La vraie question : apres 2 ans d'usage quotidien, dans quel etat est l'appareil ? Retours terrain. |
| **Innovation technologique** | x1.5 | Puce, IA embarquee, capteurs sante, what's new vs generation precedente | Ce qui differencie CE modele de son predecesseur et de la concurrence. Pas du marketing — des vrais gains mesurables. |

**Total poids** : 10.0 → note sur 10

### Formule

```
noteExpert = (
  efficacite_conversation * 2.5 +
  streaming_musique * 1.0 +
  connectivite * 1.5 +
  praticite * 1.5 +
  discretion * 1.0 +
  robustesse * 1.0 +
  innovation * 1.5
) / 10.0
```

### Traduction des donnees labo en situations reelles

Les donnees de reference internes fournissent des scores techniques.
On les TRADUIT en langage patient :

| Score interne bruit | Traduction page produit |
|---------------------|------------------------|
| >= 4.0 | "Vous comprendrez vos interlocuteurs meme dans un restaurant bruyant un samedi soir" |
| 3.0-3.9 | "Conversations a 2 ou 3 fluides, mais les grands groupes dans le bruit restent un defi" |
| 2.0-2.9 | "Correct en environnement calme a moderement bruyant, limite en situation tres bruyante" |
| 1.0-1.9 | "Amelioration notable dans le calme, mais les environnements bruyants restent difficiles" |
| < 1.0 | "Performances limitees en milieu bruyant — a privilegier pour un usage calme" |

**REGLE** : JAMAIS donner un score chiffre brut au patient. Toujours traduire en SITUATION.

### Echelle d'interpretation

| Note | Verdict | Quand attribuer |
|------|---------|-----------------|
| 9.0-10.0 | Exceptionnel | Top 3 du marche, aucun defaut majeur |
| 8.0-8.9 | Excellent | Recommandation forte pour le profil cible |
| 7.0-7.9 | Tres bon | Solide, quelques compromis acceptables |
| 6.0-6.9 | Bon | Correct mais des alternatives superieures existent |
| 5.0-5.9 | Moyen | Rapport qualite/prix discutable |
| < 5.0 | Deconseille | Performances insuffisantes vs prix |

**REGLE** : La note ne doit JAMAIS etre arrondie pour plaire au fabricant. Un 6.5 est un 6.5.

### Calibration des notes — IMPORTANT

Les donnees de reference internes sont des MESURES DE LABO, pas des verdicts terrain.
Un ecart de 0.5 en labo ne se traduit PAS en "mauvais" pour le patient.

**Posture editoriale** : on ORIENTE le patient vers le bon produit pour LUI.
On ne DETRUIT PAS un produit. Chaque appareil premium actuel a des qualites reelles.

Regles de calibration :
- Un produit premium actuel d'un Big Six ne peut PAS etre en-dessous de 7.5
- Les differences entre produits premium sont souvent SUBTILES en pratique clinique
- "Limite dans le bruit" ne veut PAS dire "mauvais" — la majorite des appareils sont limites dans le bruit extreme
- Comparer avec la concurrence = positionner, pas detruire ("plus a l'aise dans le calme" plutot que "inferieur en milieu bruyant")
- Les scores labo doivent etre TRADUITS avec nuance, pas appliques bruts

**Ton** : honnete ET bienveillant. Un patient qui lit la fiche doit comprendre
SI cet appareil est fait pour lui, pas repartir avec l'impression qu'il est nul.

## 4. Structure editoriale d'une fiche produit

### 4.1 descriptionCourte (max 200 caracteres)

Format : `[Verdict en 1 phrase] [Meilleur pour quel profil]`

Exemple : "Appareil premium de Signia avec puce IX. Ideal pour les porteurs actifs cherchant un RIC discret avec excellente gestion du larsen."

**INTERDIT** : language marketing ("revolutionnaire", "ultime", "parfait").
**OBLIGATOIRE** : mentionner la puce + le type + le profil cible.

### 4.2 descriptionComplete (800-1500 mots)

Structure en 6 blocs.

> **IMPORTANT — Franck-Olivier ne vend plus d'appareils auditifs depuis 2025.**
> Le Bloc 3 (terrain) doit VARIER sa source selon la date du produit.
> Ne JAMAIS pretendre avoir appareille un patient avec un produit sorti apres fin 2024.

#### Bloc 1 : Accroche terrain (3-5 lignes)
Pas de "Le [produit] est un appareil auditif de la marque [X]".
Commencer par un ANGLE : contexte marche, promesse fabricant, ou experience de la plateforme.

Exemples selon le mode :
- **Produit connu (pre-2025)** : "Quand Signia a sorti la plateforme IX, la promesse etait claire. Apres avoir appareille des patients avec ce modele..."
- **Produit recent (2025+)** : "La plateforme Polaris 2 d'Oticon fait beaucoup parler dans la profession. Les premiers retours de confreres confirment que..."
- **Sous-marque** : "Unitron partage la puce Sonova avec Phonak. Quand on connait bien l'Audeo Lumity, on sait a quoi s'attendre du moteur — la difference est dans l'habillage."

#### Bloc 2 : Ce que fait cet appareil (et ce qu'il ne fait PAS)
- Technologie cle en 2-3 phrases (puce, algo principal)
- Performance dans le calme : verdict + nuance
- Performance dans le bruit : verdict + limite explicite
- Streaming/musique : verdict honnete

#### Bloc 3 : En pratique — 4 modes selon le contexte

**REGLE ABSOLUE** : ne JAMAIS inventer un retour terrain. Choisir le mode adapte.

| Mode | Quand | Formulation |
|------|-------|-------------|
| **Experience directe** | Big Six, produit sorti avant fin 2024 | "J'ai adapte ce modele sur une patiente de 74 ans..." |
| **Retour confrere** | Produit recent 2025+ | "Un confrere audioprothesiste partenaire qui travaille avec le [modele] m'a confirme que..." / "D'apres les retours de collegues qui l'adaptent au quotidien..." |
| **Experience plateforme** | Sous-marques (Unitron, Bernafon, Hansaton, Rexton, Audio Service, Philips) | "Je connais bien la plateforme [X] via [marque mere]. Ce que je peux en dire : le traitement du signal est identique, la difference se joue sur..." |
| **Analyse technique** | Aucun retour disponible | Pas de Bloc 3 narratif. A la place : "Ce que les specs ne disent pas" + analyse comparative detaillee des donnees techniques. Mentionner explicitement : "Nous n'avons pas de retour terrain sur ce modele specifique." |

**VARIER les sources** : pas 10 fiches de suite avec "un confrere m'a dit". Alterner les angles.

En complement de l'anecdote/retour :
- Ce que les specs ne disent pas : prise en main, facilite pour seniors, robustesse
- Retour apres 3+ mois d'utilisation si disponible (mode experience directe uniquement)

#### Bloc 4 : Pour qui ? Pas pour qui ?
- Profil ideal (type de perte, mode de vie, budget)
- Profil a eviter (type de perte trop severe, besoin specifique non couvert)
- Alternative recommandee si pas adapte

#### Bloc 5 : Comparaison positionnement
- Vs la generation precedente du meme fabricant
- Vs le concurrent direct (meme gamme de prix, meme forme)
- Avantage / Inconvenient vs chaque

#### Bloc 6 : Verdict expert
- Note /10 justifiee en 2-3 phrases
- 1 phrase "bottom line" pour la decision
- CTA contextualise (pas generique)

### 4.3 pointsForts (4-6 items)

Chaque point fort DOIT etre :
- **Specifique** (pas "bonne qualite sonore" → "clarte vocale remarquable dans les conversations a 2, meme dans un restaurant calme")
- **Verifie** (base sur specs OU retour terrain)
- **Differenciant** (pas un feature que TOUS les appareils ont)

### 4.4 pointsFaibles (3-5 items)

**OBLIGATOIRE d'en avoir au moins 3.** Un produit sans point faible = une fiche non credible.

Chaque point faible DOIT etre :
- **Honnete** (pas adouci — "streaming musical en retrait par rapport aux Phonak", pas "le streaming pourrait etre ameliore")
- **Contextualise** (grave pour qui ? pas grave pour qui ?)
- **Factuel** (pas d'opinion gratuite)

## 5. Regles editoriales strictes

### 5.1 Langue
- Francais avec accents complets (UTF-8 HARD BLOCK)
- Vouvoiement systematique
- Flesch FR 60-80

### 5.2 Interdictions language marketing
- "revolutionnaire", "ultime", "game-changer", "leader", "n1 mondial"
- "performant" sans qualifier (performant POUR QUOI ?)
- "design elegant" (descriptif vide — dire "12g, 2.5cm, quasi invisible derriere l'oreille")
- "son naturel" sans preciser dans quelle condition
- Superlatifs non justifies ("le meilleur", "le plus avance")

### 5.3 Obligations
- Chaque spec technique = chiffre precis (pas "longue autonomie" → "24h avec streaming, 36h sans")
- Chaque affirmation de performance = source ou experience terrain
- Mention classe 1 ou classe 2 obligatoire (contexte francais)
- Prix en fourchette EUR (pas de prix fixe qui change)
- Mention "prix constate, variable selon l'audioprothesiste et votre reste a charge"

### 5.4 SEO
- metaTitle < 60 chars : "[Marque] [Modele] [Niveau] : prix, avis et fiche complete"
- metaDescription < 155 chars : verdict + profil cible + prix fourchette
- Alt images : "[Marque] [Modele] - [type] [couleur] vue [angle]"
- Schema.org Product obligatoire (deja dans catalogue-utils.ts)

## 6. Scalabilite — Processus pour chaque nouveau produit

Quand un nouveau produit sort :

1. **Recherche** (skill me-product-researcher) :
   - Scraper le site fabricant officiel
   - Telecharger la fiche technique PDF si disponible
   - Chercher les publications scientifiques sur la technologie
   - Verifier disponibilite marche francais + classe
   - Collecter prix constates (audioprothesistes.fr, comparateurs)

2. **Redaction** (skill me-product-writer) :
   - Remplir TOUS les champs du schema JSON
   - Rediger descriptionCourte + descriptionComplete
   - Calculer noteExpert avec la grille 7 axes terrain
   - Generer pointsForts + pointsFaibles

3. **Evaluation** (skill me-product-evaluator) :
   - Verifier completude (tous champs remplis ?)
   - Verifier exactitude (specs coherentes avec source ?)
   - Verifier qualite editoriale (pas de language marketing ?)
   - Verifier note coherente (pas de biais fabricant ?)
   - Score PASS >= 80/100

4. **Publication** :
   - Commit du fichier JSON dans src/content/catalogue-appareils/
   - Build test
   - Verification visuelle de la page

## 7. Mapping des marques — Notre couverture vs marche

| Groupe | Marques | Gamme premium (notre priorite) |
|--------|---------|--------------------------------|
| Sonova | Phonak, Unitron, Hansaton | Phonak Infinio / Lumity |
| Demant | Oticon, Bernafon, Philips | Oticon Intent / Real |
| WS Audiology | Signia, Widex, Rexton, Audio Service | Signia IX / Widex Allure |
| GN | ReSound | ReSound Vivia / Nexia |
| Starkey | Starkey | Omega AI / Genesis AI |

**Priorite de couverture** :
1. Signia IX (plateforme complete — Pure, Styletto, Active, Silk, BCT)
2. Phonak Infinio (Sphere, Audeo)
3. Oticon Intent / Real
4. Widex Allure / Moment
5. Starkey Omega / Genesis
6. ReSound Vivia / Nexia
7. Rexton (Costco value)

## 8. Schema JSON — Template de reference

Voir `src/content.config.ts` pour le schema Zod complet.
Voir `.claude/skills/me-product-writer/references/template-produit.json` pour le template.

## 9. Mise a jour et maintenance

- **Frequence** : chaque trimestre, verifier les prix et disponibilite
- **Legacy** : quand un produit est remplace, marquer `legacy: true` avec `legacyReason`
- **Nouveau produit** : viser publication dans les 2 semaines apres sortie officielle
- **Correction** : si une spec est erronee, corriger + commit immediat
