# Configuration Auth Espace pro — À activer manuellement

Ce document liste les étapes de configuration externe nécessaires pour que
les 3 méthodes d'authentification de `/connexion-pro/` fonctionnent en
production. La partie code est déjà livrée (PR 3).

## 1. Email + mot de passe

**Déjà actif par défaut** sur Supabase. À vérifier :

1. Aller sur https://supabase.com/dashboard/project/ftinchxyuqpnxilypmyk/auth/providers
2. Vérifier que **Email provider** est activé (toggle ON)
3. Vérifier les réglages :
   - `Confirm email` : **désactivé** (les pros revendiquent, on ne veut pas
     leur demander de re-confirmer à chaque changement de password)
   - `Minimum password length` : 8 (correspond à notre validation côté API)

Si un pro existe déjà (compte créé via magic link lors de la revendication),
il peut définir son mot de passe depuis `/audioprothesiste-pro/compte/`
section "Mot de passe". Aucun reset email n'est nécessaire.

## 2. Google OAuth — 2 flows possibles avec le même Client ID

LeGuideAuditif implémente **les deux flows** sur `/connexion-pro/` :

- **Flow A — Google One Tap + bouton officiel** (priorité visuelle en haut de page)
  Appel `signInWithIdToken` — **zéro redirection**, user reste sur notre page.
  Nécessite la variable d'env `PUBLIC_GOOGLE_CLIENT_ID`.
  Si absente, le bloc One Tap ne s'affiche tout simplement pas.
- **Flow B — OAuth redirect** (onglet Google dans les tabs, fallback)
  Appel `signInWithOAuth` — redirige vers `accounts.google.com` puis retour.
  Utilise le Client ID + Secret côté Supabase dashboard.

Les deux flows partagent **le même OAuth 2.0 Client ID Google**. Configurez
les deux pour une couverture maximale.

### Étape A — Google Cloud Console

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou utiliser le projet existant LeGuideAuditif
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Type d'application : **Web application**
5. Authorized JavaScript origins :
   ```
   https://leguideauditif.fr
   http://localhost:4321
   ```
6. Authorized redirect URIs (copie depuis Supabase dashboard, étape B) :
   ```
   https://ftinchxyuqpnxilypmyk.supabase.co/auth/v1/callback
   ```
7. Créer → récupérer **Client ID** + **Client Secret**

### Étape B — Supabase Dashboard

1. Aller sur https://supabase.com/dashboard/project/ftinchxyuqpnxilypmyk/auth/providers
2. Cliquer sur **Google**
3. Toggle ON
4. Coller :
   - **Client ID** (Google console)
   - **Client Secret** (Google console)
5. **Redirect URL** affichée = celle à copier dans Google Cloud (étape A.6)
6. Save

### Étape B.bis — Variable d'env pour le Flow A (One Tap)

Pour activer le bloc "Connexion rapide" en haut de `/connexion-pro/` :

1. Copier le **Client ID** Google (étape A.7)
2. Ajouter dans :
   - `.env` local :
     ```
     PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxxxxxx.apps.googleusercontent.com
     ```
   - Vercel → Project Settings → Environment Variables :
     - Name: `PUBLIC_GOOGLE_CLIENT_ID`
     - Value: même Client ID
     - Environments: Production, Preview, Development

> **Important** : le préfixe `PUBLIC_` fait que la valeur est **exposée côté client**. C'est attendu et safe — un Client ID Google n'est pas un secret (c'est un identifiant public, comme un nom de domaine). Le Client Secret, lui, reste côté serveur Supabase.

### Étape C — Configuration OAuth consent screen (Google)

1. https://console.cloud.google.com/apis/credentials/consent
2. User Type : **External**
3. App name : `LeGuideAuditif`
4. Support email : `franckolivier@leguideauditif.fr`
5. Logo : `/public/favicon.png` (format ≥ 120×120)
6. App domain : `leguideauditif.fr`
7. Authorized domains : `leguideauditif.fr`, `supabase.co`
8. Developer contact : `franckolivier@leguideauditif.fr`
9. Scopes : `email`, `profile`, `openid` (par défaut — suffisent)
10. Test users (si en mode Testing) : ajouter les emails des pros testeurs
11. Publier l'app (Production) → Google vérifie la politique de confidentialité

> **Note** : tant que l'app est en "Testing", seuls les comptes listés en
> test users peuvent se connecter. Pour passage en production, Google vérifie
> que la politique de confidentialité est publiée et accessible
> (`https://leguideauditif.fr/politique-confidentialite/` — déjà en place).

### Étape D — Test

1. Aller sur https://leguideauditif.fr/connexion-pro/
2. Onglet **Google**
3. Clic "Se connecter avec Google"
4. Redirection Google → choisir le compte → autorisation
5. Retour automatique sur `/auth/callback-pro` puis `/audioprothesiste-pro/`

## 3. Magic link (email OTP)

**Déjà en production depuis le début**. Aucune action.

## 4. Vérification post-déploiement

Checklist à cocher après activation :

- [ ] Login par mot de passe fonctionne avec un pro existant qui a défini son password via `/audioprothesiste-pro/compte/`
- [ ] Google OAuth redirige vers Google puis revient sur l'espace pro
- [ ] Magic link fonctionne toujours (non cassé)
- [ ] `/audioprothesiste-pro/compte/` affiche bien l'email Google du compte Google lié
- [ ] Bouton "Délier" est bloqué si pas de password + pas d'autre provider
- [ ] Déconnexion supprime bien les cookies `sb-access-token`, `sb-refresh-token`, `lga_centre_slug`

## 5. Troubleshooting courant

**Google OAuth : "redirect_uri_mismatch"**
→ L'URL exacte de callback Supabase n'est pas ajoutée dans Google Console
(Authorized redirect URIs). Copier depuis le champ affiché par Supabase.

**Google OAuth : "Access blocked: This app's request is invalid"**
→ Consent screen pas configuré complètement ou app pas publiée (mode Testing).
Vérifier Étape C.

**Password : "Invalid login credentials"**
→ Normal si le pro n'a jamais défini de password. Lui demander de se connecter
par magic link puis d'aller sur `/audioprothesiste-pro/compte/` pour le
définir.

**Liaison Google : "identity already linked"**
→ L'email Google est déjà associé à un autre compte Supabase. Le pro doit
utiliser un email Google différent, ou se connecter directement avec Google
puis supprimer l'ancien compte.
