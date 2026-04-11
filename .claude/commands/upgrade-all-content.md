# Commande : Upgrade tout le contenu LeGuideAuditif avec le pipeline terrain v2

Tu dois upgrader TOUS les articles existants du site en utilisant le pipeline GAN v2.
Tu travailles en AUTONOMIE COMPLETE — pas d'intervention humaine.

## Prérequis

Lire ces skills AVANT de commencer :
- `.claude/skills/me-affiliate-writer/SKILL.md` (v2 — blocs terrain obligatoires)
- `.claude/skills/me-affiliate-writer/references/terrain-framework.md`
- `.claude/skills/nposts-seo-humanizer/SKILL.md` (v2 — finition stylistique)
- `.claude/skills/nposts-content-evaluator/SKILL.md` (v2 — 6 axes dont terrain)
- `.claude/skills/me-eeat-compliance/SKILL.md` (v2 — experience signal score)
- `.claude/BIBLE-CONTENU.md` (voix, audience, vocabulaire)

## Ordre de traitement (priorité business)

### Batch 1 — Pages piliers (les plus importantes)
1. `src/content/guides/appareils-auditifs/index.md`
2. `src/content/guides/remboursement/index.md`
3. `src/content/guides/perte-auditive/index.md`
4. `src/content/guides/acouphenes/index.mdx`
5. `src/content/guides/audiogramme.mdx`

### Batch 2 — Pages commerciales (conversion)
6. `src/content/comparatifs/meilleur-appareil-auditif-2026.mdx`
7. `src/content/guides/appareils-auditifs/classe-1-vs-classe-2.md`
8. `src/content/guides/remboursement/prix-appareil-auditif.md`
9. `src/content/comparatifs/meilleur-appareil-classe-1.md`
10. `src/content/comparatifs/phonak-vs-signia-vs-resound.md`

### Batch 3 — Satellites haute valeur
11. `src/content/guides/perte-auditive/symptomes.md`
12. `src/content/guides/acouphenes/traitement.md`
13. `src/content/guides/remboursement/100-sante-audition.md`
14. `src/content/guides/appareils-auditifs/types.md`
15. `src/content/guides/appareils-auditifs/premier-appareil.md`

### Batch 4 — Reste des guides
Toutes les autres pages de `src/content/guides/` par cluster.

### Batch 5 — Reste des comparatifs
Toutes les autres pages de `src/content/comparatifs/`.

## Pipeline par article

Pour CHAQUE article, executer dans cet ordre :

### 1. LIRE l'article existant
```
cat src/content/{path}
```
Identifier : structure H2, word count, contenu terrain existant (s'il y en a).

### 2. REECRIRE avec le writer v2
Appliquer le skill `me-affiliate-writer` v2.0 :
- Conserver la structure SEO (H2, keyword, FAQ, internal links)
- INJECTER les 7 blocs terrain obligatoires
- Varier la forme des blocs vs les articles deja traites
- Remplir la terrain_checklist
- NE PAS perdre le contenu factuel existant — l'enrichir

### 3. HUMANISER
Appliquer le skill `nposts-seo-humanizer` v2.0 :
- Casser les patterns IA
- De-symmetrization pass
- NE PAS ajouter de contenu terrain

### 4. AUTO-EVALUER (Gate 1)
Appliquer le skill `nposts-content-evaluator` v2.0 :
- Scorer sur les 6 axes
- Si score global < 75 OU terrain < 80 → reviser (max 3 iterations)
- Si terrain < 40 → reecrire completement

### 5. AUTO-VERIFIER E-E-A-T (Gate 2)
Appliquer le skill `me-eeat-compliance` v2.0 :
- Verifier Experience Signal Score
- Si score < 80 → corriger

### 6. ECRIRE le fichier
Remplacer le contenu du fichier source avec la version upgradee.
Preserver le frontmatter existant (title, description, date) — mettre a jour `updatedDate`.

### 7. COMMIT
Apres chaque batch (5 articles), creer un commit :
```
git add -A
git commit -m "feat(content): upgrade batch {N} — terrain v2"
```

## Regles critiques

1. **JAMAIS de commit sans que les 2 gates soient PASS**
2. **Varier la structure** entre les articles — pas de template repete
3. **Preserver le SEO** — ne pas casser les internal links, les keywords, les FAQ
4. **Preserver le frontmatter** — ne modifier que `updatedDate`
5. **Si un article est deja bon** (terrain > 60 en lecture) — l'enrichir, pas le reecrire from scratch
6. **Creer la PR finale** quand tous les articles sont traites

## PR finale

Quand tout est traite, creer la PR :
- Branche : `upgrade/content-terrain-v2`
- Titre : `feat(content): upgrade all content — pipeline terrain v2`
- Body : lister chaque article avec son score evaluator

## Metriques a tracker

Pour chaque article, noter dans le commit message :
- Score evaluator global
- Score terrain
- Score EEAT
- Nombre d'elements non-interchangeables
