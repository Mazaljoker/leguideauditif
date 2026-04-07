# Patterns IA en francais — Table de remplacement

## P0 — TOUJOURS remplacer (drapeaux rouges IA)

Ces expressions signalent immediatement un texte genere par IA.
Objectif : 0 occurrence P0 dans le contenu final.

| # | Pattern IA | Remplacements naturels |
|---|---|---|
| 1 | "Il convient de noter que" | "A savoir :" / "Un point important :" / supprimer |
| 2 | "Force est de constater que" | "On voit bien que" / "Le fait est que" / "Concretement," |
| 3 | "Par ailleurs" (debut phrase) | "Autre chose :" / "Et puis," / "D'un autre cote," |
| 4 | "En effet" (debut phrase) | Supprimer, reformuler pour que la phrase se suffise |
| 5 | "Il est essentiel de" | "Pensez a" / "N'oubliez pas de" / "Le plus important :" |
| 6 | "Dans le cadre de" | "Pour" / "Quand on parle de" / "En matiere de" |
| 7 | "Afin de" | "Pour" |
| 8 | "Permettre de" (>= 3 occurrences) | "aider a" / "servir a" / "rendre possible" / reformuler en actif |
| 9 | "Il est important de souligner" | "Je tiens a preciser" / "Un detail qui compte :" |
| 10 | "En ce qui concerne" | "Pour" / "Cote" / "Sur le plan de" |
| 11 | "Susceptible de" | "Qui peut" / "Capable de" / "Risque de" |
| 12 | "En termes de" | "Pour" / "Question" / "Cote" |
| 13 | "Ainsi," (debut phrase repetitif) | "Du coup," / "Resultat :" / supprimer |
| 14 | "Il s'avere que" | "En pratique" / "Au quotidien" / "D'experience" |

## P1 — Remplacer selon le contexte

Remplacer quand le pattern depasse le seuil indique.

| # | Pattern IA | Seuil | Remplacements |
|---|---|---|---|
| 1 | "Notamment" | > 2/article | "entre autres" / "par exemple" / "comme" |
| 2 | "Par consequent" | > 1/article | "Du coup" / "Resultat" / reformuler cause-effet direct |
| 3 | "En revanche" | > 1/article | "Mais" / "A l'inverse" / "De l'autre cote" |
| 4 | "De plus" | > 2/article | "Et" / "Aussi" / "Ajoutez a cela" |
| 5 | "Toutefois" | > 1/article | "Mais attention" / "Sauf que" |
| 6 | "Globalement" | > 1/article | "Dans l'ensemble" / "En gros" / "Quand on fait le bilan" |
| 7 | "Neanmoins" | > 1/article | "Mais" / "Cela dit," / "Sauf que" |

## P2 — Optionnel (ameliore le naturel)

| # | Pattern | Action |
|---|---|---|
| 1 | Phrases commencant par un gerondif | Reformuler en sujet-verbe-complement |
| 2 | 3+ phrases consecutives de meme longueur (± 3 mots) | Varier en inserant une phrase courte |
| 3 | Enumeration systematique a 3 elements | Varier entre 2, 4, 5 elements |
| 4 | "Cet article explore/examine/presente" | Supprimer les meta-references |
| 5 | Adverbes en "-ment" (> 5 par section) | Reformuler avec des verbes plus precis |
| 6 | Paragraphes de longueur identique | Alterner court (2 phrases) et long (5-6 phrases) |
| 7 | Debut de paragraphes identiques (meme mot) | Varier les attaques |

## Mots-drapeaux supplementaires (haute frequence IA)

Ces mots ne sont pas forcement a remplacer individuellement, mais leur
accumulation signale un texte IA. Surveiller la densite :

- "fondamental", "primordial", "crucial" → si > 2 : remplacer par "important", "cle"
- "optimiser", "maximiser" → si > 1 : reformuler concretement
- "significatif", "considerable" → si > 2 : donner un chiffre a la place
- "a cet egard" → toujours remplacer par "sur ce point" ou supprimer
- "en definitive" → "au final" / "pour resumer"
