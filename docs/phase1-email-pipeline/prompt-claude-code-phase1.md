# Prompt Claude Code — Phase 1 Email Pipeline Revendicateurs

**Destinataire** : Claude Code (terminal, Claude Max)
**Repo** : `github.com/Mazaljoker/leguideauditif`
**Branche de travail** : `feat/email-pipeline-phase1`
**Documents de spec** : `prd-email-pipeline-revendicateurs.md` + 3 fichiers `specs-phase1-*.md`

---

## À copier-coller dans Claude Code

```
Tu vas exécuter la Phase 1 du pipeline email revendicateurs de LeGuideAuditif.fr.

## Documents à lire IMPÉRATIVEMENT avant de commencer

Dans cet ordre, à la racine du repo (ou pose-les en pièce jointe si pas déjà dans le repo) :

1. prd-email-pipeline-revendicateurs.md — contexte stratégique, décisions prises, modèle data
2. specs-phase1-data.md — couche data (SQL, fonctions, types TS)
3. specs-phase1-endpoints.md — modifications/créations d'endpoints API
4. specs-phase1-admin.md — refonte admin UI

Lis les 4 fichiers en entier avant d'écrire une seule ligne de code. Les specs sont détaillées au pixel près. Si tu trouves une contradiction entre les specs et la réalité du repo, tu STOPS et tu me poses la question — tu ne devines pas.

## Règles de travail non négociables

1. **Workflow en 3 étapes, 3 commits distincts**. Tu NE passes PAS à l'étape N+1 sans ma validation explicite de l'étape N.
   - Étape 1 : Data (specs-phase1-data.md)
   - Étape 2 : Endpoints (specs-phase1-endpoints.md)
   - Étape 3 : Admin UI (specs-phase1-admin.md)

2. **Avant CHAQUE étape** : tu me listes les fichiers que tu vas créer/modifier, dans l'ordre, avec une estimation du nombre de lignes par fichier. Tu attends mon "go" avant de commencer l'exécution.

3. **Après CHAQUE étape** : tu lances les tests de validation de la spec correspondante (requêtes SQL ou tests manuels listés) et tu me colles les résultats. Je valide. Seulement alors tu commits et tu passes à la suivante.

4. **Branche dédiée** : crée `feat/email-pipeline-phase1` depuis `main`. Tous tes commits vont dessus. PAS DE PUSH DIRECT SUR MAIN.

5. **Conventional commits** :
   - `feat(data): audiopro lifecycle tables + migration des 43 revendicateurs`
   - `feat(api): audiopro lifecycle sync + endpoints relance et promotion`
   - `feat(admin): refonte claims page audiopro-centric + fiche détail`

6. **Idempotence critique** : le script de migration des 43 existants DOIT être rejouable sans casser la base. Les `ON CONFLICT DO NOTHING` sont dans la spec — ne les retire pas "pour simplifier".

7. **Stack respectée** : Astro 6, React 19, Tailwind 4, TypeScript strict (pas de `any`), ESM only, astro-icon avec Iconify (PAS d'emoji Unicode). Marine #1B2E4A / Crème #F8F5F0 / Orange #D97B3D. Base 18px, line-height 1.75.

8. **Ce qui est hors scope en Phase 1** (ne l'implémente PAS, même si ça te démange) :
   - Cron `/api/cron/email-drip`
   - Webhook Resend `/api/resend-webhook`
   - Page `/email-preferences`
   - 5 autres templates nurture (seul `fiche_incomplete_relance` est fonctionnel en Phase 1)
   - Tuile dashboard `/admin`
   - Page `/admin/emails`

## Étape 0 — Préparation (AVANT toute exécution)

Fais ces 4 checks et colle-moi le résultat :

1. **Dernier numéro de migration** — liste le contenu de `supabase/migrations/` et dis-moi le dernier NNN utilisé. Tu numéroteras les 4 nouveaux fichiers à la suite.

2. **Helper admin auth existant** — cherche dans le repo :
   ```
   grep -r "requireAdmin\|adminToken\|admin_token" src/lib/ src/middleware.ts
   ```
   Dis-moi s'il existe déjà un helper d'auth admin (pattern cookie, session, HMAC, middleware...) et colle-moi son code. Les 2 nouveaux endpoints (/api/admin/relance-email et /api/admin/promote-to-prospect) doivent réutiliser EXACTEMENT le même pattern que `/api/admin/quick-approve` et `/api/admin/quick-reject`.

3. **Trigger `set_updated_at_timestamp`** — vérifie s'il existe déjà dans le projet :
   ```
   grep -r "set_updated_at_timestamp\|updated_at" supabase/migrations/
   ```
   Si oui, ne le redéfinis pas, réutilise-le. Si non, crée-le dans le premier fichier de migration.

4. **Colonnes de `centres_auditifs`** — liste les colonnes réelles de la table. Les specs mentionnent `tel`, `site_web`, `a_propos`, `photo_url`, `email`, `specialites`, `marques`, `claimed_by_email`, `claimed_by_name`, `claimed_by_adeli`, `rpps`, `plan`, `claim_status`, `claimed_at`, `premium_since`. Si un nom diffère, STOP et signale-le.

## Étape 1 — Data layer

Spec : `specs-phase1-data.md`.

**Ce que tu vas créer** :

- `supabase/migrations/NNN+1_audiopro_lifecycle_tables.sql` (5 tables + indexes + triggers)
- `supabase/migrations/NNN+2_audiopro_completeness_fn.sql` (3 fonctions PL/pgSQL)
- `supabase/migrations/NNN+3_audiopro_rls.sql` (RLS policies)
- `supabase/migrations/NNN+4_audiopro_migration_existing_claims.sql` (migration 43 revendicateurs — idempotent)
- `supabase/migrations/NNN+5_audiopro_list_view.sql` (vue v_audiopro_list)
- `src/types/audiopro-lifecycle.ts` (types + labels + couleurs)
- `src/lib/audiopro-lifecycle.ts` (helpers serveur)
- `scripts/rollback-phase1.sql` (SCRIPT LOCAL, NON COMMITÉ dans migrations — juste au cas où)

**Procédure** :

1. Lis attentivement `specs-phase1-data.md` §1 à §7
2. Liste-moi les fichiers dans l'ordre que tu vas les créer + estimation lignes
3. ATTENDS MON "GO"
4. Crée les fichiers SQL dans l'ordre
5. Applique les migrations via le MCP Supabase (projet `ftinchxyuqpnxilypmyk`). Une par une. Si l'une échoue, STOP, montre-moi l'erreur.
6. Lance les 7 requêtes de validation de §8.1 et colle-moi les résultats BRUTS (pas d'interprétation, je veux voir les chiffres)
7. Crée les 2 fichiers TypeScript
8. Vérifie que `npm run build` passe sans erreur TypeScript
9. Commit : `feat(data): audiopro lifecycle tables + migration des 43 revendicateurs`
10. Rapport final : distribution par stage, nombre d'audios créés, nombre de liens centres, cas avec prenom/nom null (pour correction manuelle)

**Points de vigilance Étape 1** :
- La fonction `completeness_pct()` réfère aux noms de colonnes RÉELS de `centres_auditifs`. Ajuste si l'étape 0 a révélé un écart.
- Le script de migration des 43 utilise une heuristique `split_part` sur `claimed_by_name`. Certains cas seront mal découpés (noms composés, etc.) — c'est attendu, Franck corrigera à la main via l'UI admin en Étape 3.
- Le trigger `set_updated_at_timestamp` : ne le recrée pas si déjà existant.

## Étape 2 — Endpoints

Spec : `specs-phase1-endpoints.md`.

**Ce que tu vas modifier** :

- `src/lib/email.ts` — faire retourner `messageId` par `sendEmail()`
- `src/pages/api/claim.ts` — sync audiopro + log email_events
- `src/pages/api/admin/quick-approve.ts` — transition revendique→approuve + log
- `src/pages/api/admin/quick-reject.ts` — event claim_rejected
- `src/pages/api/webhook.ts` — transitions Stripe + premium_welcome + log

**Ce que tu vas créer** :

- `src/emails/premium-welcome.ts` (template)
- `src/emails/fiche-incomplete-relance.ts` (template)
- `src/pages/api/admin/relance-email.ts` (nouvel endpoint)
- `src/pages/api/admin/promote-to-prospect.ts` (nouvel endpoint)

**Procédure** :

1. Lis `specs-phase1-endpoints.md` §1 à §7
2. AVANT toute modif : relis le fichier actuel de `src/pages/api/claim.ts`, `quick-approve.ts`, `webhook.ts`. Tu DOIS repartir du code réel, pas du code théorique. Les diffs de la spec sont indicatifs, adapte-les à la structure réelle.
3. Liste-moi les modifications prévues fichier par fichier, avec les points où tu insères du code (avant/après quelle ligne). ATTENDS MON "GO".
4. Exécute les modifications et créations.
5. Vérifie que `npm run build` passe.
6. Lance les 6 scénarios de tests manuels §9.1. Pour chaque scénario, soit tu peux le simuler (SQL direct pour les mutations), soit tu me dis "à tester par Franck en prod". Sois honnête.
7. Commit : `feat(api): audiopro lifecycle sync + endpoints relance et promotion`

**Points de vigilance Étape 2** :
- La modif de `src/lib/email.ts` est breaking pour les appelants qui ne déstructurent pas `messageId`. Vérifie tous les appelants existants (grep `sendEmail(`) — ils doivent continuer à marcher.
- `src/pages/api/webhook.ts` gère 3 events Stripe. Le diff de la spec cible la partie `checkout.session.completed` → CENTRES (pas la partie annonces). Fais bien la distinction.
- Dans `/api/admin/relance-email`, SEUL `fiche_incomplete_relance` doit être fonctionnel en Phase 1. Les 5 autres templates doivent retourner 400 "Template non implémenté en Phase 1" (même si Claude Desktop t'en parle en détail dans le PRD — c'est la Phase 2).
- Le helper `requireAdmin` : réutilise le pattern identifié à l'Étape 0. Ne réinvente pas.
- Non-blocking : si le log `email_events` échoue, ne fais PAS échouer le claim. Wrapper try/catch + `console.error`.

## Étape 3 — Admin UI

Spec : `specs-phase1-admin.md`.

**Ce que tu vas créer** :

- `src/components/admin/AudioproStageBadge.astro`
- `src/components/admin/AudioproListFilters.tsx`
- `src/components/admin/RelanceEmailDropdown.tsx`
- `src/components/admin/RelanceConfirmModal.tsx`
- `src/components/admin/EmailEventsTimeline.astro`
- `src/components/admin/LifecycleEventsTimeline.astro`
- `src/components/admin/PromoteProspectButton.tsx`
- `src/pages/admin/claims/[audiopro_id].astro` (NOUVEAU — fiche détail)

**Ce que tu vas REFONDRE** :

- `src/pages/admin/claims.astro` — refonte complète (ligne-par-centre → ligne-par-audio)

**Procédure** :

1. Lis `specs-phase1-admin.md` §1 à §9 en entier
2. Relis le fichier actuel `src/pages/admin/claims.astro` (18 Ko). Je veux que tu m'en fasses un résumé de la structure actuelle AVANT de le refondre, pour vérifier qu'aucune logique critique ne disparaît dans la refonte.
3. Crée un fichier de sauvegarde `src/pages/admin/claims-legacy.astro` (copie à l'identique du fichier actuel). C'est notre filet. Il sera supprimé en Phase 3 quand on sera sûrs que la refonte tourne.
4. Liste-moi TOUS les fichiers à créer dans l'ordre (composants d'abord, pages ensuite). ATTENDS MON "GO".
5. Crée les composants un par un.
6. Refonds `claims.astro`.
7. Crée la page fiche détail `[audiopro_id].astro`.
8. Vérifie `npm run build`.
9. Tests manuels UI (§10 de la spec admin) : navigation, filtres, dropdown relance, modale, fiche détail, bouton promote. Colle-moi les captures/résultats.
10. Commit : `feat(admin): refonte claims page audiopro-centric + fiche détail`

**Points de vigilance Étape 3** :
- Si `src/components/admin/` n'existe pas, crée-le.
- Les composants React doivent utiliser `client:load` quand importés dans Astro (le dropdown et la modale ont besoin d'être interactifs).
- `astro-icon` : `import { Icon } from 'astro-icon/components'; <Icon name="lucide:..." />`. En React, SVG inline depuis lucide-react si dispo dans le package, sinon icon Astro équivalent.
- Accessibilité : focus orange 3px, touch targets ≥ 44px, labels explicites. Lis la section §1 accessibilité du projet.
- Les 5 templates grisés "v2" dans le dropdown doivent être VISIBLES mais désactivés avec tooltip "Disponible en Phase 2".
- Le bouton "Promouvoir en prospect" : caché si `audiopro.prospect_id IS NOT NULL`, remplacé par la carte prospect cliquable.

## À la toute fin — Pull Request

Quand les 3 étapes sont commitées et validées :

1. Pousse la branche `feat/email-pipeline-phase1` sur origin
2. Crée une PR vers `main` avec :
   - **Titre** : `Phase 1 — Pipeline email revendicateurs (data + endpoints + admin)`
   - **Description** : résumé des 3 commits + liens vers les 4 documents de spec + checklist des tests manuels validés par Franck
   - **Labels** : `feature`, `phase-1`
3. Ne merge pas. Franck reviewera, testera sur preview Vercel, et mergera lui-même.

## Escalades possibles

Tu STOPS et tu me demandes si :

- Un nom de colonne de la spec ne matche pas la réalité du repo
- Une migration SQL échoue sur Supabase
- Le build TypeScript casse après une de tes modifs
- Tu trouves un fichier existant qui ferait doublon avec ce qu'on te demande de créer
- La heuristique nom/prénom split produit un résultat bizarre sur > 20% des 43 audios (peut-être que le champ n'est pas structuré comme on pense)
- Un test manuel échoue
- Tu doutes, même 2 secondes. Demander une précision coûte moins cher qu'un refactor.

## Ton ton

Français. Direct. Factuel. Tu listes ce que tu fais, puis tu le fais. Pas de fioritures, pas de "super idée !" ni de "je suis ravi de pouvoir...". Tu es un exécutant senior qui rend compte à un architecte produit.

GO.
```

---

## Comment utiliser ce prompt

### Option A — Tout dans un seul message Claude Code

Tu colles le bloc ci-dessus (entre les ``` et ```) dans Claude Code au démarrage d'une nouvelle session, **avec les 4 documents de spec en pièce jointe** (ou accessibles dans le repo).

### Option B — Les specs dans le repo (recommandée — déjà fait)

Les 4 fichiers `.md` + ce prompt sont poussés sur la branche `feat/email-pipeline-phase1` dans `docs/phase1-email-pipeline/`.

Dans Claude Code, première instruction :
```
Lis les 5 fichiers dans docs/phase1-email-pipeline/ sur la branche feat/email-pipeline-phase1, puis applique l'étape 0 du prompt.
```

---

## Ce que tu dois vérifier après chaque étape

### Après Étape 1 (data)

- [ ] 5 migrations poussées sur Supabase projet `ftinchxyuqpnxilypmyk`
- [ ] Requête `SELECT COUNT(*) FROM audiopro_lifecycle;` renvoie ≈ 43 (ou le compte réel de revendicateurs actuels)
- [ ] Requête `SELECT lifecycle_stage, COUNT(*) FROM audiopro_lifecycle GROUP BY lifecycle_stage;` a une distribution cohérente
- [ ] Anthony Athuil apparaît avec 3 centres : `SELECT prenom, nom, email, (SELECT COUNT(*) FROM audiopro_centres WHERE audiopro_id = a.id) AS nb_centres FROM audiopro_lifecycle a WHERE email = 'anthony.athuil@...';`
- [ ] `npm run build` passe
- [ ] Commit sur la branche, pas sur main

### Après Étape 2 (endpoints)

- [ ] Un nouveau claim test depuis `/revendiquer` crée bien une ligne `audiopro_lifecycle` + une ligne `email_events`
- [ ] Le bouton one-click "approuver" dans l'email admin fait passer le stage à `approuve`
- [ ] Un paiement Stripe test (ou un replay webhook) fait passer le stage à `premium` et envoie le mail `premium_welcome`
- [ ] `npm run build` passe

### Après Étape 3 (admin UI)

- [ ] `/admin/claims` affiche la nouvelle liste ligne-par-audio
- [ ] Les 43 audios sont visibles, Anthony avec "3 centres"
- [ ] Filtres fonctionnels
- [ ] Dropdown "Relancer" avec 1 option active + 5 grisées
- [ ] Modale de confirmation marche
- [ ] Cliquer sur un audio ouvre la fiche détail `/admin/claims/{uuid}`
- [ ] Timelines (emails + lifecycle) s'affichent
- [ ] Bouton "Promouvoir en prospect" crée bien une ligne `prospects` et redirige
- [ ] `npm run build` passe
- [ ] PR créée, pas mergée

---

**Fin du prompt Claude Code.**
