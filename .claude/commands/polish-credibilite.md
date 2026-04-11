# Commande : Polish crédibilité — bio 360° + diversité patients

Tu dois faire 2 choses sur TOUT le site, en AUTONOMIE COMPLETE.

---

## CHANTIER 1 : Mettre à jour la bio Franck-Olivier PARTOUT

### Le parcours complet (NOUVEAU)

Franck-Olivier a travaillé chez :
- **Amplifon** : 1998-2000 (leader historique mondial)
- **Audika** : 2007-2013 (leader français, 500+ centres)
- **Alain Afflelou Acousticien** : direction de 18 centres
- **Auzen.com** : 5 ans, audioprothésiste senior + CTO (téléaudiologie, vente en ligne)

C'est un parcours 360° unique : géants traditionnels + enseigne optique/audio + pure player web.
28 ans d'expérience, 3000+ patients.

### Fichiers à modifier

Chercher et mettre à jour TOUS les endroits où la bio apparaît :

1. **Page d'accueil** : `src/pages/index.astro` ou équivalent
2. **Page À propos** : `src/pages/a-propos.astro` ou `src/content/pages/a-propos.md`
3. **Page auteur** : `src/pages/auteur/franck-olivier.astro` ou équivalent
4. **Composant AuthorBox** : `src/components/AuthorBox.astro` (ou .tsx)
5. **Layout/Footer** : `src/layouts/BaseLayout.astro` si bio dans footer
6. **CLAUDE.md** : mettre à jour si la bio y figure
7. **BIBLE-CONTENU.md** : déjà mis à jour (25+ ans → 28 ans, parcours complet)

### Bio courte (pour AuthorBox en bas d'article)

```
Audioprothésiste DE, 28 ans d'expérience

Diplômé d'État · Amplifon · Audika · 18 centres Afflelou · Auzen.com · 3000+ patients · ADELI 692606494
```

### Bio moyenne (pour page auteur, sidebar)

```
Audioprothésiste diplômé d'État avec 28 ans d'expérience clinique. Après avoir forgé son expertise chez les leaders historiques (Amplifon, Audika) et dirigé 18 centres Alain Afflelou Acousticien, Franck-Olivier a rejoint Auzen.com où il a passé 5 ans entre téléaudiologie et vente en ligne. Aujourd'hui, il met ce parcours unique — du cabinet traditionnel au digital — au service de votre audition, sans langue de bois.
```

### Bio longue (pour page À propos)

```
Franck-Olivier est audioprothésiste diplômé d'État depuis 1998. Son parcours est atypique dans la profession :

- Ses débuts chez **Amplifon** (1998-2000), leader mondial, lui ont donné les fondamentaux cliniques et une vision internationale du métier.
- Chez **Audika** (2007-2013), il a vécu de l'intérieur le fonctionnement d'un réseau français de 500+ centres — avec ses forces et ses limites.
- À la tête de **18 centres Alain Afflelou Acousticien**, il a dirigé des équipes, géré des milliers de patients et développé une approche pragmatique de l'appareillage.
- Chez **Auzen.com** (5 ans), il a découvert l'envers du décor de la téléaudiologie et de la vente en ligne d'appareils auditifs.

Ce parcours 360° — du cabinet traditionnel aux géants du secteur, de l'enseigne physique au pure player web — lui donne un regard que peu d'audioprothésistes ont.

Sur LeGuideAuditif.fr, il partage ce qu'il a appris en 28 ans et 3000+ patients, sans filtre commercial. Son objectif : vous donner les clés pour faire les bons choix, en toute indépendance.
```

### Phrases à intégrer naturellement dans les articles (pas systématiquement, 1-2 par article quand c'est pertinent)

- "Quand je travaillais chez Audika, je voyais [observation]..."
- "Chez Amplifon, j'ai appris que [insight]..."
- "La différence entre un centre Afflelou et un pure player comme Auzen, c'est [contraste]..."
- "Après avoir vu les modèles économiques de l'intérieur — Amplifon, Audika, Afflelou, Auzen — je peux vous dire que [jugement indépendant]..."

