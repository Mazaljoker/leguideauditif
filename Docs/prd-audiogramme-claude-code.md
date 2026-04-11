# PRD — Page Guide "Audiogramme"
## LeGuideAuditif.fr | Claude Code Spec
## Mode recommandé : `plan` d'abord, puis `edit` fichier par fichier

---

## CONTEXTE

Créer une page pilier guide sur l'audiogramme pour LeGuideAuditif.fr.
- **URL cible** : /guides/audiogramme/
- **Keyword principal** : "audiogramme" (3 600 vol/mois FR, KD 16)
- **Type** : Guide informatif pur (PAS un comparatif affilié)
- **Layout** : GuideLayout.astro (breadcrumbs, TOC, auteur, disclaimer inclus)
- **Audience** : Seniors 65+, vouvoiement, Flesch FR 60-80

---

## FICHIERS À CRÉER / MODIFIER

### 1. CONTENU MDX (CRÉER)

**Fichier** : `src/content/guides/audiogramme/index.mdx`

**Frontmatter** :
```yaml
---
title: "Audiogramme : Lire et Comprendre Vos Résultats (Guide Expert 2026)"
description: "Comment lire un audiogramme tonal et vocal ? Guide par un audioprothésiste DE (28 ans). Exemples, interprétation, quand consulter."
author: "franck-olivier"
date: 2026-04-12
updated: 2026-04-12
category: "perte-auditive"
tags: ["audiogramme", "test auditif", "bilan auditif", "perte auditive"]
image:
  src: "/images/guides/audiogramme/audiogramme-annote.webp"
  alt: "Audiogramme annoté montrant les axes fréquences et décibels avec zones de perte auditive colorées"
schema:
  type: "Article"
  additionalSchemas: ["FAQPage", "MedicalWebPage"]
readingTime: 12
---
```

**Structure H1/H2/H3** (ordre exact) :

```
H1: Comprendre Votre Audiogramme : Le Guide Complet par un Audioprothésiste

H2: Qu'est-ce qu'un audiogramme ?
  → Définition snippet (40-60 mots, 1er paragraphe)
  → Qui réalise l'examen (ORL, audioprothésiste)
  → Déroulement (cabine insonorisée, 15-30 min, indolore)

H2: Audiogramme tonal et vocal : quelle différence ?
  → Tableau comparatif (tonal vs vocal : ce qu'il mesure, unité, résultat)
  → Tonal : sons purs, fréquences 125-8000 Hz, conduction aérienne + osseuse
  → Vocal : intelligibilité, listes dissyllabiques, % compréhension

H2: Comment lire un audiogramme ?
  → Liste ordonnée 3-5 étapes (snippet target)
  → Axe X = fréquences (Hz), Axe Y = intensité (dB HL)
  → Rouge = oreille droite, Bleu = oreille gauche
  → Symboles : O, X, <, >
  → Écart aérien-osseux
  → [Image : audiogramme-annote.webp]

H2: Audiogramme normal : quels résultats attendre ?
  → Seuil normal = 0-20 dB HL toutes fréquences
  → Tableau par tranche d'âge (20, 40, 60, 70 ans) — source ISO 7029
  → Nuance : audiogramme normal ≠ absence de gêne

H2: Les degrés de perte auditive sur l'audiogramme
  → Tableau classification BIAP (légère/moyenne/sévère/profonde)
  H3: Audiogramme et presbyacousie
    → Courbe typique en pente sur les aigus, dip 4000 Hz
  H3: Audiogramme et surdité de transmission
    → Écart aérien-osseux, causes (otite, otospongiose)
  H3: Surdité mixte
    → Combinaison des deux

H2: Audiogramme de l'enfant : particularités
  → Court (150-200 mots)
  → Audiométrie comportementale, PEA, OEA
  → Dépistage néonatal obligatoire depuis 2012

H2: Combien coûte un audiogramme ?
  → Gratuit chez l'audioprothésiste
  → Consultation ORL : 30-55€, remboursé SS
  → [CTA mid-article : composant LeadCTA.astro — "Bilan auditif gratuit près de chez vous"]

H2: Peut-on faire un audiogramme en ligne ?
  → Limitations (pas de cabine, pas de conduction osseuse)
  → Utile comme dépistage, ne remplace pas un bilan
  → [Composant AudiogramSimulator.tsx — outil interactif]
  → Disclaimer YMYL obligatoire

H2: Quand consulter après un audiogramme ?
  → Perte >25 dB fréquences conversationnelles
  → Asymétrie >15 dB (urgence ORL)
  → Surdité brusque = urgence 48h
  → [CTA fin : lien /trouver-audioprothesiste/]

H2: FAQ — Vos questions sur l'audiogramme
  → 7 questions (voir brief pour le détail)
  → Composant FAQ.astro avec schema FAQPage
```

