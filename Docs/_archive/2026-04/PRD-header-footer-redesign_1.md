# PRD — Refonte Header & Footer LeGuideAuditif.fr

## Contexte

Le header et le footer actuels présentent des problèmes d'UX pour l'audience cible (seniors 65+) : trop de liens (8 nav + 29 footer), jargon ("Annonces", "audio"), mention inutile ("Auzen.com"), absence de recherche, et non-respect des best practices seniors (taille police, touch targets).

**Objectif :** simplifier la navigation, renforcer la confiance, respecter les guidelines UX seniors et santé.

**Repo :** https://github.com/Mazaljoker/leguideauditif
**Branche :** `fix/header-footer-redesign`

---

## 1. HEADER — Fichier : `src/components/Header.astro`

### 1.1 Top bar (trust bar)

**Actuel :** "Guide independant redige par un audioprothesiste DE — 28 ans de clinique, 5 ans chez Auzen.com"

**Nouveau :** "Guide independant redige par un audioprothesiste diplome d'Etat — sources medicales verifiees"

- Supprimer la mention "Auzen.com" (n'apporte rien au visiteur patient)
- Supprimer "28 ans de clinique" (détail gardé pour la page auteur, pas la top bar)
- Garder le style actuel : bg-marine, text-white, text-[13px], centré

### 1.2 Navigation desktop — passer de 8 à 5 items

**Actuelle (8 items) :**
```
Perte auditive | Audiogramme | Appareils | Acouphenes | Prix & remboursement | Catalogue | Comparatifs | Annonces | [CTA]
```

**Nouvelle (5 items + CTA) :**
```
Guides | Appareils & prix | Audiogramme | FAQ | [Icone recherche] | [CTA: Trouver un audioprothesiste]
```

**Détail des items :**

| Item | Lien | Contenu |
|------|------|---------|
| Guides | `/guides/` | Regroupe : perte auditive, acouphènes, prévention, vie quotidienne, audioprothésiste |
| Appareils & prix | `/catalogue/` | Regroupe : catalogue, comparatifs, remboursement |
| Audiogramme | `/guides/audiogramme/` | Lien direct (page populaire) |
| FAQ | `/faq/` | Lien direct |
| 🔍 (recherche) | — | Icône loupe, ouvre un overlay de recherche (voir section 1.4) |
| **CTA** | `/trouver-audioprothesiste/` | Bouton orange : "Trouver un audioprothesiste" |

**Règles :**
- "Annonces" disparaît de la nav principale → déplacé dans le footer sous "Espace pro"
- Le CTA dit "Trouver un audioprothesiste" en entier, pas "Trouver un audio"
- Taille police nav : `text-base` (16px), pas `text-[15px]`
- Espacement items : `gap-8` minimum

### 1.3 Navigation mobile

**Hamburger menu :**
- Même 5 items que desktop, empilés verticalement
- Chaque item : `py-4` (48px touch target minimum), `text-lg` (18px)
- CTA orange pleine largeur en bas du menu
- Animation : slide-down smooth (pas de `hidden` toggle brutal)
- Bouton hamburger : `44x44px` minimum, `aria-expanded` géré

### 1.4 Recherche (nouveau) — Pagefind

**Librairie :** [Pagefind](https://pagefind.app/) — search statique, indexation au build, zéro serveur.

**Installation :** `npm install -D pagefind`
**Build :** ajouter `pagefind --site dist` après `astro build` dans le script npm, ou utiliser l'intégration `astro-pagefind`.

**Desktop :** icône loupe Lucide (`lucide:search`) à gauche du CTA. Au clic, ouvre un overlay plein largeur sous le header avec le composant Pagefind UI (`new PagefindUI({ element: "#search" })`). Le visiteur tape sa requête → résultats instantanés avec extraits et liens.

**Mobile :** même icône dans le header, même overlay.

**Style :** surcharger les CSS variables Pagefind pour matcher le design system (marine, crème, orange, Inter 16px).

**Implémentation :** JavaScript vanilla (pas de React). Pagefind UI se charge en lazy via `import()` au premier clic sur la loupe pour ne pas impacter le chargement initial.

### 1.5 Header sticky

- Le header (sans la top bar) reste sticky `top-0`
- La top bar scrolle avec le contenu (comportement actuel, garder)
- Sur scroll > 50px, ajouter une classe qui réduit le padding du header (`py-2` au lieu de `py-4`) pour gagner de la place

---

## 2. FOOTER — Fichier : `src/components/Footer.astro`

### 2.1 Structure — 3 zones

#### Zone 1 — Bandeau CTA (haut du footer)

Fond : `bg-orange/10` ou un dégradé léger distinct du footer marine.

Contenu :
```
Vous cherchez un audioprothesiste ?
7 146 professionnels references sur notre carte interactive
[Bouton : Consulter la carte]
```

Le bouton pointe vers `/trouver-audioprothesiste/`.

#### Zone 2 — Liens en 3 colonnes (milieu)

**Colonne 1 : "Comprendre"**
- Perte auditive → `/guides/perte-auditive/`
- Acouphenes → `/guides/acouphenes/`
- Presbyacousie → `/guides/perte-auditive/presbyacousie/`
- Audiogramme → `/guides/audiogramme/`
- Prevention → `/guides/prevention/`

**Colonne 2 : "S'equiper"**
- Appareils auditifs → `/guides/appareils-auditifs/`
- Comparatifs 2026 → `/comparatifs/meilleur-appareil-auditif-2026/`
- Catalogue → `/catalogue/`
- Prix & remboursement → `/guides/remboursement/`
- 100% Sante → `/guides/remboursement/100-sante-audition/`

**Colonne 3 : "Le site"**
- A propos → `/a-propos/`
- Contact → `/contact/`
- FAQ → `/faq/`
- Glossaire → `/glossaire/`
- Espace pro → `/annonces/`

**Mobile :** les 3 colonnes passent en accordéon (titre cliquable → liens se déplient). Pas de scroll infini de 29 liens.

#### Zone 3 — Barre légale (bas du footer)

Une ligne compacte, séparée par des `|` :

```
© 2026 LeGuideAuditif.fr — Tous droits reserves | Mentions legales | CGU | Confidentialite | Contenu verifie par un audioprothesiste DE
```

### 2.2 Bloc identité (remplace l'ancien bloc brand)

**Actuel :**
```
LeGuideAuditif
Le guide independant pour mieux entendre
Redige par Franck-Olivier, audioprothesiste DE — 28 ans de clinique, 5 ans chez Auzen.com.
Contenu independant, sources medicales verifiees.
```

**Nouveau (au-dessus des 3 colonnes, pleine largeur) :**
```
LeGuideAuditif
Le guide independant pour mieux entendre
Redige par Franck-Olivier Chabbat, audioprothesiste diplome d'Etat.
```

- Supprimer "Auzen.com"
- Supprimer "28 ans de clinique" (déjà dans la page auteur et la top bar)
- Ajouter le lien vers la page auteur : `/auteur/franck-olivier/`

---

## 3. Design

### Palette (inchangée)
- Marine : `#1B2E4A`
- Crème : `#F8F5F0`
- Orange : `#D97B3D`

### Typographie header
- Nav items : `text-base` (16px), `font-medium`, Inter
- CTA : `text-base` (16px), `font-semibold`, Inter
- Top bar : `text-[13px]`, Inter

### Typographie footer
- Titres colonnes : `text-sm`, `uppercase`, `tracking-widest`, `font-bold`
- Liens : `text-base` (16px), Inter (monter depuis 15px)
- Bloc identité : `text-xl` pour le nom, `text-sm` pour la description
- Barre légale : `text-[13px]`

### Accessibilité seniors
- Touch targets : 48px minimum sur tous les liens et boutons (mobile ET desktop)
- Focus visible : `outline-3 outline-orange` (existant, garder)
- `aria-label` sur nav, bouton recherche, bouton hamburger
- `aria-expanded` sur hamburger et accordéons footer mobile
- Pas de hover-only : tout accessible au clavier et au tap
- `prefers-reduced-motion` : désactiver les animations de transition
- Skip-to-content : déjà en place dans BaseLayout, garder

### Icônes
- Recherche : `lucide:search` via astro-icon
- Hamburger : SVG inline (3 barres, pattern actuel)
- PAS d'emoji nulle part

---

## 4. Comportement responsive

### Breakpoints

| Viewport | Header | Footer |
|----------|--------|--------|
| ≥ 1024px (lg) | Nav desktop 5 items + recherche + CTA | 3 colonnes |
| 768-1023px (md) | Hamburger | 2 colonnes |
| < 768px (sm) | Hamburger | Accordéon (1 colonne) |

### Header mobile
- Logo (favicon) à gauche
- Icône recherche + hamburger à droite
- Menu : slide-down, fond blanc, liens empilés, CTA en bas

### Footer mobile
- Bloc identité pleine largeur
- Bandeau CTA pleine largeur
- 3 sections accordéon (Comprendre / S'équiper / Le site)
- Barre légale : empilée verticalement, centrée

---

## 5. Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/components/Header.astro` | Réécrire |
| `src/components/Footer.astro` | Réécrire |

Aucun nouveau fichier à créer (sauf config Pagefind si nécessaire). Dépendance à ajouter : `pagefind` (devDependency).

---

## 6. Ce qui est hors scope

- Mega-menu / sous-menus dropdown (pas adapté seniors, on garde des liens directs)
- Refonte du logo (garder l'existant)
- Page `/annonces/` (elle existe déjà, on la déplace juste dans le footer)

---

## 7. Critères d'acceptation

- [ ] Header desktop : 5 items de nav + icône recherche + CTA, rien d'autre
- [ ] Header mobile : hamburger fonctionnel, touch targets ≥ 48px
- [ ] Footer : bandeau CTA + 3 colonnes + barre légale
- [ ] Footer mobile : accordéon fonctionnel
- [ ] Aucune mention de "Auzen.com" nulle part
- [ ] "Annonces" n'est plus dans la nav principale
- [ ] CTA dit "Trouver un audioprothesiste" (pas "un audio")
- [ ] Taille police nav ≥ 16px
- [ ] `npm run build` sans erreur
- [ ] Lighthouse accessibility ≥ 90

---

## 8. Priorité

**P1** — Le header et le footer sont visibles sur chaque page du site. C'est la première impression pour les visiteurs et les journalistes qui vont découvrir l'étude déserts auditifs.

**Conventional commit :** `fix: redesign header and footer for senior UX`
**Branche :** `fix/header-footer-redesign`
