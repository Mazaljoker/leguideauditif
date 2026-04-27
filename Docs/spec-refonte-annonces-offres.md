## PROMPT CLAUDE CODE

```
Lis la spec complète dans Docs/spec-refonte-annonces-offres.md et exécute-la dans l'ordre des 3 blocs.

BLOC 1 (urgences) : corrections critiques, pas de validation nécessaire — fais-le.
BLOC 2 (nettoyage) : liste les fichiers que tu vas modifier AVANT de toucher quoi que ce soit, attends mon OK.
BLOC 3 (annonces services) : idem, liste puis attends validation.

Commit séparé par bloc :
- fix: critical fixes — profile, disable broken payments
- refactor: simplify annonces premium and offres page
- feat: add services professionnels category + seed 3 annonces
```

---

# SPEC REFONTE — Annonces & Offres LeGuideAuditif

**Date** : 2026-04-13
**Basée sur** : Docs/rapport-inspection-annonces-offres.md
**Objectif** : Simplifier, supprimer ce qui ne fonctionne pas, ajouter la catégorie services

---

## BLOC 1 — URGENCES (faire immédiatement)

### 1.1 Créer le profil chabbat.fr@gmail.com

Le user `b9e7fc86-7b5c-4acf-b579-0d2101898d6b` existe dans auth.users mais n'a PAS de ligne dans `profiles`. Le formulaire AnnonceForm.tsx va planter au pré-remplissage.

**Action :** INSERT dans la table `profiles` :

```sql
INSERT INTO profiles (id, nom, prenom, email, telephone, profil_type, centre_nom, centre_ville, centre_departement)
VALUES (
  'b9e7fc86-7b5c-4acf-b579-0d2101898d6b',
  'Chabbat',
  'Franck-Olivier',
  'chabbat.fr@gmail.com',
  NULL,
  'audioprothesiste',
  NULL,
  NULL,
  NULL
);
```

### 1.2 Désactiver les paiements Stripe des features non fonctionnelles

**Problème critique** : L'alerte ciblée (19€) encaisse le paiement via Stripe LIVE mais n'envoie jamais l'email. C'est un encaissement sans service rendu.

**Action dans `src/pages/api/annonces-checkout.ts` :**
Ajouter un blocage au début du handler pour TOUS les produits annonces. Retourner une erreur 400 avec message explicatif.

```typescript
// TEMPORAIREMENT DÉSACTIVÉ — les options premium annonces seront activées
// quand le volume d'annonces le justifiera
return new Response(JSON.stringify({
  error: 'Les options premium annonces ne sont pas encore disponibles. Déposez votre annonce gratuitement.'
}), { status: 400 });
```