**Règles de rédaction** :
- Vouvoiement systématique
- Flesch FR 60-80 (phrases courtes, vocabulaire accessible)
- JAMAIS de promesse thérapeutique
- Toute affirmation médicale sourcée (HAS, BIAP, ISO 7029, INSERM)
- Mentionner systématiquement "à date de publication" si source > 3 ans
- Min 2 400 mots, max 3 500 mots
- Mots interdits : "guérir", "éliminer", "100% efficace", "miracle"

---

### 2. COMPOSANT REACT — OUTIL INTERACTIF (CRÉER)

**Fichier** : `src/components/AudiogramSimulator.tsx`

**Specs fonctionnelles** :
- 2 curseurs : Fréquence (125-8000 Hz) + Intensité (0-120 dB)
- Affichage d'un point sur un graphique audiogramme
- Zone colorée indiquant le degré de perte (vert/jaune/orange/rouge)
- Texte explicatif dynamique selon la position : "À {freq} Hz et {dB} dB, cela correspond à une perte auditive {degré} selon la classification BIAP."
- **PAS de diagnostic**, **PAS de recommandation produit**
- Disclaimer en bas : "Cet outil est à visée éducative uniquement. Il ne constitue pas un examen médical. Consultez un audioprothésiste ou un ORL pour un bilan complet."

