# Specs Phase 1 — Endpoints

**Projet** : LeGuideAuditif.fr — Pipeline Email Revendicateurs
**Fichier** : `specs-phase1-endpoints.md`
**Document parent** : `prd-email-pipeline-revendicateurs.md` v1.1
**Dépend de** : `specs-phase1-data.md` (doit être exécuté avant)
**Version** : v1.0
**Statut** : Prêt pour exécution Claude Code

---

## Vue d'ensemble

Ce document spécifie toutes les modifications et créations d'endpoints pour la Phase 1.

### Endpoints modifiés

| Endpoint | Fichier | Raison |
|---|---|---|
| `POST /api/claim` | `src/pages/api/claim.ts` | Populer `audiopro_lifecycle` + `audiopro_centres` + `email_events` |
| `GET /api/admin/quick-approve` | `src/pages/api/admin/quick-approve.ts` | Transition `revendique → approuve` |
| `GET /api/admin/quick-reject` | `src/pages/api/admin/quick-reject.ts` | Event `claim_rejected` dans lifecycle_events |
| `POST /api/webhook` (Stripe) | `src/pages/api/webhook.ts` | Transition `→ premium` / `→ churned` + email `premium_welcome` |

### Endpoints créés

| Endpoint | Fichier | Rôle |
|---|---|---|
| `POST /api/admin/relance-email` | `src/pages/api/admin/relance-email.ts` | Bouton dropdown — envoi manuel d'un template |
| `POST /api/admin/promote-to-prospect` | `src/pages/api/admin/promote-to-prospect.ts` | Bouton — bascule revendicateur en prospect CRM |

### Pas en Phase 1 (reportés Phase 2)

- `POST /api/cron/email-drip` — cron automatique
- `POST /api/resend-webhook` — réception events Resend
- `GET/POST /api/email-preferences` — page unsubscribe

---

## 1. Modification `POST /api/claim`

**Fichier** : `src/pages/api/claim.ts`
**Action** : ajouter la synchronisation `audiopro_lifecycle` + log `email_events` sans toucher à la logique métier existante.

### 1.1 Contexte

Le fichier actuel (cf. repo, ~270 lignes) effectue :
1. Validation formData
2. Lookup centre
3. Upload photo
4. UPDATE `centres_auditifs` (claim_status=pending, claimed_by_email, etc.)
5. INSERT `claim_attributions`
6. Envoi GA4 (si consent)
7. Génération tokens admin approve/reject
8. Envoi emails `claim-confirmation` (user) + `claim-admin-notification` (admin)

**Ce qu'on ajoute** :
- Entre l'étape 4 (update centre) et 5 (attribution) : UPSERT `audiopro_lifecycle` + lien `audiopro_centres`
- À l'étape 8 (envoi emails) : logger chaque envoi dans `email_events`

### 1.2 Diff précis

**Imports à ajouter** en haut du fichier :

```typescript
import {
  upsertAudioproAtClaim,
  logEmailEvent,
} from '../../lib/audiopro-lifecycle';
```

