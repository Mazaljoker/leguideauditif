# Commande : Retravailler tout le contenu avec les skills v2 + design check

Tu dois retravailler le TEXTE de toutes les pages du site (sauf home page)
puis verifier le rendu visuel. AUTONOMIE COMPLETE.

## IMPORTANT — CE QUE TU NE TOUCHES PAS

Liste STRICTE des elements a NE PAS MODIFIER :

- **Frontmatter** : title, description, slug, category, tags, image, imageAlt, schema → INTOUCHABLE (sauf updatedDate)
- **Meta descriptions** : NE PAS changer
- **Titres H1** : NE PAS changer
- **URLs / slugs** : NE PAS changer
- **Liens internes** : conserver TOUS les liens existants (meme ancre, meme URL cible)
- **Liens externes** : conserver tels quels
- **Composants Astro** : `<AuthorBox />`, `<HealthDisclaimer />`, `<FAQ>`, `<ComparisonTable>`, `<CtaBanner>` etc → NE PAS supprimer
- **Schema.org JSON-LD** : NE PAS toucher
- **Images** : garder les memes paths, alt texts
- **Structure H2** : garder les memes H2 (tu peux reformuler legerement si necessaire mais garder le keyword)

## CE QUE TU RETRAVAILLES

Le CORPS DU TEXTE uniquement — les paragraphes entre les H2/H3 :

