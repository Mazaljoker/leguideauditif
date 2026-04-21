# PRD — Admin Prospects LeGuideAuditif.fr

Version : V1.1 (2026-04-21)
Auteur : Claude Code (Étape 2)
Audit préalable : `Docs/audit-admin-prospects.md` (validé)
Mockup de référence : `Docs/mockups/admin-prospects-mockup.html`
Décisions tranchées : D1 à D16 (voir annexe)

Changelog V1 → V1.1 : col-sum réduit à 2 métriques, 4 index supprimés (YAGNI), note justification POST pour read, découpe interne Phase 2 en 4 jalons, idempotence seed, risque conflit drag+édition ajouté.

Livrable unique : ce fichier. Pas de code, pas de SQL exécutable, pas de composant.

---

## 1. Objectif et critères de succès

**Objectif.** Remplacer le suivi pipeline commercial (aujourd'hui tenu dans Notion, mal mis à jour) par une page `/admin/prospects` intégrée au dashboard admin existant, mono-utilisateur (Franck-Olivier), KISS, construite sur la stack du repo (Astro + React + Supabase).

**Critères de succès mesurables (V1).**
- Je peux logger un DM envoyé sous 15 secondes (ouverture page → ajout interaction `dm` → Enregistrer).
- Je vois d'un coup d'œil mes actions du jour et en retard (badge orange / rouge sur la vue Pipeline et Liste).
- Je peux déplacer un prospect d'un statut à l'autre par drag & drop, avec historique automatique (interaction `status_change`).
- Je peux créer, éditer, supprimer un prospect depuis la même page, sans quitter le contexte.
- Je peux basculer entre Pipeline (défaut) et Liste, avec persistance du choix entre sessions (localStorage).
- Le compteur `Slots Fondateur x/20` m'indique en direct combien de slots Fondateur sont encore vendables.

**Non-critères.**
- Pas de vitesse de synchro temps-réel (un F5 suffit, pas besoin de Realtime Supabase).
- Pas de search plus fine qu'un `includes` côté client.

---

## 2. Scope EXCLU

Tout ce qui n'est **pas** dans la V1. Chaque ligne = décision fermée.

- Pas de séquences email automatiques (templates, relances programmées, drip campaigns).
- Pas d'intégration LinkedIn, Gmail, Waalaxy, Apollo, HubSpot, Clay, ou tout autre outil tiers de prospection.
- Pas de scoring ICP embarqué (on le garde en externe, si jamais).
- Pas de multi-utilisateurs / permissions / rôles : un seul compte admin, email hardcodé (pattern existant).
- Pas d'analytics avancé (graphiques, cohortes, funnels, conversion rate par source).
- Pas d'import CSV massif — seed initial de ~10 prospects via INSERT SQL commenté dans la migration.
- Pas de notifications push, rappels iOS, intégration Google Calendar, webhooks Supabase, edge functions.
- Pas de pièces jointes, pas de threads d'emails, pas d'upload de fichiers sur les interactions.
- Pas d'export CSV, pas de vue "roadmap" temporelle, pas d'alerting sur actions en retard.
- Pas de gestion multi-centres hiérarchisée (un prospect = un enregistrement, même s'il gère 3 cabines ; l'info est dans `company` + `centres_count`).
- Pas de lien bidirectionnel auto avec la table `centres_auditifs` existante : `centre_id` est un pointeur optionnel, pas une jointure obligatoire (voir §3.1).

---

## 3. Schema Supabase

### 3.1 Table `prospects`

Description structurée (pas une migration exécutable). Colonnes, types, contraintes, defaults.

| Colonne | Type | Contraintes | Défaut | Rôle |
|---|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` | Identifiant unique |
| `name` | `TEXT` | NOT NULL | — | Nom complet du prospect (prénom + nom) |
| `company` | `TEXT` | nullable | — | Entité ou groupe (ex. "Centres Athuil", "Audition Juan Les Pins") |
| `centres_count` | `INT` | NOT NULL, CHECK `>= 1` | `1` | Nombre de centres gérés |
| `city` | `TEXT` | nullable | — | Ville principale |
| `cp` | `TEXT` | nullable | — | Code postal principal |
| `departement` | `TEXT` | nullable | — | Département (2-3 chiffres) |
| `centre_id` | `UUID` | nullable, REFERENCES `centres_auditifs(id) ON DELETE SET NULL` | — | Lien optionnel vers la fiche centre du site |
| `status` | `TEXT` | NOT NULL, CHECK IN (`prospect`, `contacte`, `rdv`, `proposition`, `signe`, `perdu`) | `'prospect'` | Étape dans le pipeline |
| `source` | `TEXT` | NOT NULL, CHECK IN (`linkedin`, `rpps`, `entrant`, `autre`) | `'autre'` | Canal d'acquisition |
| `is_fondateur` | `BOOLEAN` | NOT NULL | `FALSE` | Flag "Partenaire Fondateur" (indépendant du statut) |
| `next_action` | `TEXT` | nullable | — | Libellé court de la prochaine action ("Call LGA Sérénité", "Envoyer brief Fondateur") |
| `next_action_at` | `TIMESTAMPTZ` | nullable | — | Date/heure de la prochaine action |
| `mrr_potentiel` | `NUMERIC(10,2)` | nullable, CHECK `>= 0` | — | Montant mensuel potentiel en euros (utilisé pour la stat Propositions) |
| `notes` | `TEXT` | nullable | — | Bloc-notes court, saisie libre (persistant) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Date de création |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | MAJ via trigger (§3.5) |

**Index proposés** (YAGNI — volume V1 ≤ 100 lignes).
- `idx_prospects_status` sur `(status)` — seul filtre kanban qui bénéficie d'un index
- `idx_prospects_is_fondateur` sur `(is_fondateur) WHERE is_fondateur = TRUE` — index partiel, utilisé pour le count "Slots Fondateur"

**Index volontairement non créés** (`next_action_at`, `source`, `centre_id`) : volume trop faible pour qu'un index apporte quoi que ce soit. À reconsidérer si la table dépasse 500 lignes.

**Contraintes de volume attendues.** V1 dimensionnée pour 50-100 lignes max. Aucune contrainte de perf à envisager. Pas de partitionnement, pas de full-text index.

### 3.2 Table `prospect_interactions`

Historique append-only. Chaque mouvement (DM, appel, email, note, RDV, changement de statut par drag & drop) = une ligne.

| Colonne | Type | Contraintes | Défaut | Rôle |
|---|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` | Identifiant unique |
| `prospect_id` | `UUID` | NOT NULL, REFERENCES `prospects(id) ON DELETE CASCADE` | — | Prospect concerné |
| `kind` | `TEXT` | NOT NULL, CHECK IN (`dm`, `call`, `email`, `note`, `meeting`, `status_change`) | — | Type d'interaction |
| `content` | `TEXT` | NOT NULL | — | Contenu libre (pour `status_change` : "Déplacé de RDV à Proposition") |
| `occurred_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Moment de l'interaction (éditable par l'utilisateur) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Moment d'enregistrement dans la DB (non éditable) |

**Index proposés** (YAGNI).
- `idx_prospect_interactions_prospect_id` sur `(prospect_id)` — lookup par prospect dans le panel d'édition

Pas d'index sur `occurred_at` : le tri DESC se fait sur les 10-50 lignes d'un prospect donné, à chaque ouverture de panel. Inutile.

**Pas de soft delete sur les interactions.** Historique préservé. Si un prospect est supprimé, ses interactions le sont en cascade (décision alignée avec D9 bis ci-dessous : hard delete prospect).

### 3.3 Enums

Conformes à la convention du repo (audit §1.2) : **TEXT + CHECK CONSTRAINT**, pas de `CREATE TYPE ... AS ENUM`. Cohérent avec `plan`, `claim_status`, `profil_type`.

| Enum | Valeurs |
|---|---|
| `prospect_status` | `prospect`, `contacte`, `rdv`, `proposition`, `signe`, `perdu` |
| `prospect_source` | `linkedin`, `rpps`, `entrant`, `autre` |
| `interaction_kind` | `dm`, `call`, `email`, `note`, `meeting`, `status_change` |

Les valeurs sont **identifiants techniques** : le front mappe `rdv` → "RDV planifié", `signe` → "Signé", `status_change` → "Changement de statut", etc. Les libellés français complets sont centralisés côté React (map constante) pour cohérence avec le mockup.

### 3.4 RLS

- RLS **activé** sur `prospects` et `prospect_interactions`.
- **Aucune policy publique.** Pas de `SELECT USING (true)`, pas de `INSERT WITH CHECK (true)`.
- Accès exclusif via `service_role` (bypass RLS automatique), depuis les endpoints serveur admin.
- Justification : mêmes contraintes que `claim_attributions` (attribution marketing) et `leads_downloads` (leads PDF) — aucune policy, accès serveur uniquement. Aligne le niveau de protection du CRM interne sur celui des données marketing sensibles.

### 3.5 Trigger `updated_at` sur `prospects`

- Trigger BEFORE UPDATE sur `prospects` : `NEW.updated_at = NOW()`.
- Réutilise la fonction `update_updated_at()` déjà définie dans la migration 001 (audit §1.2, table `centres_auditifs` a le même pattern). Ne pas re-créer la fonction si elle existe — utiliser `CREATE OR REPLACE FUNCTION` puis `CREATE TRIGGER` idempotent.
- Pas de trigger `updated_at` sur `prospect_interactions` : table append-only, pas d'update sémantique.

---

## 4. Routes et endpoints

### 4.1 Page SSR

- **Route** : `GET /admin/prospects`
- **Fichier** : `src/pages/admin/prospects.astro`
- **Mode** : `export const prerender = false` (SSR)
- **Auth guard** : copie conforme du pattern existant dans `admin/index.astro` (audit §1.1) :
  ```
  const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
  const user = Astro.locals.user;
  if (!user || user.email !== ADMIN_EMAIL) return Astro.redirect('/auth/login/');
  ```
- **Fetch initial côté serveur** (parallèle, via `createServerClient()`) :
  - Tous les prospects : `.from('prospects').select('*').order('updated_at', { ascending: false })`
  - Comptes par statut : calculés en JS à partir du résultat ci-dessus (pas de COUNT séparé — V1 ≤ 100 lignes)
  - Stats de l'en-tête : calculées en JS depuis les données chargées (voir §6 "Stats")
- **Rendu** : HTML statique pour topbar / header / stats / view-toggle-shell. Hydratation React pour les parties interactives (kanban, liste, filtres, édition inline).
- **Accessible depuis** : lien ajouté dans `admin/index.astro` (card ou bouton "Prospects" à côté de "Gérer les claims"). L'emplacement exact de ce lien est un détail hors PRD, à trancher au moment de l'implémentation Phase 2.

### 4.2 Endpoints API

Tous sous `src/pages/api/admin/prospects/`. Conventions alignées sur l'existant (audit §1.4) : **tous POST avec body JSON**, y compris pour lecture. Justification : cohérence avec `/api/admin/approve-claim.ts`, `/api/admin/reject-claim.ts`, `/api/admin/generate-premium-link.ts`, `/api/claim.ts`, etc. Le repo n'a **pas** de convention REST classique — tous les endpoints existants utilisent POST+body JSON et vérifient la session admin inline.

Chaque endpoint :
1. Vérifie `sb-access-token` + `sb-refresh-token` cookies, re-crée la session, check `user.email === ADMIN_EMAIL`. Si fail → 401.
2. Parse le body JSON, valide les champs obligatoires et les types. Si invalide → 400.
3. Utilise `createServerClient()` (service_role) pour écriture.
4. Retourne JSON `{ success: true, data? }` ou `{ error: '...' }` avec code HTTP approprié.
5. Gère les erreurs Supabase (`updateError`, `insertError`) et retourne 500 si applicable.

| Endpoint | Méthode | Payload IN | Payload OUT (success) | Codes d'erreur |
|---|---|---|---|---|
| `/api/admin/prospects/create` | POST | `{ name, company?, centres_count?, city?, cp?, departement?, centre_id?, status?, source?, is_fondateur?, next_action?, next_action_at?, mrr_potentiel?, notes? }` | `{ success: true, prospect: {...} }` | 400 (champs invalides), 401 (auth), 500 |
| `/api/admin/prospects/update` | POST | `{ id, ...champs modifiés }` | `{ success: true, prospect: {...} }` | 400, 401, 404 (id introuvable), 500 |
| `/api/admin/prospects/delete` | POST | `{ id }` | `{ success: true }` | 400, 401, 404, 500 |
| `/api/admin/prospects/move` | POST | `{ id, from_status, to_status }` | `{ success: true, prospect: {...}, interaction: {...} }` | 400 (statuts invalides / from == to), 401, 404, 409 (si `prospect.status !== from_status`, anti race-condition), 500 |
| `/api/admin/prospects/interactions/create` | POST | `{ prospect_id, kind, content, occurred_at? }` | `{ success: true, interaction: {...} }` | 400, 401, 404, 500 |
| `/api/admin/prospects/interactions/list` | POST | `{ prospect_id }` | `{ success: true, interactions: [...] }` (DESC sur `occurred_at`) | 400, 401, 500 |

**Note sur `/interactions/list` — POST pour un read.** Viole REST (un GET serait plus idiomatique). Assumé volontairement pour rester cohérent avec la convention maison : **toutes les routes `/api/` existantes du repo sont POST+body JSON**, y compris celles en lecture (`og/silo.ts` est l'exception). Un dev arrivant plus tard ne doit pas prendre ça pour une erreur — c'est un choix de cohérence. Si le repo adopte plus tard une convention REST claire, cette route migrera avec les autres.

**Delete : hard delete.** Pas de colonne `deleted_at`. Justification : volume faible, pas de contrainte légale pour un CRM prospect perso, simplicité. La cascade sur `prospect_interactions` supprime l'historique lié.

**Atomicité du `/move`.** Décision : **deux requêtes séquentielles** dans le même handler, PAS d'RPC Supabase. Justification :
1. Le repo n'utilise que deux RPCs (`nearby_claimed_centres`, `centre_view_stats`), les deux en lecture. Pas de pattern RPC pour écriture.
2. La fenêtre de risque est de ~50ms : très faible probabilité de conflit en mono-utilisateur.
3. En cas d'échec de l'INSERT interaction après le UPDATE status réussi, l'incohérence est minime (prospect déplacé, historique manquant d'une ligne) — loggable côté serveur, pas bloquant fonctionnellement.
4. Ajouter un RPC pour un gain ~nul en production complexifie la migration.

Si un conflit survient (ex. deux onglets ouverts), la réponse 409 sur `from_status !== current` permet au front de refresh et reverter le drag optimiste.

**Pas de listing GET.** Les prospects sont chargés **uniquement à l'hydratation SSR** (`prospects.astro`). Les mutations (create / update / delete / move) mettent à jour l'état React local + optionnellement refetch complet après 500ms de debounce si erreur. Pas d'endpoint `/list`.

---

## 5. Composants à créer

Arbre des fichiers. Pour chaque composant : type, responsabilité, props principales. **Aucun code**.

### 5.1 Primitives UI (`src/components/admin/ui/`)

Réutilisables uniquement dans `src/components/admin/**`. Pas d'export public vers le reste du site.

| Fichier | Type | Responsabilité | Props principales |
|---|---|---|---|
| `Card.astro` | Astro (slot) | Container générique : `rounded-xl border border-border bg-white p-4` | `variant` (`default` \| `highlight`), `class` |
| `StatTile.astro` | Astro (slot optionnel) | Tuile de stat : label uppercase + valeur serif + hint + variante Fondateur orange | `label`, `value`, `hint?`, `variant?` (`default` \| `fondateur`) |
| `Badge.astro` | Astro | Badge/pill coloré : statut pipeline, source, flag Fondateur | `variant` (`prospect` \| `contacte` \| `rdv` \| `proposition` \| `signe` \| `perdu` \| `source-linkedin` \| `source-rpps` \| `source-entrant` \| `source-autre` \| `fondateur`), `children` |
| `Chip.astro` | Astro | Filtre chip avec count optionnel, état actif | `label`, `count?`, `active?`, `variant?` (`default` \| `icon`), `id`, `dataAttrs` (pour identification côté client) |
| `Button.astro` | Astro | Bouton : primary orange, ghost marine, save marine, cancel transparent, icon-only | `variant` (`primary` \| `ghost` \| `save` \| `cancel` \| `icon`), `type?`, `class?` |

**Inputs / Select / Textarea.** Pas de primitive : une classe utilitaire Tailwind partagée sera définie via `@apply` dans un fichier CSS commun (`src/styles/admin.css`) ou inline sur chaque usage. Règle de décision : si la classe dépasse 6 utilisations, on crée la primitive ; sinon on reste inline. À arbitrer à l'implémentation Phase 2.

### 5.2 Modules de page (`src/components/admin/prospects/`)

| Fichier | Type | Responsabilité | Props principales |
|---|---|---|---|
| `ProspectsHeader.astro` | Astro | H1 "Prospects" + sub + bouton "+ Nouveau prospect" (trigger `NewProspectDialog`) | aucune (statique) |
| `ProspectsStats.astro` | Astro (wrapper) + React island | 4 `StatTile` : Pipeline actif / RDV semaine / Propositions / Slots Fondateur | `prospects: Prospect[]` |
| `ViewToggle.tsx` | React | Toggle Pipeline/Liste + persistance localStorage (D9) | `currentView`, `onChange` |
| `FiltersBar.tsx` | React | Chips statuts (cumulatifs) + chips spéciaux (exclusifs) + search debounced | `prospects`, `filters`, `onFiltersChange`, `search`, `onSearchChange` |
| `PipelineBoard.tsx` | React | Kanban 5 colonnes + dnd-kit `DndContext` | `prospects`, `onMove(id, from, to)`, `onCardClick(id)` |
| `PipelineColumn.tsx` | React | Une colonne kanban (titre + couleur + count + droppable area + col-sum optionnel) | `status`, `prospects`, `metric?` |
| `PipelineCard.tsx` | React | Une card draggable (nom + crown Fondateur + company/cp + next action + source dot) | `prospect`, `isDragging?` |
| `ProspectsList.tsx` | React | Vue liste (header grid + rows) | `prospects`, `onRowClick(id)`, `expandedId` |
| `ProspectRow.tsx` | React | Une row liste (normal + expansion) | `prospect`, `isExpanded`, `onToggle` |
| `ProspectEditPanel.tsx` | React | Panel d'édition inline (formulaire + boutons) | `prospect`, `onSave`, `onCancel`, `onDelete` |
| `InteractionsList.tsx` | React | Historique read-only dans le panel (chargement lazy via `/interactions/list`) | `prospectId` |
| `AddInteractionForm.tsx` | React | Formulaire compact pour ajouter une interaction (kind select + content textarea + occurred_at) | `prospectId`, `onAdded` |
| `NewProspectDialog.tsx` | React | Modal "Nouveau prospect" : formulaire mono-colonne des 8 champs essentiels | `isOpen`, `onClose`, `onCreated` |

### 5.3 Page et config

| Fichier | Type | Responsabilité |
|---|---|---|
| `src/pages/admin/prospects.astro` | Astro SSR | Page principale : auth guard, fetch initial, assemblage des modules |
| `src/lib/prospects.ts` | TS server-side | Helpers partagés (fetch `getProspects()`, `buildStats()`, validation `validateProspectInput()`) consommés par la page + les endpoints |
| `src/types/prospect.ts` | TS types | Types partagés `Prospect`, `ProspectStatus`, `ProspectSource`, `Interaction`, `InteractionKind`, `ProspectStats` |

### 5.4 Écarts mockup → implémentation

Tout écart entre le mockup et le code final est tracé ici et doit être justifié.

| Élément mockup | Implémentation PRD | Justification |
|---|---|---|
| Emojis Unicode (`crown`, `phone`, `zap`, `alert-triangle`, `grid`, `list`, chevron) | Icônes `astro-icon` Lucide : `lucide:crown`, `lucide:phone`, `lucide:zap`, `lucide:alert-triangle`, `lucide:kanban-square`, `lucide:list`, `lucide:chevron-right` | Règle HARD BLOCK `.claude/rules/no-emoji.md` : pas d'emoji Unicode dans le code source. |
| Pipeline ET Liste visibles simultanément (mockup statique affiche les deux) | Toggle mutuellement exclusif : `Pipeline` ou `Liste`, jamais les deux (D9) | Clarté UX, moins de scroll, cohérent avec le hint "Glisse une carte pour changer son statut" qui n'a de sens qu'en vue Pipeline. |
| `col-sum` en bas de chaque colonne (ancienneté moy, taux réponse, conv→proposition, MRR potentiel, MRR actif) | **Réduit à 2 col-sum uniquement** (Phase 4) : `Prospect` → "Ancienneté moy." (repère les prospects qui dorment) ; `Signé` → "MRR actif" (chiffre concret `SUM(mrr_potentiel WHERE status='signe')`). Les 3 autres colonnes (`Contacté`, `RDV`, `Proposition`) n'affichent **aucun** col-sum. | KISS + anti-redondance : "MRR potentiel" serait dupliqué avec le hint de la stat card "Propositions" en en-tête. "Taux réponse" et "Conv → proposition" nécessitent un tracking plus fin que V1. Chaque info affichée une seule fois. |
| Stat "RDV cette semaine" avec hint "2 aujourd'hui" | Calcul côté client : `status === 'rdv' && next_action_at` dans [lundi 00:00 Europe/Paris, lundi+7 00:00). Hint : count `next_action_at` dans [today 00:00, today+1 00:00). | Aligné sur D15 (calcul client, TZ Europe/Paris). |
| Stat "Propositions" avec hint "9 156 € MRR potentiel" | Calcul : count `status === 'proposition'`. Hint : `SUM(mrr_potentiel) WHERE status = 'proposition'`, formatté `fr-FR` euros. | Direct depuis les données chargées. |
| Stat "Slots Fondateur 3 / 20" avec hint "17 slots restants" | `count(is_fondateur = TRUE AND status = 'signe')` / 20. Hint : `20 - count`. | 20 est une constante de produit (contrat Fondateur limité). Hardcodée dans le front comme `SLOTS_FONDATEUR_MAX = 20`. |
| Stat "Pipeline actif" avec hint "14 ce mois-ci" | Count `status !== 'perdu' AND status !== 'signe'`. Hint : count `created_at >= first-day-of-current-month`. | Mêmes données, pas de calcul serveur. |
| Indicateur `card-next.overdue` avec icône `⚠` rouge | `lucide:alert-triangle` + couleur `danger` (`#B34444`) | Emoji remplacé par Lucide. |
| Indicateur `card-next.today` avec icône `📞` orange | `lucide:phone` + couleur `orange` | Idem. |
| Badge `👑` Fondateur à côté du nom | `lucide:crown` orange, aria-label "Partenaire Fondateur" | Idem + accessibilité seniors (aria-label cohérent avec `.claude/rules/accessibility.md`). |
| Bouton `+ Nouveau prospect` | Primary orange, icon `lucide:plus` à gauche du libellé | Mockup a `+` texte, on le remplace par l'icône pour cohérence icônes. |
| Topbar marine avec badge `Mockup` en jaune | Identique, avec badge `Admin` (ou rien) en prod. Badge `Mockup` supprimé. | Le badge est uniquement un marqueur du mockup. |
| Class CSS `.source-dot` | Dots inline via Tailwind : `w-1.5 h-1.5 rounded-full bg-[couleur]` | Pas de fichier CSS dédié, Tailwind inline cohérent avec le repo. |

---

## 6. Comportements clés

Un bullet par comportement, précis.

### 6.1 Chargement initial

- À l'arrivée sur `/admin/prospects` : SSR fetch `prospects.*` + interactions **non chargées** (lazy à l'ouverture du panel d'édition).
- État initial : `view = localStorage['lga-admin-prospects-view'] ?? 'pipeline'`, aucun filtre actif, search vide, aucun prospect expandé.
- Les 4 stats de l'en-tête sont calculées côté serveur à partir du résultat du fetch puis re-calculées côté client à chaque mutation (create / update / delete / move) pour rester synchro.

### 6.2 Toggle Pipeline/Liste (D9)

- Toggle unique : cliquer "Pipeline" affiche le kanban + cache la liste ; cliquer "Liste" fait l'inverse.
- Persistance via `localStorage.setItem('lga-admin-prospects-view', 'pipeline' | 'list')` à chaque bascule.
- Si localStorage absent / invalide → default `pipeline`.
- Hint "Glisse une carte pour changer son statut" visible uniquement en vue Pipeline.
- **Collapse auto du panel d'édition au toggle.** Si une row est expandée en vue Liste et que l'utilisateur bascule vers Pipeline, le panel est automatiquement fermé (reset de `expandedId = null`). Même comportement dans l'autre sens par symétrie. Évite tout conflit entre drag kanban et édition inline (voir §9.2 risques).

### 6.3 Drag & drop kanban (D2 + D11)

- Lib : `@dnd-kit/core` + `@dnd-kit/sortable`.
- `DndContext` englobe les 5 colonnes. Chaque card draggable via `useDraggable`, chaque colonne droppable via `useDroppable`.
- `onDragEnd(event)` :
  1. Si `from === to` (même colonne ou drop hors zone valide) → no-op.
  2. **Update UI optimiste** : le front re-positionne la card dans la nouvelle colonne immédiatement.
  3. POST `/api/admin/prospects/move` `{ id, from_status, to_status }`.
  4. Si 200 : confirme l'état, le serveur a aussi créé l'interaction `status_change` (voir §6.4).
  5. Si 409 ou 500 : **revert UI** (remettre la card dans la colonne d'origine) + toast d'erreur.
- Accessibilité : dnd-kit fournit le clavier (tab + space/enter + arrows) nativement. Touch-friendly sur mobile (pas de lib supplémentaire à importer).
- Kanban scroll horizontal mobile : `overflow-x: auto` + `grid-template-columns: repeat(5, 82vw)` (mockup). Snap scroll optionnel (CSS `scroll-snap-type: x mandatory` + `scroll-snap-align: start` sur `.col`) — décision : **activé V1** pour l'UX mobile, coût nul.

### 6.4 Interaction automatique sur drag (D11)

- Côté serveur, `/api/admin/prospects/move` :
  1. Valide que `prospect.status === from_status` (anti-race).
  2. UPDATE `prospects SET status = to_status, updated_at = NOW() WHERE id = $1`.
  3. INSERT `prospect_interactions (prospect_id, kind, content, occurred_at)` avec `content = "Déplacé de {from_label} à {to_label}"` (labels français mappés côté serveur).
  4. Retourne `{ success, prospect, interaction }`.
- Deux requêtes séquentielles, pas d'RPC (voir §4.2 justification).
- Le front, en cas de panel d'édition ouvert pour ce prospect, refetch les interactions pour afficher la nouvelle ligne `status_change` en tête d'historique.

### 6.5 Édition inline (D10)

- **Un seul prospect éditable à la fois**, tous contextes confondus. Pas d'édition possible en vue Pipeline (le panel n'existe qu'en vue Liste). Le toggle vers Pipeline ferme automatiquement le panel (voir §6.2).
- Cliquer sur une row en vue Liste → expansion du panel `ProspectEditPanel` (accordéon, une seule row expandée à la fois).
- Le panel charge `prospect_interactions` via POST `/api/admin/prospects/interactions/list` à l'ouverture (lazy).
- Formulaire pré-rempli avec les valeurs actuelles. Champs éditables : `name`, `company`, `centres_count`, `status`, `next_action`, `next_action_at`, `notes`, + toggle `is_fondateur` (orange, bouton pill).
- Sauvegarde **explicite** : bouton "Enregistrer" → POST `/api/admin/prospects/update` avec body `{ id, ...diff }`. Loading state sur le bouton pendant le POST (texte "Enregistrement..." + disabled). En cas d'erreur : reste expandé + toast rouge.
- Bouton "Annuler" : reset du formulaire aux valeurs initiales, garde le panel ouvert.
- Pas d'optimistic update : UI ne se met à jour qu'après 200.
- Bouton "Supprimer" (secondaire, rouge ghost) dans le panel : confirm natif `confirm('Supprimer ce prospect ? Action irréversible.')` puis POST `/api/admin/prospects/delete`.

### 6.6 Filtres chips (D13)

- **Chips statuts** : 6 chips (`Tous`, `Prospect`, `Contacté`, `RDV`, `Proposition`, `Signé`). La chip `Perdu` existe uniquement en vue Liste (voir §6.9).
- `Tous` = toggle qui désélectionne tous les statuts. Cliquer `Tous` alors qu'il est actif → no-op.
- Cliquer un statut individuel :
  - Si `Tous` est actif → `Tous` devient inactif, le statut cliqué devient actif.
  - Si plusieurs statuts actifs → le statut cliqué bascule (cumulatif = OR logique).
  - Si aucun statut actif → `Tous` redevient actif automatiquement.
- **Chips spéciaux** : "À faire" et "Fondateur" bascule on/off **indépendamment** des chips statuts (cumulent en AND).
  - "À faire" actif → filtre `next_action_at IS NOT NULL AND next_action_at < today+1 00:00` (aujourd'hui + en retard).
  - "Fondateur" actif → filtre `is_fondateur = TRUE`.
- Counts dans chaque chip : calculés à partir de l'ensemble des prospects chargés (non filtrés par search), mis à jour à chaque mutation.
- État filtres **non persistant** (reset à chaque rechargement) — volontaire, évite les surprises au retour sur la page.

### 6.7 Search (D14)

- Input libre `Rechercher nom, centre, ville...`. Filter JS côté client via `includes(term)` sur `name`, `company`, `city`, `cp` (lowercased, sans accents via normalize NFD).
- Debounce 150ms (`useDebounce` hook maison ou implémentation inline).
- Search **cumule avec les chips** (AND logique).
- Empty state si aucun résultat : texte neutre "Aucun prospect ne correspond aux filtres." (sans CTA).

### 6.8 États action en retard / aujourd'hui / futur (D15)

Calcul côté client, TZ Europe/Paris (le navigateur doit être dans cette TZ ; pas de lib de TZ, on accepte la contrainte).

- **En retard** (`overdue`) : `next_action_at < today 00:00 (Paris)` ET `next_action_at != null`. Style : text rouge (`var(--danger)` = `#B34444`) + icône `lucide:alert-triangle`. Libellé : "En retard — {date courte}".
- **Aujourd'hui** (`today`) : `next_action_at` dans `[today 00:00, today+1 00:00)`. Style : text orange + icône `lucide:phone`. Libellé : "Aujourd'hui {HH}h{MM}".
- **Futur** (`future`) : tout le reste. Style : text muted (`var(--muted)` = `#6B7A90`), pas d'icône. Libellé : "Relance {date courte}" ou tel que dans `next_action`.
- **Aucune action** (`next_action_at IS NULL`) : pas d'indicateur visuel (card-foot affiche juste le nom / source).

### 6.9 Statut "Perdu" caché par défaut (D16)

- **Kanban** : la colonne `Perdu` n'est **pas affichée**. Drag possible vers ? Non — il n'y a pas de colonne cible. Pour passer un prospect en `Perdu`, l'utilisateur doit passer par la vue Liste + édition inline + select "Perdu". Décision : pas de sixième colonne même optionnelle.
- **Liste** : chip "Perdu" ajoutée aux chips statuts. Cliquer la chip → filtre `status = 'perdu'` affiché. Sans cette chip active, les prospects `perdu` sont **masqués** de la vue Liste.
- La chip "Perdu" est placée **après** le séparateur, aux côtés de "À faire" et "Fondateur", pour marquer son statut spécial (pas dans la rangée principale des chips actives par défaut).

### 6.10 Badge Fondateur visible partout (D12)

- À côté du `name` du prospect : icône `lucide:crown` orange + `aria-label="Partenaire Fondateur"`.
- Visible dans : PipelineCard, ProspectRow (mode normal + expansion), NewProspectDialog (toggle).
- Toggle dans le panel d'édition : bouton pill orange "Partenaire Fondateur actif" / "Non-Fondateur". Cliquer bascule `is_fondateur` localement ; l'enregistrement se fait au Enregistrer global du formulaire.

### 6.11 Nouveau prospect

- Bouton "+ Nouveau prospect" en header → ouvre `NewProspectDialog` (modal centrée, overlay semi-opaque, close sur escape / click hors modal).
- Formulaire mono-colonne : `name*` (requis), `company`, `centres_count` (default 1), `city`, `cp`, `departement`, `source*` (default `autre`), `status*` (default `prospect`), `is_fondateur` (default false), `next_action`, `next_action_at`, `notes`.
- Submit : POST `/api/admin/prospects/create`. Si 200 : ferme la modal, ajoute le prospect à l'état local en tête de liste, toast "Prospect créé" (facultatif).

### 6.12 Stats de l'en-tête

Calculs (§5.4 + §6.2) :

| Stat | Valeur | Hint |
|---|---|---|
| Pipeline actif | count `status NOT IN ('signe', 'perdu')` | count `created_at >= first-day-of-month` "ce mois-ci" |
| RDV cette semaine | count `status === 'rdv' AND next_action_at` dans la semaine en cours | count `next_action_at` aujourd'hui |
| Propositions | count `status === 'proposition'` | `SUM(mrr_potentiel WHERE status = 'proposition')` formaté en €, suffixe " MRR potentiel" |
| Slots Fondateur | `count(is_fondateur AND status === 'signe')` / 20 (variante orange) | `20 - count` + " slots restants" |

Re-calcul à chaque mutation local. Pas de requête COUNT séparée.

### 6.13 Responsive mobile

- Stats : grille 2 colonnes (au lieu de 4).
- Kanban : scroll horizontal, `grid-template-columns: repeat(5, 82vw)`, scroll-snap activé.
- Liste : layout compact 1-col (nom + status + next action empilés dans `mobile-meta`), chev seul à droite.
- Filters bar : chips wrappent, search prend 100% de la largeur en dessous.
- Edit panel : `edit-grid` passe en 1 colonne.
- Modal "Nouveau prospect" : plein écran mobile.

---

## 7. Seed initial

Bloc SQL INSERT **commenté** en fin de migration (à décommenter manuellement une fois après merge). Décision D7 : pas de script TS, pas d'UI, pas d'import CSV.

Les ~10 prospects actifs :

1. **Anthony Athuil** — `company="Centres Athuil"`, `centres_count=3`, `city="Paris"`, `cp="75016"`, `departement="75"`, `status="proposition"`, `source="linkedin"`, `is_fondateur=true`, `next_action="Call LGA Sérénité Fondateur"`, `next_action_at="2026-04-21 14:30+02"`, `mrr_potentiel=456.00`, `notes="Offre 1200€ setup + 456€/mois (3 centres) + budget média client. Clause exit 3 mois refund. 6 ans relation — adresser ROI zéro période précédente."`
2. **Émilie Hardier** — `company="3 centres indépendants Hainaut"`, `centres_count=3`, `departement="59"`, `status="rdv"`, `source="linkedin"`, `is_fondateur=false`, `next_action="Call découverte 06 18 51 04 57"`, `next_action_at="2026-04-21 13:45+02"`
3. **Piotr Gaudibert** — `company="Entendre Normandie"`, `centres_count=1`, `departement="76"`, `status="contacte"`, `source="linkedin"`, `next_action="Proposer appel partenariat labo"`, `next_action_at="2026-04-24"`
4. **Guillaume Georges** — `company="4 cabines Grand Est"`, `centres_count=4`, `departement="67"`, `status="contacte"`, `source="linkedin"`, `is_fondateur=true`, `next_action="Envoyer brief Fondateur + pricing"`, `next_action_at="2026-04-23"`
5. **Céline Portal** — `company="Audition Juan Les Pins"`, `centres_count=1`, `city="Antibes"`, `cp="06160"`, `departement="06"`, `status="prospect"`, `source="entrant"`, `next_action="Email de bienvenue Fondateur"`, `next_action_at="2026-04-20"` (en retard)
6. **Nathalye Poirot** — `company="Audition+ Le Val-d'Ajol"`, `centres_count=1`, `cp="88340"`, `departement="88"`, `status="prospect"`, `source="entrant"`, `next_action="Relance après onboarding"`, `next_action_at="2026-04-29"`
7. **Sandrine Brion Bogard** — `company="Audition+ Contrexéville"`, `centres_count=1`, `cp="88140"`, `departement="88"`, `status="signe"`, `source="entrant"`, `next_action="Check-in 30 jours"`, `next_action_at="2026-05-15"`
8. **Placeholder TBD** — `name="À compléter 8"`, `status="prospect"`, `source="autre"`, autres champs NULL
9. **Placeholder TBD** — `name="À compléter 9"`, `status="prospect"`, `source="autre"`, autres champs NULL
10. **Placeholder TBD** — `name="À compléter 10"`, `status="prospect"`, `source="autre"`, autres champs NULL

**Format.** Bloc `-- SEED MANUEL (décommenter après merge, puis recommenter) --` contenant un `INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes) SELECT '...', '...', ... WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = '...');` pour chacun. Les 3 placeholders permettent de compléter à la main après coup en éditant la migration locale (puis re-commenter).

**Idempotence.** Chaque INSERT utilise `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = '...')` plutôt qu'`ON CONFLICT`. Raison : pas de unique constraint sur `name` (deux audios peuvent avoir le même nom en théorie — pour ce seed initial contrôlé, l'unicité par nom suffit). Ça permet de rejouer la migration (rollback puis re-forward) sans dupliquer les lignes. La contrainte est posée dans le WHERE, pas dans le schéma — volontairement conservateur.

**Pas d'INSERT dans `prospect_interactions` au seed.** L'historique démarre à la première interaction loggée post-déploiement. Les notes existantes tiennent dans le champ `notes`.

---

## 8. Livraison en phases

5 phases. Chaque phase **mergeable et déployable indépendamment**. Estimation en heures (mono-dev Claude Code + validation humaine).

### Phase 1 — Schema + primitives UI (~2 h)

- Migration SQL `supabase/migrations/012_prospects.sql` : `prospects`, `prospect_interactions`, enums CHECK, RLS, trigger `updated_at`, INDEX, seed commenté.
- Application manuelle de la migration via Supabase Dashboard (pattern repo : pas de `migrate` CLI).
- Primitives `src/components/admin/ui/Card.astro`, `StatTile.astro`, `Badge.astro`, `Chip.astro`, `Button.astro`.
- Types `src/types/prospect.ts`.
- Pas de page encore. PR mergeable : schéma posé, primitives prêtes, rien ne s'affiche en prod.

**Critère de merge.** Migration appliquée en prod Supabase + `npm run build` vert.

### Phase 2 — Page SSR + vue Liste + CRUD (~3 h)

**Découpe interne en 4 jalons commit-par-commit.** Tout reste dans un seul PR (une merge finale), mais chaque jalon est vérifiable indépendamment. Permet un fallback-merge si le dernier bloc lag.

**Jalon 2a — Page squelette (~30 min).** Critère : "la page s'affiche"
- Page `src/pages/admin/prospects.astro` : auth guard + fetch initial `prospects` + layout header vide.
- `ProspectsHeader.astro` (bouton "+ Nouveau prospect" désactivé pour l'instant).
- `ProspectsStats.astro` avec valeurs statiques hardcodées (`0 / 20`, etc.) — le calcul sera câblé en jalon 2b.
- Helpers `src/lib/prospects.ts` : stub `getProspects()` (utilisé par le fetch initial).

**Jalon 2b — Vue Liste read-only (~30 min).** Critère : "je vois mes prospects"
- `ProspectsList.tsx` + `ProspectRow.tsx` read-only (pas d'expansion).
- Branchement des stats sur les données chargées.
- Seed SQL décommenté en local, re-commenté avant commit. Données insérées manuellement en prod (via Supabase Dashboard).

**Jalon 2c — CRUD + édition inline (~1 h 30).** Critère : "je peux éditer / créer / supprimer"
- Endpoints `/api/admin/prospects/create`, `/update`, `/delete`.
- `ProspectEditPanel.tsx` + `NewProspectDialog.tsx`.
- Expansion de row + formulaire + bouton Enregistrer + bouton Supprimer avec `confirm()`.
- Activation du bouton "+ Nouveau prospect".

**Jalon 2d — Interactions (~30 min).** Critère : "je peux logger mes interactions"
- Endpoints `/api/admin/prospects/interactions/create`, `/interactions/list`.
- `InteractionsList.tsx` (historique read-only chargé à l'ouverture du panel).
- `AddInteractionForm.tsx` (form compact : kind select + content textarea + occurred_at).

**Critère de merge global Phase 2.** Les 4 jalons verts. Je peux créer / éditer / supprimer un prospect en vue Liste, logger une interaction, voir l'historique. Stats correctes.

### Phase 3 — Kanban + drag & drop (~2 h)

- Install `@dnd-kit/core` + `@dnd-kit/sortable` (`npm i`).
- Composants `PipelineBoard.tsx`, `PipelineColumn.tsx`, `PipelineCard.tsx`.
- Endpoint `/api/admin/prospects/move` avec création interaction auto.
- `ViewToggle.tsx` : activation du toggle + persistance localStorage.
- Scroll horizontal mobile + scroll-snap.

**Critère de merge.** Je peux basculer Pipeline/Liste. En Pipeline, je peux drag une card entre colonnes, le statut change, l'historique reçoit une ligne `status_change`.

### Phase 4 — Filtres + search + col-sum metrics (~2 h)

- `FiltersBar.tsx` : chips statuts cumulatifs + chips spéciaux exclusifs + search debounced.
- Calculs col-sum : **2 métriques seulement** (§5.4). Colonne `Prospect` → "Ancienneté moy." en jours (`AVG(today - created_at)` sur les prospects de la colonne). Colonne `Signé` → "MRR actif" (`SUM(mrr_potentiel)` sur `status = 'signe'`, formaté `fr-FR` euros). Les colonnes `Contacté`, `RDV`, `Proposition` n'affichent **aucun** col-sum.
- États action en retard / aujourd'hui / futur : couleurs + icônes Lucide sur PipelineCard et ProspectRow.

**Critère de merge.** Je peux filtrer multi-statut + "À faire" + "Fondateur" + search. Je vois mes actions en retard d'un coup d'œil.

### Phase 5 — Polish + responsive + QA (~1 h)

- Responsive mobile : grid stats 2-cols, kanban scroll 82vw, row compact, modal full-screen.
- Loading states (boutons "Enregistrer", "Supprimer"), toasts d'erreur (inline, pas de lib toast).
- Edge cases : empty state "Aucun prospect", confirm delete, revert drag en cas d'échec.
- Lien "Prospects" ajouté dans `admin/index.astro` (card ou bouton next to "Gérer les claims").
- QA manuelle : golden path + 3 edge cases (drag vers même colonne, session expirée, erreur 500 simulée).

**Critère de merge.** Tout fonctionne sur desktop + mobile Chrome/Safari. Commit final + tag V1.

**Total estimé : ~10 h.** Ajustement possible : Phase 3 peut gagner 30 min si dnd-kit se câble sans friction ; Phase 4 peut perdre 30 min si la logique des chips cumulatifs demande des itérations.

---

## 9. Risques et questions ouvertes

### 9.1 Questions fermées à trancher avant Phase 1

Toutes les décisions majeures sont prises (D1-D16). Il reste des détails :

**Q1.** Le bouton "Supprimer" dans `ProspectEditPanel` : confirmation via `window.confirm()` natif (laid mais simple) ou via un second clic "Confirmer la suppression" inline ? → **Ma reco : `window.confirm()` natif.** Aligné avec `admin/claims.astro` qui utilise déjà `confirm(...)` pour la révocation.

**Q2 — RÉSOLU V1.1.** Col-sum réduit à **2 métriques** : `Prospect` → "Ancienneté moy." + `Signé` → "MRR actif". Les 3 autres colonnes n'affichent aucun col-sum. Justification : "MRR potentiel" sur Proposition ferait doublon avec le hint de la stat card "Propositions" en en-tête. "Taux réponse" et "Conv → proposition" nécessitent un tracking plus fin que V1. Chaque info affichée une seule fois = moins de bruit visuel.

**Q3.** La chip "À faire" : doit-elle inclure les prospects sans `next_action_at` ? → **Ma reco : non.** "À faire" = action datée dans le passé ou aujourd'hui. Un prospect sans date n'est ni à faire ni fait.

**Q4.** La chip "Perdu" : visible en vue Liste uniquement (D16), OK. Mais en vue Pipeline, **cacher** complètement les prospects `perdu` ? → **Ma reco : oui, cachés en Pipeline.** Si l'utilisateur veut voir les perdus, il bascule en Liste + active la chip "Perdu".

**Q5.** `centre_id` dans le formulaire "Nouveau prospect" : champ visible ou caché par défaut (recherche centre optionnelle) ? → **Ma reco : caché V1, champ ajouté Phase 5 ou V2.** Le lien vers `centres_auditifs` est utile surtout pour les prospects `source='entrant'` (revendications). Peut être posé manuellement plus tard via Supabase Dashboard ou via update endpoint. V1 simple : pas de field dans le form.

### 9.2 Risques techniques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Conflit optimistic update drag + 409 serveur | Faible (mono-user) | UI desync | Revert systématique + refetch complet toutes les mutations qui échouent. |
| **Conflit panel édition ouvert + drag kanban** | Faible (mono-user) | UI desync, risque d'enregistrer un état obsolète | Toggle Pipeline/Liste **collapse automatiquement** le panel d'édition (§6.2, §6.5). Un seul prospect en édition à la fois, jamais d'édition possible en vue Pipeline. Si l'utilisateur ouvre deux onglets (V2 / jamais supporté), la 409 anti-race du `/move` protège. |
| TZ Europe/Paris incorrecte côté client (navigateur en voyage) | Très faible | Dates décalées de 1-2h | Accepté en V1. Documenté dans le PRD. Pas de lib TZ. |
| `@dnd-kit` bug sur touch iOS Safari | Faible | Drag inopérant mobile | dnd-kit supporte touch nativement depuis v6. Test explicite Phase 3 sur iOS (Safari mobile). |
| Migration SQL échoue en prod (conflit nom table, trigger existant) | Très faible | Blocage déploiement | Migration `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE TRIGGER` avec check `pg_trigger` ou simplement séparer en plusieurs statements idempotents. Seed `INSERT ... WHERE NOT EXISTS` (§7). |
| `service_role` expose par erreur les prospects | Faible | Fuite CRM interne | RLS bloque déjà tout accès anon/authenticated. `service_role` only serveur. Pas de route GET publique. |

### 9.3 Questions hors champ PRD (ne pas répondre maintenant)

- Sauvegarde / export du CRM en cas de migration future ? → V2.
- Métriques de santé commerciale (taux conversion par source, cycle moyen) ? → V2.
- Synchronisation bidirectionnelle avec un outil externe (HubSpot, Notion) ? → Explicitement hors scope.

---

## 10. Ce qu'on ne tranche PAS dans ce PRD

Noté comme "V2 possible", sans plus :

- Notifications navigateur / push / rappels iOS.
- Intégration Google Calendar (sync `next_action_at` → event).
- Webhooks Supabase sur INSERT/UPDATE `prospects` (ex. notifier Slack).
- Edge functions (ex. email quotidien avec résumé des actions du jour).
- Export CSV / backup manuel.
- Vue "roadmap" temporelle (timeline horizontale par semaine).
- Analytics cohorte : taux de conversion par source, cycle moyen par statut, dropoff par étape.
- Multi-utilisateurs / permissions granulaires / audit log.
- Recherche full-text côté serveur avec index trigram si volume > 500 lignes.
- Pièces jointes sur les interactions (PDF de proposition, screenshot DM LinkedIn).

---

## Annexe A — Mapping décisions D1 à D16

| Décision | Section où appliquée | Résumé |
|---|---|---|
| D1 Primitives UI | §5.1 | 5 primitives `.astro` dans `src/components/admin/ui/` |
| D2 Drag & drop | §4, §6.3 | `@dnd-kit/core` + `@dnd-kit/sortable` |
| D3 Auth + mutations | §4.1, §4.2 | Copie conforme pattern `approve-claim.ts` |
| D4 Validation | §4.2 | Inline client + check serveur basique, pas de Zod |
| D5 Dates | §6.8, §6.12 | `Date` natif + `toLocaleDateString('fr-FR')` |
| D6 Chemin PRD | (ce fichier) | `Docs/prd-admin-prospects.md` |
| D7 Seed initial | §7 | INSERT SQL commenté en fin de migration |
| D8 Interactions | §3.2 | Table `prospect_interactions` séparée, kinds `dm/call/email/note/meeting/status_change` |
| D9 Toggle Pipeline/Liste | §6.2 | `localStorage['lga-admin-prospects-view']`, default `pipeline` |
| D10 Sauvegarde édition | §6.5 | Explicite, bouton Enregistrer, pas d'optimistic update |
| D11 Drag → interaction auto | §6.4 | 2 requêtes séquentielles, pas d'RPC |
| D12 Fondateur | §3.1, §6.10 | `is_fondateur BOOLEAN DEFAULT false`, badge partout |
| D13 Filtres chips | §6.6 | Statuts cumulatifs, "À faire" et "Fondateur" exclusifs |
| D14 Search | §6.7 | Filter JS client, debounce 150ms, `includes` sur name/company/city/cp |
| D15 Actions en retard/aujourd'hui | §6.8 | Calcul client TZ Europe/Paris |
| D16 Statut Perdu | §6.9 | Caché en Pipeline, chip dédiée en Liste |

## Annexe B — Conformité règles repo

| Règle | Application dans le PRD |
|---|---|
| `.claude/rules/no-emoji.md` | Écart mockup tracé en §5.4 : emojis remplacés par Lucide via astro-icon |
| `.claude/rules/accessibility.md` | Touch targets 44×44 déjà implicites via `.btn` mockup ; `aria-label` sur crown Fondateur (§6.10) ; dnd-kit clavier natif (§6.3) |
| `.claude/rules/ymyl.md` | Hors scope — pas de contenu santé dans cette page admin |
| `.claude/rules/affiliate.md` | Hors scope |
| `CLAUDE.md` — TypeScript strict, no `any`, ESM, conventional commits | Types `src/types/prospect.ts` explicites, imports ES, commits `feat:` / `fix:` |
| `CLAUDE.md` — Accents UTF-8 HARD BLOCK | Tous les libellés français du PRD et du code à venir DOIVENT porter leurs accents (déjà fait dans ce document) |
| `CLAUDE.md` — Design system marine/crème/orange Inter/Merriweather 18px | Mockup respecte ; primitives UI respectent |

## Annexe C — Conventions endpoints

Pour référence lors de l'implémentation. Copié du pattern existant (audit §1.4 + `src/pages/api/admin/approve-claim.ts`) :

```
1. export const prerender = false;
2. import type { APIRoute } from 'astro';
3. Define ADMIN_EMAIL constant
4. export const POST: APIRoute = async ({ request, cookies }) => { try { ... } catch { return 500 } }
5. Inside try :
   - Read cookies sb-access-token + sb-refresh-token → if missing → 401
   - Re-create session via @supabase/supabase-js + anon key → get user
   - If user.email !== ADMIN_EMAIL → 401
   - Parse body, validate
   - Use createServerClient() for writes
   - Return Response with JSON
```

Pas de différence architecturale avec les routes existantes. Pas de middleware dédié aux `/api/admin/prospects/*` — chaque route fait son auth check inline (dupliqué mais cohérent avec l'existant).

---

**Fin du PRD.**

Livrable V1 estimé : 5 PR mergeables, ~10 h d'implémentation, pas de dépendance externe hors `@dnd-kit/*`, conforme aux règles repo et au mockup (écarts tracés §5.4).