**Après le bloc `UPDATE centres_auditifs` réussi** (juste avant l'INSERT `claim_attributions`), insérer :

```typescript
    // ─────────────────────────────────────────────────────────────
    // Sync audiopro_lifecycle (Phase 1 email pipeline)
    // Non bloquant : si ça échoue, on log mais on n'échoue pas le claim.
    // ─────────────────────────────────────────────────────────────
    let audiopro_id: string | null = null;
    try {
      const rppsDetected = adeli && /^\d{11}$/.test(adeli.trim()) ? adeli.trim() : null;
      const result = await upsertAudioproAtClaim(supabase, {
        email,
        nom,
        prenom,
        adeli,
        rpps: rppsDetected,
        centre_id: centre.id,
        first_claim_at: new Date().toISOString(),
      });
      audiopro_id = result.audiopro_id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[api/claim] audiopro sync failed:', msg);
      // On continue — la donnée sera rattrapée par le script de migration idempotent
    }
```

**Dans le bloc `Promise.allSettled` des envois emails**, remplacer la structure actuelle par :

```typescript
    // Les envois retournent leur message_id pour traçage
    const [claimConfResult, claimAdminResult] = await Promise.allSettled([
      sendEmail({
        to: email,
        subject: 'Votre demande de revendication a bien été reçue',
        html: claimConfirmationEmail({
          prenom, nom, centreNom: centre.nom, centreSlug,
          siteWeb: siteWeb || null,
          tel: tel || null,
          horaires: horaires || null,
          specialites: cleanSpecialites,
          marques: cleanMarques,
          photo: !!photoUrl,
          aPropos: a_propos || null,
        }),
        replyTo: 'franck@leguideauditif.fr',
      }),
      sendAdminNotification(
        `Nouvelle revendication : ${centre.nom}`,
        claimAdminNotificationEmail({
          prenom, nom, email, adeli,
          centreNom: centre.nom, centreSlug,
          tel: tel || undefined,
          approveUrl,
          rejectUrl,
        }),
      ),
    ]);

    // Log dans email_events (non bloquant)
    try {
      await logEmailEvent(supabase, {
        audiopro_id,
        centre_slug: centreSlug,
        recipient_email: email,
        template_key: 'claim_confirmation',
        resend_message_id:
          claimConfResult.status === 'fulfilled' && claimConfResult.value?.success
            ? (claimConfResult.value as any).messageId ?? null
            : null,
        trigger: 'transactional',
      });
    } catch (e) {
      console.error('[api/claim] email_events log failed:', e);
    }
```

**Note importante** : la fonction `sendEmail` actuelle ne retourne pas le `messageId` de Resend. Il faut **légèrement modifier `src/lib/email.ts`** pour qu'elle le retourne :

### 1.3 Modification de `src/lib/email.ts`

Changer la signature de `sendEmail` pour inclure `messageId` dans le retour.

**Avant** :
```typescript
export async function sendEmail({...}): Promise<{ success: boolean; error?: string }> {
  // ...
  const { error } = await resend.emails.send({...});
  // ...
  return { success: true };
}
```

**Après** :
```typescript
export async function sendEmail({...}): Promise<{
  success: boolean;
  messageId?: string | null;
  error?: string;
}> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}
```

`sendAdminNotification` reste inchangée (pas besoin de messageId pour les mails admin).

### 1.4 Tests de non-régression

Après modification, vérifier :
- [ ] Un claim qui aurait marché avant marche toujours (UX inchangée)
- [ ] Une ligne apparaît dans `audiopro_lifecycle` avec `lifecycle_stage='revendique'`
- [ ] Une ligne apparaît dans `audiopro_centres`
- [ ] Une ligne `email_events` est créée avec `template_key='claim_confirmation'` et `trigger='transactional'`
- [ ] Si le claim échoue (erreur DB), aucune ligne audiopro n'est créée (transactionalité)
- [ ] Un 2e claim du même email pour un autre centre : UNE ligne audiopro (mise à jour), DEUX lignes `audiopro_centres`

---

## 2. Modification `GET /api/admin/quick-approve`

**Fichier** : `src/pages/api/admin/quick-approve.ts`

### 2.1 Contexte

Le endpoint actuel :
1. Valide le token admin (HMAC)
2. UPDATE `centres_auditifs SET claim_status='approved', plan='claimed'`
3. Envoie l'email `claim-approved` au revendicateur
4. Redirige vers `/admin/claims` avec un message de succès

**Ce qu'on ajoute** :
- Après UPDATE centre : transition lifecycle `revendique → approuve` (avec event)
- Logger `email_events` pour l'envoi de `claim_approved`

### 2.2 Diff

**Imports** :

```typescript
import {
  transitionLifecycleStage,
  logEmailEvent,
} from '../../../lib/audiopro-lifecycle';
```

**Après le bloc UPDATE centre réussi**, avant l'envoi de l'email :

```typescript
    // Lookup de l'audiopro lié pour transition lifecycle
    const { data: audiopro } = await supabase
      .from('audiopro_lifecycle')
      .select('id, lifecycle_stage')
      .eq('email', centre.claimed_by_email.toLowerCase())
      .maybeSingle();

    if (audiopro) {
      // Transition : ne rétrograde jamais. Si déjà active/engage/premium, skip.
      const orderedStages = ['revendique','approuve','active','engage','premium','churned'];
      const currentIdx = orderedStages.indexOf(audiopro.lifecycle_stage);
      const approvedIdx = orderedStages.indexOf('approuve');
      if (currentIdx < approvedIdx) {
        await transitionLifecycleStage(
          supabase,
          audiopro.id,
          'approuve',
          'claim_approved',
          { centre_slug: centreSlug, approved_by: 'admin_quick_action' }
        );
      }
    }
```

**Après l'envoi de l'email `claim-approved`**, ajouter le log :

```typescript
    const emailResult = await sendEmail({
      to: centre.claimed_by_email,
      subject: 'Votre fiche est validée',
      html: claimApprovedEmail({
        prenom: centre.claimed_by_name?.split(' ')[0] || '',
        centreNom: centre.nom,
        centreSlug,
        magicLink,  // si généré, sinon undefined
      }),
      replyTo: 'franck@leguideauditif.fr',
    });

    try {
      await logEmailEvent(supabase, {
        audiopro_id: audiopro?.id ?? null,
        centre_slug: centreSlug,
        recipient_email: centre.claimed_by_email,
        template_key: 'claim_approved',
        resend_message_id: emailResult.messageId ?? null,
        trigger: 'transactional',
      });
    } catch (e) {
      console.error('[quick-approve] email_events log failed:', e);
    }
```

---

## 3. Modification `GET /api/admin/quick-reject`

**Fichier** : `src/pages/api/admin/quick-reject.ts`

### 3.1 Contexte

Le rejet ne passe pas le lifecycle à "approuve" — l'audio reste à `revendique`. Mais on trace l'événement dans `audiopro_lifecycle_events` pour l'historique.

### 3.2 Diff

**Import** :
```typescript
import { logEmailEvent } from '../../../lib/audiopro-lifecycle';
```

**Après UPDATE centre reject**, ajouter :

```typescript
    // Log de l'événement de rejet dans audiopro_lifecycle_events
    // (sans changement de stage — l'audio reste à 'revendique')
    const { data: audiopro } = await supabase
      .from('audiopro_lifecycle')
      .select('id, lifecycle_stage')
      .eq('email', centre.claimed_by_email.toLowerCase())
      .maybeSingle();

    if (audiopro) {
      await supabase.from('audiopro_lifecycle_events').insert({
        audiopro_id: audiopro.id,
        from_stage: audiopro.lifecycle_stage,
        to_stage: audiopro.lifecycle_stage,  // pas de transition, juste un event
        reason: 'claim_rejected',
        metadata: { centre_slug: centreSlug },
      });
    }
```

**Si le endpoint envoie un email de rejet** (à vérifier dans le code actuel) : ajouter un `logEmailEvent` avec `template_key='claim_rejected'`.

---

## 4. Modification `POST /api/webhook` (Stripe)

**Fichier** : `src/pages/api/webhook.ts`

### 4.1 Contexte

Le webhook actuel gère 3 events Stripe :
- `checkout.session.completed` — paiement initial → centre premium
- `customer.subscription.deleted` — annulation → centre re-passe à `claimed`
- `invoice.payment_failed` — échec paiement

**Ce qu'on ajoute** :
- Sur `checkout.session.completed` (centres, pas annonces) : transition `* → premium` + email `premium_welcome` + log
- Sur `customer.subscription.deleted` : transition `premium → churned` + log de l'email `subscription_cancelled`

### 4.2 Diff bloc `checkout.session.completed` (partie centres uniquement)

**Imports additionnels** :

```typescript
import {
  transitionLifecycleStage,
  logEmailEvent,
} from '../../lib/audiopro-lifecycle';
import { premiumWelcomeEmail } from '../../emails/premium-welcome';
```

**À la fin du bloc "CENTRES" après `console.log('Centre ${centreSlug} passe en premium.')`** :

```typescript
      // ─── Phase 1 email pipeline ───
      // Transition audiopro → premium + email welcome
      if (email) {
        const { data: audiopro } = await supabase
          .from('audiopro_lifecycle')
          .select('id, prenom, lifecycle_stage')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (audiopro) {
          await transitionLifecycleStage(
            supabase,
            audiopro.id,
            'premium',
            'stripe_paid',
            {
              centre_slug: centreSlug,
              stripe_session_id: session.id,
              stripe_subscription_id: session.subscription,
            }
          );

          // Email premium_welcome
          const welcomeResult = await sendEmail({
            to: email,
            subject: 'Bienvenue dans LeGuideAuditif Premium',
            html: premiumWelcomeEmail({
              prenom: audiopro.prenom ?? '',
              centreNom: centre?.nom ?? centreSlug,
              centreSlug,
            }),
            replyTo: 'franck@leguideauditif.fr',
          });

          await logEmailEvent(supabase, {
            audiopro_id: audiopro.id,
            centre_slug: centreSlug,
            recipient_email: email,
            template_key: 'premium_welcome',
            resend_message_id: welcomeResult.messageId ?? null,
            trigger: 'webhook_stripe',
          });
        }
      }
```

### 4.3 Diff bloc `customer.subscription.deleted`

**Après l'UPDATE centre à `plan='claimed'`**, ajouter :

```typescript
      // ─── Phase 1 email pipeline ───
      // Si TOUS les centres de l'audio sont non-premium après cette annulation
      // → transition audiopro → churned
      if (cancelledCentre?.claimed_by_email) {
        const { data: audiopro } = await supabase
          .from('audiopro_lifecycle')
          .select('id, lifecycle_stage')
          .eq('email', cancelledCentre.claimed_by_email.toLowerCase())
          .maybeSingle();

        if (audiopro && audiopro.lifecycle_stage === 'premium') {
          // Vérifier qu'aucun autre centre lié n'est encore premium
          const { count: stillPremium } = await supabase
            .from('audiopro_centres')
            .select('centre_id, centres_auditifs!inner(plan)', { count: 'exact', head: true })
            .eq('audiopro_id', audiopro.id)
            .eq('centres_auditifs.plan', 'premium');

          if ((stillPremium ?? 0) === 0) {
            await transitionLifecycleStage(
              supabase,
              audiopro.id,
              'churned',
              'stripe_cancelled',
              { stripe_subscription_id: subscription.id, centre_slug: cancelledCentre.slug }
            );
          }
        }
      }
```

**Log de l'email `subscription_cancelled`** déjà envoyé dans le code existant — ajouter le `logEmailEvent` correspondant avec `template_key='subscription_cancelled'` et `trigger='webhook_stripe'`.

---

## 5. Nouveau template `premium_welcome`

**Fichier nouveau** : `src/emails/premium-welcome.ts`

Structure technique uniquement — le copy final devra être généré via le skill `nposts-social-humanizer` avant mise en production.

```typescript
import { emailLayout } from './layout';

interface PremiumWelcomeData {
  prenom: string;
  centreNom: string;
  centreSlug: string;
}

export function premiumWelcomeEmail(data: PremiumWelcomeData): string {
  const { prenom, centreNom, centreSlug } = data;

  // NOTE : ce copy est un placeholder structurel.
  // Le copy final doit être généré via le skill nposts-social-humanizer
  // puis remplacer le contenu entre <!-- BEGIN COPY --> et <!-- END COPY -->.

  return emailLayout(
    'Bienvenue en Premium',
    `
    <!-- BEGIN COPY -->
    <p>Bonjour ${prenom},</p>

    <p>Merci de rejoindre LeGuideAuditif en Premium. Votre centre ${centreNom} passe en visibilité prioritaire dès maintenant.</p>

    <h2>Ce qui change immédiatement</h2>
    <ul>
      <li>Badge « Centre vérifié » affiché sur votre fiche</li>
      <li>Affichage prioritaire dans les résultats de recherche de votre département</li>
      <li>Demandes de devis patient en exclusivité sur votre zone</li>
      <li>Accès aux statistiques de consultation de votre fiche</li>
    </ul>

    <h2>Checklist d'activation</h2>
    <p>Pour tirer parti au maximum de votre fiche Premium dès cette semaine :</p>

    <a href="https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${centreSlug}" class="btn">
      Accéder à mon espace pro
    </a>

    <p>Si vous avez besoin d'un coup de main pour paramétrer votre fiche ou lancer votre première campagne d'acquisition, répondez simplement à ce mail.</p>

    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioprothésiste DE — LeGuideAuditif.fr</p>
    <!-- END COPY -->
    `
  );
}
```

---

## 6. Nouvel endpoint `POST /api/admin/relance-email`

**Fichier nouveau** : `src/pages/api/admin/relance-email.ts`

Déclenché par le bouton dropdown dans `/admin/claims`. Permet à Franck-Olivier de relancer manuellement n'importe quel template pour un audio.

### 6.1 Contrat

**Méthode** : `POST`
**Body JSON** :
```typescript
{
  audiopro_id: string;              // UUID
  template_key: EmailTemplateKey;   // cf. types/audiopro-lifecycle.ts
}
```

**Réponses** :

| Code | Cas |
|---|---|
| 200 | `{ success: true, email_event_id: string }` — mail parti |
| 400 | `{ error: 'audiopro_id et template_key requis' }` |
| 403 | `{ error: 'Accès admin requis' }` — auth manquante |
| 404 | `{ error: 'Audio introuvable' }` |
| 409 | `{ error: 'Audio désabonné' }` — bypass interdit |
| 409 | `{ error: 'Slots Fondateurs épuisés' }` — si template `nurture_02_offre_fondateurs` et `slots_restants=0` |
| 500 | `{ error: 'Erreur envoi email' }` |

**Auth** : réutilise le pattern admin existant (probablement un cookie/header vérifié par `src/lib/admin-token.ts` ou via middleware admin — à aligner avec ce qui existe déjà).

### 6.2 Règles métier

1. **Bypass collision CRM activé** — c'est manuel, Franck décide.
2. **Désabonnement respecté** — ne PAS envoyer si `email_unsubscribed_at IS NOT NULL` (sauf template transactionnel).
3. **Validation template disponible** :
   - `fiche_incomplete_relance` : toujours autorisé
   - `nurture_02_offre_fondateurs` : vérifier `feature_flags.fondateurs_drip_enabled=true` et `slots_restants > 0`
   - `nurture_04_slots_restants` : vérifier `slots_restants > 0`
   - Autres templates nurture/premium_welcome : toujours autorisés (Franck décide)
4. **Log systématique** dans `email_events` avec `trigger='manual_admin'`.
5. **Si l'audio a un `prospect_id`** : créer automatiquement une ligne dans `interactions` (kind='email', content='Email manuel envoyé : {template_key}').

### 6.3 Squelette d'implémentation

```typescript
export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import {
  logEmailEvent,
  getFeatureFlag,
  getSlotsFondateursRestants,
  getAudioproMissingFields,
} from '../../../lib/audiopro-lifecycle';
import { requireAdmin } from '../../../lib/auth';  // à créer/aligner avec existant

// Imports templates
import { ficheIncompleteRelanceEmail } from '../../../emails/fiche-incomplete-relance';
// (ajouter les autres imports au fur et à mesure des templates créés en Phase 2)

const VALID_TEMPLATES = [
  'fiche_incomplete_relance',
  // Les autres seront ajoutés en Phase 2 :
  // 'nurture_01_premiers_patients',
  // 'nurture_02_offre_fondateurs',
  // 'nurture_03_cas_concret',
  // 'nurture_04_slots_restants',
  // 'nurture_05_ads_ou_sortie',
  // 'premium_welcome',
] as const;

export const POST: APIRoute = async ({ request }) => {
  // Auth admin
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) {
    return json({ error: 'Accès admin requis' }, 403);
  }

  // Parse body
  let body: { audiopro_id?: string; template_key?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body JSON invalide' }, 400);
  }

  const { audiopro_id, template_key } = body;
  if (!audiopro_id || !template_key) {
    return json({ error: 'audiopro_id et template_key requis' }, 400);
  }
  if (!VALID_TEMPLATES.includes(template_key as any)) {
    return json({ error: `Template inconnu ou non disponible en Phase 1 : ${template_key}` }, 400);
  }

  const supabase = createServerClient();

  // Lookup audio
  const { data: audiopro } = await supabase
    .from('audiopro_lifecycle')
    .select('*')
    .eq('id', audiopro_id)
    .maybeSingle();

  if (!audiopro) {
    return json({ error: 'Audio introuvable' }, 404);
  }

  if (audiopro.email_unsubscribed_at) {
    return json({ error: 'Audio désabonné — impossible de relancer' }, 409);
  }

  if (audiopro.hard_bounced_at) {
    return json({ error: 'Adresse email en bounce permanent' }, 409);
  }

  // Checks spécifiques template
  if (template_key === 'nurture_02_offre_fondateurs') {
    const enabled = await getFeatureFlag<boolean>(supabase, 'fondateurs_drip_enabled', true);
    const slots = await getSlotsFondateursRestants(supabase);
    if (!enabled || slots === 0) {
      return json({ error: 'Programme Fondateurs fermé ou slots épuisés' }, 409);
    }
  }
  if (template_key === 'nurture_04_slots_restants') {
    const slots = await getSlotsFondateursRestants(supabase);
    if (slots === 0) {
      return json({ error: 'Aucun slot Fondateurs restant' }, 409);
    }
  }

  // Génération HTML selon le template
  let html: string;
  let subject: string;

  switch (template_key) {
    case 'fiche_incomplete_relance': {
      const missingData = await getAudioproMissingFields(supabase, audiopro_id);
      if (missingData.every(m => m.missing_fields.length === 0)) {
        return json({ error: 'Fiches déjà complètes — rien à relancer' }, 409);
      }
      html = ficheIncompleteRelanceEmail({
        prenom: audiopro.prenom ?? '',
        centres: missingData,
      });
      const nbIncomplet = missingData.filter(m => m.missing_fields.length > 0).length;
      subject = nbIncomplet === 1
        ? 'Il manque quelques infos sur votre fiche'
        : `Il manque des infos sur ${nbIncomplet} de vos fiches`;
      break;
    }

    // Les autres cases seront ajoutés en Phase 2
    default:
      return json({ error: 'Template non implémenté en Phase 1' }, 400);
  }

  // Envoi
  const emailResult = await sendEmail({
    to: audiopro.email,
    subject,
    html,
    replyTo: 'franck@leguideauditif.fr',
  });

  if (!emailResult.success) {
    return json({ error: `Erreur envoi email : ${emailResult.error}` }, 500);
  }

  // Log email_events
  await logEmailEvent(supabase, {
    audiopro_id: audiopro.id,
    centre_slug: null,  // mail global à l'audio, pas scoped centre
    recipient_email: audiopro.email,
    template_key: template_key as any,
    resend_message_id: emailResult.messageId ?? null,
    trigger: 'manual_admin',
  });

  // Si l'audio est lié à un prospect, ajouter une interaction
  if (audiopro.prospect_id) {
    await supabase.from('interactions').insert({
      prospect_id: audiopro.prospect_id,
      kind: 'email',
      content: `Email manuel envoyé : ${template_key}`,
      occurred_at: new Date().toISOString(),
    });
  }

  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 6.4 Template `fiche_incomplete_relance` (nouveau)

**Fichier nouveau** : `src/emails/fiche-incomplete-relance.ts`

```typescript
import { emailLayout } from './layout';
import {
  type AudioproMissingField,
  COMPLETENESS_FIELD_LABELS,
} from '../types/audiopro-lifecycle';

interface FicheIncompleteRelanceData {
  prenom: string;
  centres: AudioproMissingField[];
}

export function ficheIncompleteRelanceEmail(data: FicheIncompleteRelanceData): string {
  const { prenom, centres } = data;

  // Centres incomplets uniquement
  const incomplete = centres.filter(c => c.missing_fields.length > 0);
  const complete   = centres.filter(c => c.missing_fields.length === 0);

  // Cible de l'ancrage : le centre le moins complet
  const targetCentre = incomplete[0];
  const editUrl = `https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${targetCentre.centre_slug}`;

  // Bloc par centre
  const centresBlock = incomplete.map(c => `
    <div class="info-box">
      <p style="margin:0 0 4px 0;"><strong>${c.centre_nom}</strong> — ${c.completeness_pct}% complet</p>
      <p style="margin:0;" class="text-muted">
        Il manque :
        ${c.missing_fields.map(f => COMPLETENESS_FIELD_LABELS[f]).join(', ')}
      </p>
    </div>
  `).join('');

  const completeBlock = complete.length > 0
    ? `<p class="text-muted">${complete.length} de vos fiches sont déjà complètes ✓</p>`
    : '';

  // NOTE : copy à humaniser via nposts-social-humanizer avant mise en prod.
  return emailLayout(
    'Votre fiche mérite quelques minutes',
    `
    <!-- BEGIN COPY -->
    <p>Bonjour ${prenom},</p>

    <p>Votre fiche est visible sur LeGuideAuditif, mais il manque encore quelques infos pour que les patients aient une vue complète de votre centre.</p>

    <h2>État de vos fiches</h2>
    ${centresBlock}
    ${completeBlock}

    <p>D'expérience, les fiches complètes reçoivent en moyenne 3 fois plus de demandes de contact patient que les fiches partielles. Quelques minutes suffisent pour combler les champs manquants.</p>

    <a href="${editUrl}" class="btn">Compléter ${incomplete.length === 1 ? 'ma fiche' : 'mes fiches'}</a>

    <p>Si vous avez besoin d'un coup de main, répondez directement à ce mail.</p>

    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioprothésiste DE — LeGuideAuditif.fr</p>
    <!-- END COPY -->
    `
  );
}
```

---

## 7. Nouvel endpoint `POST /api/admin/promote-to-prospect`

**Fichier nouveau** : `src/pages/api/admin/promote-to-prospect.ts`

Bascule un revendicateur du pipeline automatique vers le CRM commercial. Crée une ligne `prospects` pré-remplie avec les données de l'audiopro, puis pose `audiopro_lifecycle.prospect_id`.

### 7.1 Contrat

**Méthode** : `POST`
**Body JSON** :
```typescript
{
  audiopro_id: string;
  initial_status?: 'prospect' | 'contacte';  // défaut: 'contacte'
  notes?: string;                             // notes initiales
}
```

**Réponses** :

| Code | Cas |
|---|---|
| 200 | `{ success: true, prospect_id: string }` |
| 400 | `{ error: 'audiopro_id requis' }` |
| 403 | `{ error: 'Accès admin requis' }` |
| 404 | `{ error: 'Audio introuvable' }` |
| 409 | `{ error: 'Audio déjà lié à un prospect' }` (rajouter `prospect_id` existant dans payload) |

### 7.2 Règles métier

1. Si `audiopro.prospect_id IS NOT NULL` → 409 avec l'id existant (pas d'écrasement)
2. Créer une ligne `prospects` avec :
   - `name = prenom + ' ' + nom` (fallback email si noms vides)
   - `emails = [audiopro.email]`
   - `source = 'entrant'`
   - `status = initial_status ?? 'contacte'`
   - `is_fondateur = false` (par défaut — Franck peut l'éditer ensuite)
   - `notes = notes ?? null`
3. Peupler `prospects.centres_count` = `COUNT(audiopro_centres)`
4. Pour chaque centre lié, créer une ligne `prospect_centres` (table existante)
5. UPDATE `audiopro_lifecycle SET prospect_id = [nouveau prospect.id]`
6. Event `audiopro_lifecycle_events` : `reason='promoted_to_prospect'`

### 7.3 Squelette

```typescript
export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck.ok) return json({ error: 'Accès admin requis' }, 403);

  let body: {
    audiopro_id?: string;
    initial_status?: 'prospect' | 'contacte';
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body JSON invalide' }, 400);
  }

  const { audiopro_id } = body;
  const initial_status = body.initial_status ?? 'contacte';
  const notes = body.notes ?? null;

  if (!audiopro_id) return json({ error: 'audiopro_id requis' }, 400);

  const supabase = createServerClient();

  // Lookup audio
  const { data: audiopro } = await supabase
    .from('audiopro_lifecycle')
    .select('*')
    .eq('id', audiopro_id)
    .maybeSingle();

  if (!audiopro) return json({ error: 'Audio introuvable' }, 404);

  if (audiopro.prospect_id) {
    return json({
      error: 'Audio déjà lié à un prospect',
      prospect_id: audiopro.prospect_id,
    }, 409);
  }

  // Liste des centres liés
  const { data: centres } = await supabase
    .from('audiopro_centres')
    .select('centre_id')
    .eq('audiopro_id', audiopro_id);

  const nbCentres = centres?.length ?? 0;
  const fullName = [audiopro.prenom, audiopro.nom]
    .filter(Boolean).join(' ').trim() || audiopro.email;

  // Créer prospect
  const { data: newProspect, error: insertErr } = await supabase
    .from('prospects')
    .insert({
      name: fullName,
      emails: [audiopro.email],
      source: 'entrant',
      status: initial_status,
      centres_count: nbCentres,
      notes,
    })
    .select('id')
    .single();

  if (insertErr || !newProspect) {
    return json({ error: `Erreur création prospect : ${insertErr?.message}` }, 500);
  }

  // Lier les centres au prospect
  if (centres && centres.length > 0) {
    const centreLinks = centres.map((c, idx) => ({
      prospect_id: newProspect.id,
      centre_id: c.centre_id,
      is_primary: idx === 0,
      linked_via: 'auto_claim' as const,
    }));
    await supabase.from('prospect_centres').insert(centreLinks);
  }

  // Update audiopro_lifecycle.prospect_id
  await supabase
    .from('audiopro_lifecycle')
    .update({ prospect_id: newProspect.id })
    .eq('id', audiopro_id);

  // Event
  await supabase.from('audiopro_lifecycle_events').insert({
    audiopro_id,
    from_stage: audiopro.lifecycle_stage,
    to_stage: audiopro.lifecycle_stage,  // pas de transition stage
    reason: 'promoted_to_prospect',
    metadata: { prospect_id: newProspect.id, initial_status, nb_centres: nbCentres },
  });

  return json({ success: true, prospect_id: newProspect.id }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 8. Helper admin auth (vérification de ce qui existe)

**Important pour Claude Code** : avant d'implémenter les endpoints admin, vérifier dans le repo comment l'authentification admin est actuellement gérée :

- `src/lib/auth.ts`
- `src/lib/admin-token.ts`
- `src/middleware.ts`
- Les autres endpoints `/api/admin/*` existants (ex: `/api/admin/quick-approve`)

S'il existe déjà un helper `requireAdmin(request)` ou équivalent (middleware qui set un header, cookie session, etc.) → **le réutiliser à l'identique**.

S'il n'existe pas → créer un helper dans `src/lib/auth.ts` aligné avec le pattern des autres endpoints admin.

---

## 9. Tests de non-régression

### 9.1 Tests manuels après déploiement Phase 1

**Scénario A — Nouveau claim** :
1. Remplir le formulaire `/revendiquer` avec un email jamais vu
2. Vérifier : ligne créée dans `audiopro_lifecycle` (stage=revendique)
3. Vérifier : ligne dans `audiopro_centres`
4. Vérifier : ligne dans `audiopro_lifecycle_events` (reason=claim_submitted)
5. Vérifier : ligne dans `email_events` (template=claim_confirmation, trigger=transactional)
6. Vérifier : email reçu dans la boîte

**Scénario B — Claim d'un email déjà connu pour un autre centre** :
1. Avec le même email que scénario A, revendiquer un autre centre
2. Vérifier : PAS de nouvelle ligne `audiopro_lifecycle` (upsert)
3. Vérifier : 2 lignes dans `audiopro_centres` (2 centres liés)
4. Vérifier : ligne claim_confirmation dans `email_events`

**Scénario C — Approbation admin** :
1. Cliquer sur le lien one-click "Approuver" dans l'email admin
2. Vérifier : `audiopro_lifecycle.lifecycle_stage='approuve'`
3. Vérifier : event `claim_approved` dans lifecycle_events
4. Vérifier : email `claim_approved` reçu + loggé dans email_events

**Scénario D — Relance manuelle complétude** :
1. Depuis `/admin/claims`, cliquer bouton "Relancer" → dropdown → "Complétude"
2. Confirmer dans la modale
3. Vérifier : email reçu par l'audio, avec liste précise des champs manquants par centre
4. Vérifier : ligne email_events (trigger=manual_admin)
5. Si l'audio a un prospect lié : vérifier interaction créée

**Scénario E — Promotion en prospect** :
1. Depuis fiche audio dans `/admin/claims`, cliquer "Promouvoir en prospect"
2. Vérifier : ligne créée dans `prospects` (status=contacte par défaut)
3. Vérifier : `audiopro_lifecycle.prospect_id` peuplé
4. Vérifier : lignes `prospect_centres` créées pour chaque centre de l'audio
5. Vérifier : redirection vers `/admin/prospects/[id]`

**Scénario F — Paiement Stripe** :
1. Effectuer un vrai paiement test (ou replay webhook Stripe avec CLI)
2. Vérifier : `centres_auditifs.plan='premium'`
3. Vérifier : `audiopro_lifecycle.lifecycle_stage='premium'`
4. Vérifier : event `stripe_paid` dans lifecycle_events
5. Vérifier : email `premium_welcome` envoyé + loggé

### 9.2 Tests unitaires recommandés

**Pour `src/lib/audiopro-lifecycle.ts`** — tests avec Supabase mock ou base de test :

- `upsertAudioproAtClaim()` — cas "nouvel audio" et "audio existant"
- `transitionLifecycleStage()` — cas idempotent (stage déjà à la cible)
- `logEmailEvent()` — insertion basique
- `getSlotsFondateursRestants()` — calcul correct avec différents états de `prospects`

### 9.3 Tests E2E Playwright (optionnel Phase 1, recommandé avant Phase 2)

Ajouter à `tests/e2e/claim-flow.spec.ts` :
- `claim submits + email_events row created`
- `admin approve + audiopro_lifecycle transitions to approuve`

---

## 10. Checklist d'exécution Claude Code

**Ordre recommandé** :

1. [ ] **Pré-requis** : vérifier que les specs `specs-phase1-data.md` ont été exécutées (tables + fonctions + types TS + lib présents)
2. [ ] Modifier `src/lib/email.ts` pour retourner `messageId` (cf. §1.3)
3. [ ] Créer `src/emails/premium-welcome.ts` (§5)
4. [ ] Créer `src/emails/fiche-incomplete-relance.ts` (§6.4)
5. [ ] Vérifier / créer helper `requireAdmin` dans `src/lib/auth.ts` (§8)
6. [ ] Modifier `src/pages/api/claim.ts` (§1)
7. [ ] Modifier `src/pages/api/admin/quick-approve.ts` (§2)
8. [ ] Modifier `src/pages/api/admin/quick-reject.ts` (§3)
9. [ ] Modifier `src/pages/api/webhook.ts` (§4)
10. [ ] Créer `src/pages/api/admin/relance-email.ts` (§6)
11. [ ] Créer `src/pages/api/admin/promote-to-prospect.ts` (§7)
12. [ ] Lancer tests manuels §9.1 (au moins scénarios A, B, C)
13. [ ] Commit unique : `feat(api): audiopro lifecycle sync + endpoints relance et promotion`

---

**Fin des specs Phase 1 — Endpoints.**