**Pourquoi tout bloquer (pas seulement l'alerte ciblée) :**
- Alerte ciblée : email jamais envoyé (Resend non installé)
- Boost : le listing ne trie pas par boost_until, donc le boost ne fait rien
- Débloquer contacts : 0 visiteurs = 0 contacts à débloquer
- Annonce Premium : le listing ne différencie pas les annonces premium

On réactivera produit par produit quand chaque feature sera réellement fonctionnelle.

### 1.3 Écrire les migrations SQL manquantes

Les 5 tables annonces + profiles existent en prod mais n'ont PAS de migration dans le repo. C'est une dette technique critique.

**Action :** Créer un fichier `supabase/migrations/005_annonces_system.sql` qui contient le CREATE TABLE (avec IF NOT EXISTS) pour :
- `profiles`
- `annonces`
- `annonces_contacts`
- `annonces_paiements`
- `annonces_alertes`
- `annonces_signalements`

Reproduire fidèlement le schéma actuel de prod (colonnes, types, defaults, RLS policies). Ne PAS modifier le schéma, juste le documenter.

---

## BLOC 2 — NETTOYAGE (lister les fichiers, attendre validation)

### 2.1 Page /annonces/premium/ — Remplacer par une page d'attente

**NE PAS SUPPRIMER LA PAGE** (les URLs doivent rester stables). Remplacer le contenu par un message simple :

Titre : "Options premium — bientôt disponibles"

Contenu : 
```
Les annonces sur LeGuideAuditif sont gratuites. 
Des options de mise en avant seront proposées prochainement 
quand la rubrique sera bien alimentée.

En attendant, déposez votre annonce gratuitement — c'est 100% gratuit, 
sans limite de durée.
```

CTA unique : "Déposer une annonce" → /annonces/deposer/

**Supprimer entièrement** de cette page :
- Les 4 cartes options à la carte (débloquer contacts, annonce premium, boost, alerte ciblée)
- Les 2 packs cession (standard + accompagné)
- Tout pricing

### 2.2 Page /offres/ — Retirer les promesses non tenues

**Fichier** : `src/pages/offres/index.astro`

Dans la colonne **Premium (29€/mois)**, retirer :
- ~~"Leads patients routés directement vers votre centre"~~ → non implémenté
- ~~"Section avis patients (bientot)"~~ → pas de date, fait amateur

La colonne Premium doit contenir uniquement :
- Tout de la fiche gratuite
- Badge "Centre vérifié" par un DE
- Position prioritaire dans l'annuaire et la carte
- Réseaux sociaux affichés sur votre fiche

Dans la colonne **Sérénité (sur devis)**, retirer :
- ~~"Leads qualifiés et routage intelligent"~~ → non implémenté

La colonne Sérénité doit contenir :
- Tout du Premium
- Gestion de vos réseaux sociaux (nPosts)
- Analytics et reporting mensuel
- Interlocuteur dédié

### 2.3 Bouton "Passer en Premium" — Améliorer le parcours

**Problème actuel** : le CTA "Passer en Premium" renvoie vers /trouver-audioprothesiste/ — parcours trop long et confus.

**Action :** Changer le lien du bouton vers `/revendiquer/` (page de revendication directe).

Vérifier que la page /revendiquer/ est accessible sans paramètre centre (si elle nécessite un slug centre, garder le lien vers /trouver-audioprothesiste/ pour l'instant et ajouter un texte sous le bouton : "Trouvez votre centre sur la carte, puis cliquez sur Revendiquer").

### 2.4 AnnonceDetail.tsx — Masquer les boutons premium

**Fichier** : `src/components/annonces/AnnonceDetail.tsx`

Les boutons d'achat premium (Passer Premium, Booster, Débloquer contacts) sont affichés sur la page détail de chaque annonce pour le propriétaire.

**Action :** Masquer ces boutons tant que l'API est bloquée (BLOC 1.2). Ajouter un commentaire `// TODO: réactiver quand les features premium seront fonctionnelles`.

Ne pas supprimer le code, juste le conditionner avec un flag :
```typescript
const PREMIUM_FEATURES_ENABLED = false;
```

---

## BLOC 3 — AJOUT CATÉGORIE + ANNONCES SERVICES

### 3.1 Ajouter la catégorie "Services professionnels"

**Fichier** : `src/types/annonce.ts`

Ajouter dans le tableau/objet des catégories :

```typescript
{
  value: 'services',
  label: 'Services professionnels',
  icon: 'lucide:handshake',
}
```

Ajouter les sous-catégories pour `services` :
```typescript
services: ['marketing_digital', 'gestion_reseaux_sociaux', 'formation', 'conseil', 'comptabilite', 'juridique', 'autre']
```

**Vérifier aussi** : 
- Si des pages de listing par catégorie existent en dur (src/pages/annonces/cession/, emploi/, etc.), créer `src/pages/annonces/services/index.astro` sur le même modèle.
- Si le composant AnnonceListing.tsx filtre les catégories dynamiquement depuis le type, rien à faire côté listing.

### 3.2 Créer le profil complet si nécessaire

Si le BLOC 1.1 n'a pas encore été exécuté, le faire maintenant. Le user `b9e7fc86-7b5c-4acf-b579-0d2101898d6b` doit avoir un profil pour poster.

### 3.3 Créer les 3 annonces

Insérer directement en base Supabase (via le client server ou un script). Les 3 annonces sont pour le user `b9e7fc86-7b5c-4acf-b579-0d2101898d6b`.

**Champs communs :**
- `user_id` : `b9e7fc86-7b5c-4acf-b579-0d2101898d6b`
- `contact_email` : `franckolivier@leguideauditif.fr`
- `contact_nom` : `Franck-Olivier Chabbat`
- `contact_tel` : NULL
- `categorie` : `services`
- `sous_categorie` : `marketing_digital`
- `departement` : NULL
- `ville` : NULL
- `code_postal` : NULL
- `region` : NULL
- `statut` : `active`
- `is_premium` : false
- `is_verified` : true
- `expires_at` : NOW() + INTERVAL '1 year'
- `photos` : '{}'
- `slug` : généré via la fonction generateSlug existante dans src/lib/auth.ts

---

#### Annonce 1 — Fiche premium LeGuideAuditif

| Champ | Valeur |
|-------|--------|
| titre | Fiche audioprothésiste premium sur LeGuideAuditif.fr — 29€/mois |
| sous_categorie | marketing_digital |
| description | voir ci-dessous |

**Description :**
```
Audioprothésiste DE depuis 28 ans, j'ai créé LeGuideAuditif.fr, le premier site indépendant d'information santé auditive rédigé par un professionnel.

Votre centre y apparaît déjà gratuitement sur notre carte interactive (7 146 audioprothésistes référencés). La fiche premium vous offre en plus :

→ Badge "Centre vérifié" par un audioprothésiste DE
→ Vos spécialités et marques mises en avant
→ Liens vers vos réseaux sociaux
→ Positionnement prioritaire dans l'annuaire et la carte

29€/mois ou 290€/an (2 mois offerts). Sans engagement.

Contactez-moi directement : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE
```

---

#### Annonce 2 — nPosts solo pour audioprothésistes

| Champ | Valeur |
|-------|--------|
| titre | Publiez sur Facebook et Instagram en 30 secondes — nPosts pour audios |
| sous_categorie | gestion_reseaux_sociaux |
| description | voir ci-dessous |

**Description :**
```
Vous savez que vos patients vous cherchent sur les réseaux sociaux, mais vous n'avez pas le temps de publier ?

nPosts est un outil que j'ai développé spécifiquement pour les audioprothésistes indépendants :

→ 1 contenu adapté automatiquement pour Facebook et Instagram
→ Textes et visuels générés par IA, validés par un confrère
→ Planning de publication automatique
→ Fiche premium LeGuideAuditif offerte avec l'abonnement

29€/mois par centre, sans engagement.

Demandez une démo : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE, créateur de nPosts.ai
```

---

#### Annonce 3 — Sérénité (done-for-you)

| Champ | Valeur |
|-------|--------|
| titre | Zéro effort — on gère vos réseaux sociaux et vos avis Google |
| sous_categorie | gestion_reseaux_sociaux |
| description | voir ci-dessous |

**Description :**
```
Vous ne voulez pas gérer vos réseaux sociaux ? On s'en occupe entièrement.

L'offre Sérénité, c'est :

→ Contenu créé pour vous chaque semaine (textes et visuels professionnels)
→ Publication automatique sur Facebook, Instagram et Google Business Profile
→ Gestion et réponse à vos avis Google
→ Reporting mensuel et appel de 30 minutes
→ Fiche premium LeGuideAuditif offerte

Sur devis — contactez-moi pour un accompagnement adapté à votre centre.

Pensé par un audioprothésiste, pour des audioprothésistes.

Contactez-moi : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE depuis 28 ans
```

---

## 4. VÉRIFICATIONS POST-DÉPLOIEMENT

Après les 3 blocs, vérifier :

1. [ ] Le dropdown catégories sur /annonces/deposer/ affiche bien "Services professionnels"
2. [ ] Les 3 annonces apparaissent sur /annonces/ (listing général)
3. [ ] La page /annonces/services/ existe et affiche les 3 annonces
4. [ ] Chaque annonce a sa page détail /annonces/{slug}/
5. [ ] La page /annonces/premium/ affiche le message d'attente (plus de pricing)
6. [ ] La page /offres/ ne mentionne plus les leads routés ni les avis patients
7. [ ] L'API /api/annonces-checkout retourne 400 sur tout appel
8. [ ] Les boutons premium sont masqués dans AnnonceDetail.tsx
9. [ ] Build + preview OK sans erreur
10. [ ] Commit propre par bloc, push sur une branche feat/refonte-annonces, PAS sur main

---

## 5. CE QU'ON NE FAIT PAS DANS CETTE SPEC

- On ne touche PAS au système de paiement centres (Stripe subscription 29€/mois — ça marche)
- On ne touche PAS aux tables Supabase existantes (on ajoute une migration de documentation)
- On ne supprime PAS les pages /annonces/premium/ ni les composants premium (on les désactive)
- On ne supprime PAS les produits Stripe (on bloque l'API)
- On ne crée PAS de nouveau système de paiement
