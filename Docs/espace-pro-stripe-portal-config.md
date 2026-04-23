# Stripe Customer Portal — Configuration

Ce document décrit la configuration Stripe nécessaire pour que le bouton
"Gérer mon abonnement" sur `/audioprothesiste-pro/abonnement/` fonctionne
en production.

## 1. Activer le Customer Portal

1. Aller sur https://dashboard.stripe.com/settings/billing/portal
2. Cliquer **Activate** si pas déjà fait

## 2. Configuration recommandée

### Branding
- **Business name** : `LeGuideAuditif`
- **Logo** : `/public/logo-leguideauditif.png` (fond transparent recommandé)
- **Primary color** : `#D97B3D` (orange LGA)
- **Support email** : `franckolivier@leguideauditif.fr`
- **Privacy policy URL** : `https://leguideauditif.fr/politique-confidentialite/`
- **Terms of service URL** : `https://leguideauditif.fr/mentions-legales/`

### Customer information
- [x] Allow customers to update their email address
- [x] Allow customers to update their billing address
- [ ] Allow customers to update their shipping address (inutile, SaaS)
- [ ] Allow customers to update their name and phone

### Invoice history
- [x] Show invoice history

### Payment methods
- [x] Allow customers to update their payment methods

### Cancellation
- [x] Allow customers to cancel subscriptions
- **Cancellation mode** : `Cancel at end of billing period`
  (garder l'accès jusqu'à la fin du mois payé, éviter les remboursements)
- **Cancellation reason** : optionnelle (mais utile en analytics pour comprendre le churn)
- **Retention offer** (optionnel) : offrir 1 mois gratuit ou remise pour éviter la résiliation

### Subscriptions — mise à jour
- [ ] Allow customers to switch plans (désactivé tant qu'on n'a qu'une formule mensuel / annuel)
- Si tu veux permettre la bascule mensuel ↔ annuel depuis le portal :
  - [x] Allow customers to switch plans
  - Products : ajouter les 2 produits Stripe (mensuel 39 €, annuel 390 €)
  - Proration : `Automatic`

### Business information
- **Headline** : "Gérez votre abonnement LeGuideAuditif"
- **Privacy statement** : "Vos données sont traitées conformément au RGPD et à notre politique de confidentialité."

### Return URL
- L'URL de retour est passée dynamiquement par l'API
  (`/api/audiopro/stripe-portal.ts` → `return_url: ${origin}/audioprothesiste-pro/abonnement/`).
  Pas de config à faire ici côté portal.

## 3. Mode Test vs Live

Le portal Stripe a **2 configurations séparées** (test et live). Penser à :
1. Configurer d'abord en mode **Test** (toggle en haut à gauche du dashboard)
2. Valider avec une subscription test (carte 4242)
3. Reproduire la config en mode **Live** quand prêt
4. Dans `.env` / Vercel, la variable `STRIPE_SECRET_KEY` détermine quel mode
   est utilisé côté API. Le portal charge la config correspondante automatiquement.

## 4. Vérification

1. Se connecter à `/audioprothesiste-pro/` avec un pro qui a au moins **1 fiche Premium**
2. Aller sur `/audioprothesiste-pro/abonnement/`
3. Cliquer **Gérer mon abonnement** sur une fiche Premium
4. Redirection vers Stripe portal
5. Tester : mettre à jour la carte, annuler, renouveler
6. Cliquer le bouton "Retour" → retour sur `/audioprothesiste-pro/abonnement/`

## 5. Troubleshooting

**"No configuration provided and your test mode default configuration has not been created"**
→ Le portal n'est pas activé en mode test. Activer sur
https://dashboard.stripe.com/test/settings/billing/portal

**"Customer has no active subscription"**
→ `stripe_customer_id` est présent mais la subscription a été supprimée.
Mettre à jour `centres_auditifs.plan` = 'claimed' via le webhook
`customer.subscription.deleted`.

**Le bouton "Gérer mon abonnement" renvoie "Ce centre n'a pas d'abonnement Premium actif"**
→ `centres_auditifs.stripe_customer_id` est NULL. Vérifier que le webhook
`checkout.session.completed` écrit bien cette colonne lors d'un nouvel achat.