---

## CHANTIER 2 : Diversifier les patients dans les cas réels

### Le problème

Si tous les articles ont "Madame Durand, 72 ans, retraitée" ou "un patient de 68 ans",
ça sonne FAUX et ça crée un pattern détectable.

### Règles de diversité

#### Âges : varier LARGEMENT
- Seniors actifs : 55-65 ans (encore en activité)
- Seniors retraités : 65-80 ans
- Jeunes adultes : 25-45 ans (bruit professionnel, acouphènes)
- Enfants/ados : mentionnés dans les articles pertinents
- NE JAMAIS avoir 2 patients du même âge dans le même article

#### Prénoms : utiliser cette liste (NE JAMAIS répéter un prénom déjà utilisé dans un autre article)

Hommes : Michel, Jean-Pierre, Alain, Philippe, Bernard, Yves, Patrick, Gérard, René, Claude, Marc, Thierry, Laurent, Stéphane, Karim, Mamadou, Antoine, Hugo, Damien, Éric

Femmes : Monique, Françoise, Colette, Martine, Sylvie, Nathalie, Catherine, Dominique, Fatima, Marie-Claire, Brigitte, Jacqueline, Aïcha, Sophie, Isabelle, Valérie, Sandrine, Émilie, Chantal, Denise

#### Situations professionnelles : varier
- Retraité(e) — mais PAS tous retraités
- Encore en activité (cadre, artisan, musicien, enseignant, ouvrier BTP, chauffeur)
- Chef d'entreprise
- Mère/père au foyer
- Jeune en études

#### Plaintes : varier les formulations
NE JAMAIS réutiliser la même plainte mot pour mot. Exemples :
- "Je fais répéter tout le monde."
- "Au téléphone, c'est devenu impossible."
- "Les réunions, c'est un cauchemar."
- "Mes petits-enfants me parlent et je ne comprends rien."
- "Je monte le son de la télé et ma femme se plaint."
- "J'ai l'impression que les gens marmonnent."
- "En voiture, je n'entends plus le clignotant."
- "Au restaurant, je décroche après 5 minutes."
- "Je n'ose plus aller aux réunions de famille."
- "Mon mari croit que je ne l'écoute pas."

#### Résultats : varier et NUANCER
- Pas toujours parfait : "Il a fallu 3 semaines d'adaptation"
- Parfois mitigé : "Le bruit de fond a diminué mais pas disparu"
- Parfois inattendu : "Elle est venue pour les acouphènes et a découvert une perte auditive"
- Parfois émotionnel : "Il a entendu le rire de sa petite-fille pour la première fois depuis 2 ans"

### Anti-pattern CRITIQUE

❌ NE PAS créer une forêt de randonneurs sexagénaires :
- Pas que des 70+ ans retraités
- Pas que des femmes (ou que des hommes)
- Pas que des plaintes "restaurant" ou "télé"
- Pas que des résolutions parfaites

✅ Un article peut avoir :
- Un cas principal détaillé (5-6 phrases)
- 1-2 mentions courtes d'autres profils ("comme ce chauffeur de 45 ans" ou "une enseignante qui...")

### Tracking

Pour éviter les doublons, TENIR UNE LISTE des prénoms + âges + situations déjà utilisés.
Avant chaque cas réel, vérifier que la combinaison est nouvelle.

---

## ORDRE D'EXÉCUTION

1. D'abord : mettre à jour la bio PARTOUT (composants, pages, layouts)
2. Ensuite : passer sur chaque article pour diversifier les patients ET ajouter des refs au parcours quand pertinent
3. Commiter par batch de 5-10 articles
4. PR finale avec la liste complète des modifications

## RÈGLES

- NE PAS casser le SEO existant (garder les keywords, les liens internes, la structure H2)
- NE PAS réécrire les articles — juste remplacer/diversifier les cas et mettre à jour les bios
- Préserver le frontmatter — ne modifier que `updatedDate`
- Si un article n'a aucun cas patient → en ajouter un (diversifié)
