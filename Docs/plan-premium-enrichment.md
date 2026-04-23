# Plan — Enrichissement fiche Premium (YMYL + local SEO)

**Objectif** : densifier sémantiquement la page publique `/centre/[slug]/` en mode Premium pour maximiser Google rankings YMYL + apporter de la valeur métier concrète à l'audio pour justifier les 39€/mois.

**Gain attendu** : position Google top-3 sur "audioprothésiste {ville}" + CTR +30% via rich results (FAQPage, HowTo, Review).

## Phase 1a — Fondations SEO + E-E-A-T (PR en cours)

### Migration SQL
- `centres_auditifs.audio_bio TEXT` — bio longue de l'audio (300-500 mots)
- `centres_auditifs.audio_annee_dip INTEGER` — année d'obtention du DE (calcul expérience auto)
- `centres_auditifs.audio_associations TEXT[]` — UNSAF, Collège National, SFA, AES, etc.
- `centres_auditifs.services_inclus JSONB` — {essai_30j, livraison_domicile, teleconsultation, urgences}
- `centres_auditifs.langues TEXT[]` — FR, EN, ES, LSF, IT, DE

### Composants Premium
- `PremiumExpertiseBlock.astro` — E-E-A-T : diplôme + RPPS + exp + associations + bio + `ProfessionalService` JSON-LD
- `PremiumFaqBlock.astro` — 5 questions locales dynamiques + `FAQPage` JSON-LD
- `PremiumParcoursBlock.astro` — 4 étapes bilan → essai → choix → suivi + `HowTo` JSON-LD
- `PremiumArticlesBlock.astro` — 3 articles contextualisés selon les marques/spécialités cochées

### Admin UI
- `/audioprothesiste-pro/fiche/` : nouvel onglet **Expertise** avec
  - Bio audio (textarea 500 chars)
  - Année diplôme
  - Associations (multi-select chips)
  - Langues (multi-select chips)
  - Services (toggles)
- Mise à jour `/api/centre-update` : ajout des champs aux `ALLOWED_FIELDS`

### Public
- `/centre/[slug]/` : conditionnellement rend les 4 blocs si `plan = 'premium'`
- Chaque bloc gate `noindex` si demo

### Pricing
- `/revendiquer/` : reformulation de la liste avantages Premium avec les nouveaux éléments (mettre en avant la visibilité Google)

## Phase 1b — Accessibilité + équipement (PR suivante)

- Migration : `equipement_cabine JSONB`, `accessibilite JSONB`, `partenaires_locaux JSONB`
- Composants : `PremiumEquipementBlock`, `PremiumAccessibiliteBlock`, `PremiumPartenairesBlock`
- Schema `LocalBusiness` enrichi avec props `amenityFeature`, `maximumAttendeeCapacity`

## Phase 2 — Contenu généré par l'audio

### Nouvelles tables
- `centre_actualites` : id, centre_id, title, body, published_at, slug
- `centre_cas_patients` : id, centre_id, profil_age, perte_type, solution, resultat_mois, verdict
- `centre_appareils_phares` : id, centre_id, produit_slug (lien vers /comparatifs/...), verdict_audio, ordre

### Composants
- `PremiumActualitesBlock.astro` — fil des 3 derniers posts
- `PremiumCasPatientsBlock.astro` — 3-5 cas anonymisés + `CaseStudy` schema
- `PremiumAppareilsPharesBlock.astro` — 3-6 produits éditoriaux

### Admin UI
- Tabs dédiés `/audioprothesiste-pro/fiche/actualites/`, `/cas-patients/`, `/mes-appareils/`
- CRUD complet avec WYSIWYG simple (textarea + markdown-lite)

## Phase 3 — Outils uniques et long terme

- **Simulateur reste à charge** localisé (inputs classe + mutuelle + âge → estimation)
- **Vidéo de présentation audio** (30-60s YouTube embed + transcription SEO)
- **Système avis patients LGA interne** (attestation post-RDV + `Review` JSON-LD)
- **Intégration partenaires locaux** (ORL, EHPAD, kinés avec accord)

## Ordonnancement SEO (priorité rank)

1. **E-E-A-T Expertise** (Phase 1a) — impact immédiat sur YMYL, Google pondère ×1.75 sur santé
2. **FAQPage JSON-LD** (Phase 1a) — rich results = CTR +30%
3. **HowTo JSON-LD** (Phase 1a) — éligibilité AI answers (ChatGPT, Gemini, Perplexity)
4. **Articles contextualisés** (Phase 1a) — maillage interne dense + temps passé
5. **Actualités fraîches** (Phase 2) — freshness signal Google
6. **Cas patients / Review JSON-LD** (Phase 2) — authority + différenciation
7. **Vidéo transcrite** (Phase 3) — 500+ mots SEO gratuits
8. **Simulateur backlinks** (Phase 3) — outil unique → liens entrants

## KPIs à tracker après déploiement

- Position moyenne Google pour requêtes "audioprothésiste {ville}" sur le top 100 des centres Premium
- CTR (impressions GSC → clicks) sur les fiches enrichies vs non-enrichies
- Temps passé sur la page (`scroll_depth_50`, `engaged_session_30s` GA4)
- Conversions leads depuis fiche Premium enrichie vs version précédente
