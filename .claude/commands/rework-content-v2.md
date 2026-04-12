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

1. **Injecter les blocs terrain v2** (skill me-affiliate-writer) :
   - Hook dissonant en intro (remplacer l'intro generique)
   - Erreurs frequentes (min 3, dispersees)
   - Cas reels credibles (diversifies — voir /polish-credibilite pour les regles de diversite)
   - Methode expert ("comment je fais")
   - Limites et frictions
   - Prises de position
   - Expert Judgment (recommandation + rejet + nuance)

2. **Appliquer les 5 angles editoriaux** (BIBLE-CONTENU section 19) :
   - Identifier l'angle dominant par article
   - Imprégner le texte de cet angle

3. **CTA contextualise** (BIBLE-CONTENU section 17) :
   - Remplacer le CTA generique de fin par un CTA contextualise selon le cluster

4. **Maillage narratif** (BIBLE-CONTENU section 16) :
   - Transformer au moins 1 lien interne existant en lien narratif
   - NE PAS supprimer de liens — enrichir le contexte autour

5. **Memorabilite** (BIBLE-CONTENU section 15) :
   - 1 idee contre-intuitive
   - 1 phrase retenable
   - 1 insight terrain non evident

6. **Bio 360 degres** :
   - Verifier que l'AuthorBox a le parcours complet (Amplifon, Audika, Afflelou, Auzen)
   - Si pertinent, integrer 1-2 refs au parcours dans le texte ("Quand j'etais chez Audika...")

## PREREQUIS — LIRE AVANT DE COMMENCER

```
.claude/BIBLE-CONTENU.md (v2 — sections 14-19)
.claude/skills/me-affiliate-writer/SKILL.md (v2)
.claude/skills/me-affiliate-writer/references/terrain-framework.md
.claude/skills/nposts-seo-humanizer/SKILL.md (v2)
.claude/skills/nposts-content-evaluator/SKILL.md (v2)
.claude/skills/me-eeat-compliance/SKILL.md (v2)
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
3. **Retravailler le texte** en suivant le writer v2 (7 blocs terrain + variation structurelle)
4. **Humaniser** (patterns IA, burstiness, de-symmetrization — PAS d'ajout de contenu)
5. **Auto-evaluer** (6 axes — global >= 75 ET terrain >= 80 requis)
6. **Verifier EEAT** (experience signal score >= 80)
7. **Ecrire** le fichier — NE modifier que le body, pas le frontmatter (sauf updatedDate)
8. **Valider** que les liens internes sont tous preserves (diff avant/apres)

## COMMITS

Apres chaque phase :
```
git add -A
git commit -m "feat(content): rework phase {N} — {description} — terrain v2

Scores: evaluator avg {X}, terrain avg {X}, eeat avg {X}
Pages: {liste}"
```

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
Body : tableau avec chaque page, scores evaluator/terrain/eeat, angle dominant

## REGLES CRITIQUES

1. NE JAMAIS casser un lien interne — diff avant/apres obligatoire
2. NE JAMAIS modifier le frontmatter (sauf updatedDate)
3. NE JAMAIS supprimer un composant Astro
4. VARIER la structure entre les articles (pas de template repete)
5. DIVERSIFIER les patients (age, prenom, situation — jamais 2x le meme)
6. Si un article est deja bon (terrain > 70) : enrichir, pas reecrire from scratch
7. Si le build casse apres une modification : rollback et corriger avant de continuer
