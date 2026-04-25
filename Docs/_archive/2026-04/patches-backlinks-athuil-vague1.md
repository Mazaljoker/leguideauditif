# Patches Backlinks Athuil → LGA — Vague 1 (2026-04-19)

**Contexte** : 4 backlinks contextuels depuis laboratoireaa.com (site vitrine Athuil, même propriétaire) vers leguideauditif.fr. Déploiement progressif pour éviter signal "link scheme" Google. Vague 2 prévue ≥ 2026-05-17.

**Repo cible** : `C:\Users\Franck-Olivier\dev\laboratoireathuil\`
**Répertoire à modifier** : `netlify-site/` (déployé sur Netlify)
**Vérification à faire après** : si `public/` contient les mêmes fichiers, propager les 4 patches là aussi.

---

## Résumé des 4 patches

| # | Fichier source | Ancre | URL cible LGA | Silo |
|---|---|---|---|---|
| 1 | `Acouphènes.html` | *l'approche thérapeutique de l'acouphène expliquée* | `/guides/acouphenes/traitement/` | Acouphènes |
| 2 | `Hyperacousie.html` | *lien entre acouphène et hyperacousie* | `/guides/acouphenes/hyperacousie/` | Acouphènes |
| 3 | `L-audition--comment-ça-marche--.html` | *tout savoir sur la presbyacousie* | `/guides/perte-auditive/presbyacousie/` | Perte auditive |
| 4 | `Les-solutions-auditives.html` | *comparatif indépendant des types d'appareils auditifs* | `/guides/appareils-auditifs/types/` | Appareils |

Tous do-follow, `rel="noopener" target="_blank"`, pas de `sponsored` (lien éditorial légitime).

---

## Patch 1 — `Acouphènes.html` → `/guides/acouphenes/traitement/`

**Placement** : fin du bloc conclusion "Obtenez de l'aide pour votre acouphène" (~ligne 581), juste avant les `<br>` de séparation terminaux.

**old_string :**
```html
<strong>mettre fin à votre acouphène !</strong></span>
                  <br>
                  <br>
                  <br>
                </p>
```

**new_string :**
```html
<strong>mettre fin à votre acouphène !</strong></span>
                  <br>
                  <br>
                  <span style="font-size:15px">Pour aller plus loin, consultez <a href="https://leguideauditif.fr/guides/acouphenes/traitement/" rel="noopener" target="_blank">l'approche thérapeutique de l'acouphène expliquée</a> par Franck-Olivier, audioprothésiste DE, sur LeGuideAuditif.fr.</span>
                  <br>
                </p>
```

---

## Patch 2 — `Hyperacousie.html` → `/guides/acouphenes/hyperacousie/`

**Placement** : fin du paragraphe d'introduction (~ligne 225), juste après la phrase "diagnostic et un traitement approprié".

**old_string :**
```html
pour obtenir un <strong>diagnostic</strong> et un <strong>traitement approprié</strong>.</span>
                </p>
```

**new_string :**
```html
pour obtenir un <strong>diagnostic</strong> et un <strong>traitement approprié</strong>. Le <a href="https://leguideauditif.fr/guides/acouphenes/hyperacousie/" rel="noopener" target="_blank">lien entre acouphène et hyperacousie</a> est détaillé dans le guide indépendant de LeGuideAuditif.fr.</span>
                </p>
```

---

## Patch 3 — `L-audition--comment-ça-marche--.html` → `/guides/perte-auditive/presbyacousie/`

**Placement** : dans le bloc "surdité de perception" (~ligne 445), après la mention presbyacousie + lésions rétro-cochléaires.

**Attention** : la ligne originale contient une **espace finale** après `.</strong> ` (avant le retour à la ligne). Le `old_string` ci-dessous la préserve — ne pas la retirer.

**old_string :**
```html
ainsi que des <strong>lésions rétro-cochléaires.</strong> 
                      <br>
                       Le diagnostic peut se faire
```

**new_string :**
```html
ainsi que des <strong>lésions rétro-cochléaires.</strong> Pour <a href="https://leguideauditif.fr/guides/perte-auditive/presbyacousie/" rel="noopener" target="_blank">tout savoir sur la presbyacousie</a> et son évolution, consultez ce guide dédié.
                      <br>
                       Le diagnostic peut se faire
```

---

## Patch 4 — `Les-solutions-auditives.html` → `/guides/appareils-auditifs/types/`

**Placement** : fin de l'intro (~ligne 220), avant la fermeture en cascade des 5 `</span>`.

**old_string :**
```html
retrouver une <strong>meilleure qualité de vie</strong>.
                            <br>
                          </span></span></span></span></span>
```

**new_string :**
```html
retrouver une <strong>meilleure qualité de vie</strong>. Pour un <a href="https://leguideauditif.fr/guides/appareils-auditifs/types/" rel="noopener" target="_blank">comparatif indépendant des types d'appareils auditifs</a>, consultez le guide de LeGuideAuditif.fr rédigé par un audioprothésiste DE.
                            <br>
                          </span></span></span></span></span>
```

---

## Prompt prêt-à-coller pour workspace Athuil

Ouvrir `C:\Users\Franck-Olivier\dev\laboratoireathuil\` dans une nouvelle session Claude Code, coller :

```
Applique les 4 patches backlinks Athuil → LGA (vague 1). Les patches complets sont
documentés dans le repo LGA : 
C:\Users\Franck-Olivier\dev\leguideauditif-claude-code\leguideauditif\Docs\patches-backlinks-athuil-vague1.md

Procédure :
1. Lire ce fichier de patches.
2. Pour chaque patch, vérifier que old_string est unique dans le fichier cible
   (Grep output_mode=count, attendu : 1). Si pas unique, stoppe et rapporte.
3. Appliquer les 4 Edits dans netlify-site/.
4. Vérifier si public/ contient les mêmes fichiers ; si oui, propager les 4 patches
   en miroir. Sinon ignorer public/.
5. Afficher `git diff` pour validation humaine avant commit.
6. Commit message : "feat(seo): 4 backlinks contextuels vers LeGuideAuditif.fr (vague 1)"
7. NE PAS pousser — j'attends de valider le diff avant push.
```

---

## Checklist post-déploiement

Après redéploiement Netlify :

1. Ouvrir `https://www.laboratoireaa.com/Acouphènes.html` → vérifier le lien visuellement + cliquer
2. `curl -sI https://leguideauditif.fr/guides/acouphenes/traitement/` → attendre 200
3. J+2 : tester `site:laboratoireaa.com leguideauditif.fr` dans Google
4. J+7 à J+14 : GSC LGA → rapport "Liens externes" → laboratoireaa.com doit apparaître avec les 4 URLs
5. J+28 (~17 mai 2026) : si tout est clean, déclencher vague 2 (Entretien + Protections + Lyric + Le-son)

## Règles ancres (à respecter pour vague 2 et suivantes)

- **Jamais** d'ancre commerciale ("meilleur appareil auditif", "avis aides auditives", "classement audioprothésiste")
- **Jamais** de lien depuis Athuil vers `/comparatifs/` ou `/classement-meilleur-2026/` de LGA — signal de circularité commerciale détectable
- **Toujours** des ancres informationnelles/pédagogiques (guide, comparatif indépendant, comprendre, tout savoir)
- **Max 2 backlinks LGA par page Athuil** (aucune page n'en a 2 aujourd'hui, garde la marge)