1. **Injecter les 10 blocs terrain v2** (skill me-affiliate-writer + terrain-framework.md) :
   - BLOC 1 : Hook dissonant en intro (remplacer l'intro generique)
   - BLOC 2 : Erreurs frequentes (min 3, dispersees)
   - BLOC 3 : Methode expert ("comment je fais en pratique")
   - BLOC 4 : Cas reels avec profondeur temporelle (etat initial → ajustement → suivi differe, 30% avec echec/hesitation)
   - BLOC 5 : Limites avec 3 forces en tension (verite + contradiction clinique + limite explicite)
   - BLOC 6 : Prises de position (min 2)
   - BLOC 7 : Expert Judgment avec contradiction heuristique (recommandation + rejet + nuance + exception obligatoire)
   - BLOC 8 : Micro-digression patient (age + contexte + citation + evolution, dans le flux)
   - BLOC 9 : CTAs a tension (INTERDIT "En savoir plus" → EXIGE "Voir les erreurs a eviter" etc.)
   - BLOC 10 : Phrase isolee de rupture (micro-choc apres paragraphe dense)

2. **Appliquer les 8 couches elite** :
   - Reality Consistency : aucun cas "trop parfait", progression non lineaire, 30% echec/hesitation
   - Cognitive Friction Engine : chaque section = verite + contradiction + limite
   - Signature System : 1 opinion directe + 1 observation personnelle par section, 1 divergence industrie par article
   - Anti-Template Detection : pas de listes sans tension, pas de sections symetriques, voix orale obligatoire
   - Temporal Clinical Depth : 1 cas avec evolution dans le temps par article
   - Heuristic Contradiction : chaque conseil doit avoir son exception contextuelle
   - Google Skeptic Simulation : le contenu apporte-t-il une valeur absente des 10 premiers resultats ?
   - Redundancy Control : max 2x "28 ans", max 1x "patients"/200 mots, paraphrase obligatoire

3. **Anti-IA avance** :
   - Desoptimisation volontaire : min 2 micro-imperfections par 300 mots
   - Friction cognitive : 1 tension + 1 nuance + 1 limite par section
   - Signature Franck : 3-5 phrases signature par article ("Ce que je vois tous les jours...", "Erreur classique.", "Je vais etre direct :")
   - Interdictions : "objectif simple", "ce guide va vous...", "n'hesitez pas", "vous l'aurez compris", "en conclusion"
   - Triple test : redacteur SEO / site concurrent / signature — les 3 doivent echouer

4. **Chaos controle** :
   - 1 article sur 3 DOIT casser le cadre (anecdote longue non optimisee, section sans H2, repetition assumee)
   - Profondeur variable : JAMAIS 3 articles consecutifs avec la meme densite terrain
   - 1 article sur 4 volontairement moins optimise SEO mais plus brut/personnel

5. **Appliquer les 5 angles editoriaux** (BIBLE-CONTENU section 19) :
   - Identifier l'angle dominant par article
   - Impregner le texte de cet angle

6. **CTA contextualise** (BIBLE-CONTENU section 17) :
   - Remplacer le CTA generique de fin par un CTA a tension selon le cluster

7. **Maillage narratif** (BIBLE-CONTENU section 16) :
   - Transformer au moins 1 lien interne existant en lien narratif
   - NE PAS supprimer de liens — enrichir le contexte autour

8. **Memorabilite** (BIBLE-CONTENU section 15) :
   - 1 idee contre-intuitive
   - 1 phrase retenable
   - 1 insight terrain non evident

9. **Bio 360 degres** :
   - Verifier que l'AuthorBox a le parcours complet (Amplifon, Audika, Afflelou, Auzen)
   - Si pertinent, integrer 1-2 refs au parcours dans le texte ("Quand j'etais chez Audika...")

## PREREQUIS — LIRE AVANT DE COMMENCER

```
.claude/BIBLE-CONTENU.md (v2 — sections 14-19)
.claude/skills/me-affiliate-writer/SKILL.md (v2)
.claude/skills/me-affiliate-writer/references/terrain-framework.md (10 blocs + 8 couches + chaos)
.claude/skills/nposts-seo-humanizer/SKILL.md (v2 — preservation A+ + redundancy control)
.claude/skills/nposts-seo-humanizer/references/voice-profile-franck-olivier.md (28 ans, phrases signature A+)
.claude/skills/nposts-seo-humanizer/references/ai-patterns-french.md (P0/P1/P2 patterns)
.claude/skills/me-detector-inverse/SKILL.md (Gate 1.5 — 3 axes + 4 checks avances)
.claude/skills/nposts-content-evaluator/SKILL.md (v2 — 6 axes, terrain >= 80)
.claude/skills/me-eeat-compliance/SKILL.md (v2 — Experience Signal Score)
.claude/skills/me-design-checker/SKILL.md (v2)
.claude/commands/polish-credibilite.md (regles diversite patients)
```

## PAGES A EXCLURE

- `src/pages/index.astro` (home page — NE PAS TOUCHER)
- Pages legales : mentions-legales, cgu, politique-confidentialite
- Pages purement techniques : sitemap, 404

## ORDRE DE TRAITEMENT

### Phase 1 : Pages piliers (les plus importantes)
1. src/content/guides/appareils-auditifs/index.md
2. src/content/guides/remboursement/index.md
3. src/content/guides/perte-auditive/index.md
4. src/content/guides/acouphenes/index.mdx
5. src/content/guides/audiogramme.mdx
6. src/content/guides/prevention/index.md
7. src/content/guides/vie-quotidienne/index.md
8. src/content/guides/audioprothesiste/index.md

### Phase 2 : Comparatifs (conversion)
9-17. Tous les fichiers dans src/content/comparatifs/

### Phase 3 : Satellites par cluster
18+. Tous les fichiers restants dans src/content/guides/ (par cluster)

## PIPELINE PAR PAGE

Pour CHAQUE page :

1. **Lire** le fichier existant
2. **Identifier** : structure H2, liens internes, composants, angle dominant
3. **Retravailler le texte** en suivant le writer v2 (10 blocs terrain + 8 couches + chaos controle)
4. **Humaniser** (patterns IA, burstiness, de-symmetrization, PRESERVER elements A+ : micro-digressions, phrases de rupture, CTAs tension, prises de position, repetitions intentionnelles)
5. **Detector inverse** (Gate 1.5 — score >= 75 requis, 3 axes + reality consistency + Google skeptic + redundancy + anti-template)
6. **Auto-evaluer** (6 axes — global >= 75 ET terrain >= 80 requis)
7. **Verifier EEAT** (experience signal score >= 80, Trust x1.75)
8. **Ecrire** le fichier — NE modifier que le body, pas le frontmatter (sauf updatedDate)
9. **Valider** que les liens internes sont tous preserves (diff avant/apres)

## COMMITS

Apres chaque phase :
```
git add {fichiers modifies specifiques}
git commit -m "feat(content): rework phase {N} — {description} — terrain v2

Scores: detector-inverse avg {X}, evaluator avg {X}, terrain avg {X}, eeat avg {X}
Pages: {liste}"
```

IMPORTANT : utiliser `git add` avec les fichiers specifiques, PAS `git add -A`.

## APRES TOUT LE CONTENU — DESIGN CHECK

Une fois toutes les pages retravaillees :

1. Lire `.claude/skills/me-design-checker/SKILL.md`
2. `npm run build` — verifier que le build passe
3. `npm run preview &`
4. Executer les 20 checks (7 blocs) en desktop ET mobile
5. Corriger les issues HIGH
6. Commit final : `fix(design): post-rework design check — {N} issues fixed`

## PR FINALE

Branche : `rework/content-terrain-v2-final`
Titre : `feat(content): full rework terrain v2 + design check`
Body : tableau avec chaque page, scores detector-inverse/evaluator/terrain/eeat, angle dominant

## REGLES CRITIQUES

1. NE JAMAIS casser un lien interne — diff avant/apres obligatoire
2. NE JAMAIS modifier le frontmatter (sauf updatedDate)
3. NE JAMAIS supprimer un composant Astro
4. VARIER la structure entre les articles (pas de template repete)
5. DIVERSIFIER les patients (age, prenom, situation — jamais 2x le meme)
6. Si un article est deja bon (terrain > 70) : enrichir, pas reecrire from scratch
7. Si le build casse apres une modification : rollback et corriger avant de continuer
8. CHAQUE conseil doit avoir son exception — pas de contenu 100% affirmatif
9. 1 divergence industrie minimum par article ("On recommande souvent X. Sur le terrain, ce n'est pas ce qui...")
10. Max 2x "28 ans" par article — paraphraser ("pres de trois decennies", "depuis mes debuts")
