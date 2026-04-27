# SPEC — Ajout catégorie "Services professionnels" + 3 annonces

## Contexte
La rubrique Annonces de leguideauditif.fr est live mais vide.
On ajoute une 5e catégorie et on seed 3 annonces de services LGA/nPosts.

**URL annonces :** https://leguideauditif.fr/annonces/deposer/
**Repo :** https://github.com/Mazaljoker/leguideauditif
**Stack :** Astro 6 + React 19 + Supabase
**User pour les annonces :** chabbat.fr@gmail.com

---

## 1. AJOUT CATÉGORIE

### Catégories existantes (dans l'ordre actuel)
1. Cession & Installation
2. Emploi & Recrutement
3. Remplacement
4. Matériel professionnel

### Nouvelle catégorie à ajouter
5. **Services professionnels**

**Où modifier :**
- Chercher dans le code source (composants, config Supabase, ou fichier de données) l'endroit où les catégories sont définies
- Ajouter "Services professionnels" en 5e position
- Si les catégories sont en base Supabase : INSERT dans la table concernée
- Si elles sont en dur dans le code : ajouter dans le tableau/enum

---

## 2. CRÉATION DES 3 ANNONCES

Toutes les annonces sont créées pour le compte **chabbat.fr@gmail.com**.
Si le système nécessite une authentification, utiliser ce compte.

### Annonce 1 — Fiche premium LeGuideAuditif

| Champ | Valeur |
|-------|--------|
| Catégorie | Services professionnels |
| Titre | Fiche premium audioprothésiste sur LeGuideAuditif.fr — 29€/mois |
| Localisation | France entière |
| Département | (vide ou "Tous") |
| Ville | (vide) |
| Code postal | (vide) |

**Description :**
```
Audioprothésiste DE depuis 28 ans, j'ai créé LeGuideAuditif.fr, le premier site indépendant d'information santé auditive rédigé par un professionnel.

Votre centre y apparaît déjà gratuitement sur notre carte interactive. La fiche premium vous donne en plus :

→ Badge "Recommandé par un audioprothésiste DE"
→ Vos spécialités et marques mises en avant
→ Liens vers vos réseaux sociaux
→ Positionnement prioritaire dans les résultats

29€/mois ou 290€/an (2 mois offerts).

Contactez-moi directement : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE
```

---

### Annonce 2 — nPosts solo pour audioprothésistes

| Champ | Valeur |
|-------|--------|
| Catégorie | Services professionnels |
| Titre | Publiez sur Facebook + Instagram en 30 secondes — nPosts pour audios |
| Localisation | France entière |
| Département | (vide ou "Tous") |
| Ville | (vide) |
| Code postal | (vide) |

**Description :**
```
Vous savez que vos patients vous cherchent sur les réseaux sociaux, mais vous n'avez pas le temps de publier ?

nPosts est un outil que j'ai développé spécifiquement pour les audioprothésistes indépendants :

→ 1 contenu adapté automatiquement pour Facebook + Instagram
→ Textes et visuels générés par IA, validés par un confrère
→ Planning de publication automatique
→ Fiche premium LeGuideAuditif offerte avec l'abonnement

29€/mois par centre, sans engagement.

Demandez une démo : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE, créateur de nPosts.ai
```

---

### Annonce 3 — Sérénité (done-for-you)

| Champ | Valeur |
|-------|--------|
| Catégorie | Services professionnels |
| Titre | Zéro effort : on gère vos réseaux sociaux et vos avis Google — 349€/mois |
| Localisation | France entière |
| Département | (vide ou "Tous") |
| Ville | (vide) |
| Code postal | (vide) |

**Description :**
```
Vous ne voulez pas gérer vos réseaux sociaux ? On s'en occupe entièrement.

L'offre Sérénité, c'est :

→ Contenu créé pour vous chaque semaine (textes + visuels professionnels)
→ Publication automatique sur Facebook, Instagram et Google Business Profile
→ Gestion et réponse à vos avis Google
→ Reporting mensuel + appel de 30 minutes
→ Fiche premium LeGuideAuditif offerte

349€/mois, tout compris.

Pensé par un audioprothésiste, pour des audioprothésistes. Je connais votre quotidien — vous méritez de vous concentrer sur vos patients.

Contactez-moi : franckolivier@leguideauditif.fr
Franck-Olivier Chabbat — Audioprothésiste DE depuis 28 ans
```

---

## 3. NOTES TECHNIQUES POUR CLAUDE CODE

1. **Identifier d'abord** où sont stockées les catégories (Supabase ? fichier config ? enum TypeScript ?) avant de modifier quoi que ce soit
2. **Identifier comment les annonces sont créées** (formulaire front → API → Supabase ? directement en base ?)
3. **Pour le champ Localisation** : si le formulaire impose un département, utiliser une valeur type "Tous départements" ou "00" selon ce que le système accepte. L'important est que l'annonce soit visible partout.
4. **Vérifier** que le user chabbat.fr@gmail.com existe dans le système d'auth. Si non, le créer ou utiliser le compte admin existant.
5. **Build + preview** après modification pour vérifier que la catégorie apparaît dans le dropdown et que les 3 annonces s'affichent correctement.
6. **Commit message :** `feat: add services professionnels category + seed 3 LGA/nPosts ads`