**Specs techniques** :
- React 19, TypeScript strict
- Pas de `any`
- Styling : Tailwind v4 utility classes uniquement
- Icônes : SVG inline Lucide (PAS d'emoji)
- Accessible : labels, aria-label, focus visible 3px orange (#D97B3D)
- Touch targets 44×44px minimum
- `prefers-reduced-motion` respecté (pas d'animation si activé)
- Couleurs : marine (#1B2E4A), crème (#F8F5F0), orange (#D97B3D)
- Font : Inter pour l'UI
- Responsive mobile-first

**Classification BIAP à coder en dur** :
```typescript
const BIAP_LEVELS = [
  { min: 0, max: 20, label: "Audition normale", color: "#22c55e" },
  { min: 21, max: 40, label: "Perte légère", color: "#eab308" },
  { min: 41, max: 70, label: "Perte moyenne", color: "#f97316" },
  { min: 71, max: 90, label: "Perte sévère", color: "#ef4444" },
  { min: 91, max: 120, label: "Perte profonde", color: "#991b1b" },
] as const;
```

---

### 3. IMAGES (CRÉER)

**Dossier** : `public/images/guides/audiogramme/`

Les images sont à créer manuellement (hors scope Claude Code) mais prévoir les balises dans le MDX :

| Fichier | Alt text | Dimensions |
|---------|----------|------------|
| `audiogramme-annote.webp` | Audiogramme annoté avec axes fréquences (Hz) et intensité (dB), symboles oreille droite et gauche | 1200×800 |
| `audiogramme-presbyacousie.webp` | Audiogramme typique de presbyacousie montrant une chute dans les fréquences aiguës | 800×600 |
| `audiogramme-transmission.webp` | Audiogramme de surdité de transmission montrant l'écart aérien-osseux | 800×600 |
| `audiogramme-mixte.webp` | Audiogramme de surdité mixte combinant composante transmission et perception | 800×600 |

**Placeholder** : utiliser des `<div>` stylisées avec texte descriptif en attendant les vrais visuels. Ne PAS laisser de `<img>` cassées.

---

### 4. PDF TÉLÉCHARGEABLE (CRÉER)

**Fichier** : `public/downloads/audiogramme-vierge-leguideauditif.pdf`

PDF simple 1 page :
- Grille audiogramme vierge (fréquences 125-8000 Hz, dB 0-120)
- Logo LeGuideAuditif.fr en footer
- Texte : "Audiogramme vierge — Téléchargez, imprimez, apportez à votre audioprothésiste"
- Lien retour : leguideauditif.fr/guides/audiogramme/

**Hors scope immédiat** — créer un lien placeholder dans le MDX :
```mdx
<a href="/downloads/audiogramme-vierge-leguideauditif.pdf" download>
  Télécharger l'audiogramme vierge (PDF)
</a>
```

---

### 5. SCHEMA JSON-LD (VÉRIFIER / COMPLÉTER)

Le `GuideLayout.astro` et `SEOHead.astro` gèrent déjà Article + BreadcrumbList.

**À ajouter dans le MDX ou via SEOHead** :

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "Audiogramme : Lire et Comprendre Vos Résultats",
  "about": {
    "@type": "MedicalCondition",
    "name": "Perte auditive"
  },
  "lastReviewed": "2026-04-12",
  "reviewedBy": {
    "@type": "Person",
    "name": "Franck-Olivier Chabbat",
    "jobTitle": "Audioprothésiste diplômé d'État",
    "url": "https://leguideauditif.fr/auteur/franck-olivier/"
  }
}
```

Le Schema FAQPage est géré par le composant `FAQ.astro` — s'assurer que les 7 questions sont passées en props.

---

### 6. FICHIERS EXISTANTS À MODIFIER

#### `src/content/config.ts` (si nécessaire)
Vérifier que la collection `guides` accepte le dossier `audiogramme/`. Si les guides utilisent `[...slug].astro` avec un catch-all, le fichier `audiogramme/index.mdx` devrait être routé automatiquement vers `/guides/audiogramme/`.

#### `src/pages/guides/index.astro`
Ajouter la carte du guide audiogramme dans le hub si ce n'est pas automatique (vérifier si le hub liste dynamiquement tous les guides ou si c'est hardcodé).

---

## CHECKLIST AVANT BUILD

```
□ npm run dev fonctionne
□ Page accessible sur /guides/audiogramme/
□ Title < 60 chars dans l'onglet navigateur
□ Meta description visible dans le code source
□ H1 unique et différent du Title
□ AuthorBox.astro affiché avec credentials DE
□ HealthDisclaimer.astro affiché (haut + bas)
□ Breadcrumbs : Accueil > Guides > Audiogramme
□ TableOfContents fonctionnelle (liens H2)
□ FAQ.astro avec 7 questions
□ AudiogramSimulator.tsx rendu et interactif
□ Disclaimer sur l'outil interactif visible
□ CTA "Bilan auditif gratuit" visible (mid-article)
□ CTA "Trouver audioprothésiste" visible (fin)
□ Min 5 liens internes fonctionnels
□ Pas d'images cassées (placeholders si visuels pas prêts)
□ Schema JSON-LD Article + FAQPage + MedicalWebPage dans le source
□ npm run build sans erreur
□ 0 erreur TypeScript
□ Lighthouse accessibilité > 90
□ Mobile responsive (tester 375px)
```

---

## HORS SCOPE (NE PAS FAIRE)

- ❌ Diagnostic IA / GPT-4 Vision / analyse d'image uploadée
- ❌ Recommandation de produit ou d'appareil auditif
- ❌ Formulaire de lead (LeadForm.tsx) — c'est un guide, pas un comparatif
- ❌ AffiliateDisclosure.astro — pas de contenu affilié
- ❌ Création des images WebP (à faire manuellement)
- ❌ Email capture / newsletter sur cette page
- ❌ Tests E2E
