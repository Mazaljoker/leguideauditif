# Brief Claude Code — Campagne email Fondateur S17

**Objectif** : envoyer 5 emails de relance Partenaire Fondateur depuis Resend, aux revendicateurs LGA appelés la semaine dernière sans conversion ferme.

**Stack** : Node.js, Resend SDK (déjà installé), `.env` déjà configuré avec `RESEND_API_KEY`.

**Principe éditorial** : les emails annoncent les 2 niveaux (fiche gratuite déjà en ligne / offre Fondateur pour les 20 premiers) **sans donner les chiffres tarifaires**. Les montants restent pour la visio — c'est ce qui légitime l'existence du call.

---

## 1. Pré-requis (à vérifier AVANT tout envoi)

- [ ] Domaine `leguideauditif.fr` vérifié dans Resend (SPF + DKIM + MX corrects)
- [ ] `.env.local` contient `RESEND_API_KEY=re_xxx`
- [ ] Adresse d'expéditeur validée : `franckolivier@leguideauditif.fr`
- [ ] Test d'envoi réussi sur ton propre mail (voir §5.1)
- [ ] Les 2 emails manquants (Julie + Gaëlle) récupérés (voir §3.4 et §3.5)

---

## 2. Destinataires — état des emails

| # | Prospect | Email | Statut |
|---|---|---|---|
| 1 | Noam Amsellem | `contact@monaudioconcept.com` | ✅ Générique centre (risque : le message peut ne pas atterrir sur Noam perso) |
| 2 | Nathan Marciano | `audiosphere-houilles@hotmail.com` | ✅ Générique centre (risque idem) |
| 3 | Avy Knafo | `a.knafo@sonance-audition.fr` | ✅ Nominatif parfait |
| 4 | Julie Alexis | **MANQUANT** | ❌ À récupérer (voir §3.4) |
| 5 | Gaëlle Nezonde | **MANQUANT** | ❌ À récupérer (voir §3.5) |

**Notes :**
- Les 2 emails génériques (Noam, Nathan) peuvent être filtrés par l'assistante ou lus par l'équipe. Le ton des emails est compatible avec ça (pas confidentiel).
- Si un email bounce, ne pas réessayer — logger dans Notion et passer au contact alternatif (LinkedIn, WhatsApp).

---

## 3. Les 5 emails à envoyer

### 3.1 — Noam Amsellem

**Destinataire** : `contact@monaudioconcept.com`
**Ville** : Villeurbanne (69100) — **pas Paris**
**Centre** : Mon Audio Concept

**Objet** :
```
Noam — pardon pour la confusion la semaine dernière
```

**Corps (plain text)** :
```
Salut Noam,

Franck-Olivier Chabbat, du Guide Auditif. Je suis un confrère audio DE (28 ans d'exercice). J'ai tenté de te joindre deux fois la semaine dernière — deux fois je suis tombé au standard d'Audiosphère à Houilles en pensant que c'était chez toi à Villeurbanne. C'était en fait Nathan Marciano. Pardon pour le mix-up, ta collègue a dû me trouver un peu léger.

Tu as revendiqué ta fiche Mon Audio Concept sur leguideauditif.fr le 14/04 — merci d'avoir pris ce temps. Elle est déjà en ligne, visible par les patients qui cherchent un audio à Villeurbanne. C'est la version gratuite, et elle reste gratuite pour toujours.

J'ai remarqué qu'il manque encore une photo sur ta fiche — petit détail mais important pour le référencement local. À ajouter quand tu as 2 minutes.

À côté, j'ai monté une offre spécifique — le Partenaire Fondateur — réservée aux 20 premiers audios DE indépendants qui s'inscrivent. Il reste 19 places. Ton profil colle à ce que je cible.

Les conditions, je préfère te les expliquer en direct — 15 min en visio, je te montre la fiche premium en partage d'écran, tu juges.

Tu me donnes un créneau cette semaine ? Ou réponds juste "oui" / "non" à ce mail.

Confraternellement,
Franck-Olivier
```

---

### 3.2 — Nathan Marciano

**Destinataire** : `audiosphere-houilles@hotmail.com`
**Ville** : Houilles (78800)
**Centre** : Audiosphère Houilles
**⚠ Timing** : à envoyer **jeudi 24/04 matin**, 24h avant le rappel téléphonique verrouillé vendredi 25/04 à 11h15 pile

**Objet** :
```
Nathan — rappel vendredi 11h15 confirmé, + une info en avance
```

**Corps** :
```
Salut Nathan,

Franck-Olivier Chabbat. Je confirme notre rappel vendredi 25/04 à 11h15 pile — ta collègue a été très claire sur le créneau (avec raison, pardon pour les deux tentatives foireuses de la semaine dernière où je t'ai confondu avec Noam Amsellem).

Pour que tu arrives préparé vendredi, voilà ce qu'on va se dire :

Ta fiche Audiosphère est déjà en ligne sur leguideauditif.fr, dans sa version gratuite. À côté, j'ai réservé 20 places à des audios DE indépendants pour une offre spécifique — le Partenaire Fondateur. Il en reste 19.

Je te détaille les conditions au call, avec les chiffres précis pour ton centre. Pas besoin de répondre à ce mail — garde juste le créneau 11h15 vendredi.

À vendredi,
Franck-Olivier
```

---

### 3.3 — Avy Knafo

**Destinataire** : `a.knafo@sonance-audition.fr`
**Ville** : Paris 17e (75017)
**Centre** : Sonance Audition Paris Batignolles
**⚠ Timing** : à envoyer **mardi 21/04 matin** — rappel promis vendredi dernier non honoré, plus tu laisses traîner plus ça s'empire

**Objet** :
```
Avy — pardon pour vendredi, on se cale quand ?
```

**Corps** :
```
Salut Avy,

Franck-Olivier Chabbat, audio DE (28 ans). Je t'ai promis un rappel vendredi dernier, je ne l'ai pas fait. Pas d'excuse, juste les faits — j'ai laissé filer. Pardon.

Je t'écris parce que ta fiche Batignolles est revendiquée sur leguideauditif.fr depuis le 14/04. Elle est déjà en ligne, gratuite. J'ai remarqué qu'il manque encore une photo — c'est le blocage principal pour ressortir sur "audioprothésiste Paris 17e". À ajouter quand tu as un moment.

Et je ne veux pas que tu passes à côté du Partenaire Fondateur par ma faute : c'est une offre que j'ai réservée aux 20 premiers audios DE indépendants qui s'inscrivent, il reste 19 places.

Les conditions, je préfère te les expliquer en direct — en 15 min, je te montre la fiche premium en partage d'écran, tu juges. Trois créneaux possibles cette semaine :

— Mercredi 23/04 après 16h
— Jeudi 24/04 10h–12h
— Vendredi 25/04 9h–10h

Tu choisis. Ou tu m'appelles direct au 04 65 84 77 71, plus rapide.

Confraternellement,
Franck-Olivier
```

---

### 3.4 — Julie Alexis

**Destinataire** : ❌ **EMAIL À RÉCUPÉRER**
**Ville** : Joué-lès-Tours (47300)
**Centre** : Audition Passion
**⚠ Angle refondu** : elle a manifesté un **retour positif** via son assistante vendredi dernier (*« ça regroupe beaucoup de choses, tout au même endroit »*). Ce n'est pas une silencieuse — capitaliser sur son intérêt déjà exprimé.

**Procédure pour récupérer l'email** :
1. Chercher sur le site audiopassion.fr (ou équivalent) — formulaire de contact / mentions légales
2. Si absent, appeler le centre au `05 24 32 17 41` et demander l'adresse email de Julie à son assistante
3. Si toujours rien, passer par LinkedIn (InMail)
4. **Sinon** : contourner l'email et envoyer le même contenu en LinkedIn DM

**Objet** :
```
Julie — ravi du retour positif via ton assistante
```

**Corps** :
```
Salut Julie,

Franck-Olivier Chabbat, audio DE (28 ans), comme toi. Ton assistante m'a fait part de ton retour très positif sur leguideauditif.fr vendredi — elle m'a rapporté « ça regroupe beaucoup de choses, tout au même endroit ». Merci pour ça, ça fait plaisir à entendre d'une consœur.

Ta fiche Audition Passion est déjà en ligne, gratuite, et elle le restera. Elle est construite pour apparaître quand un patient de Joué-lès-Tours cherche un audio sur Google, avec mon nom DE associé qui pondère l'autorité YMYL santé.

À côté de la fiche gratuite, j'ai monté une offre spécifique pour les 20 premiers audios DE indépendants qui s'inscrivent — le Partenaire Fondateur. Il reste 19 places, et ton profil y colle.

Les conditions, je préfère te les expliquer en direct — 15 min en visio, je te montre la fiche premium en partage d'écran, tu juges par toi-même.

Tu me donnes un créneau cette semaine ? Ou appelle-moi direct si plus simple : 04 65 84 77 71.

À bientôt,
Franck-Olivier
```

---

### 3.5 — Gaëlle Nezonde Hollart

**Destinataire** : ❌ **EMAIL À RÉCUPÉRER**
**Ville** : Mantes-la-Jolie (78200)
**Centre** : IDF Audition
**⚠ Timing** : à envoyer **ce soir lundi 20/04** ou **demain mardi 21/04 matin avant 9h** — Gaëlle rentre mardi 21/04 et tu dois la rappeler dans la journée.
**⚠ Angle spécifique** : détail concret sur sa photo (reflet "Idéal Audition" visible) = hook légitime pour le call + son positionnement face à un gros concurrent rend le Fondateur particulièrement pertinent.

**Procédure pour récupérer l'email** :
1. Chercher sur le site idf-audition.fr ou mentions légales
2. Appeler le `01 30 42 24 13` et demander l'email à l'assistante (elle était réceptive vendredi dernier)
3. **Fallback** : si pas joignable avant demain matin, envoyer le contenu en DM LinkedIn au lieu de l'email

**Objet** :
```
Gaëlle — rappel demain, + un détail pour IDF Audition
```

**Corps** :
```
Salut Gaëlle,

Franck-Olivier Chabbat, audio DE (28 ans), fondateur du Guide Auditif. Ton assistante m'a dit que tu rentres au bureau demain — je te rappelle dans la journée.

Avant qu'on se parle, deux choses utiles :

1. Ta fiche IDF Audition est déjà en ligne sur leguideauditif.fr, gratuite. Tu peux aller la voir. J'ai noté un petit détail sur la photo que je te signalerai demain, rien de grave.

2. J'ai monté une offre Partenaire Fondateur réservée aux 20 premiers audios DE indépendants qui s'inscrivent. Il reste 19 places, et vu ton positionnement à Mantes-la-Jolie, ça pourrait t'intéresser plus que tout autre confrère. On en parle demain.

Si tu préfères un créneau précis dans la journée, réponds-moi ici et je m'adapte.

À demain,
Franck-Olivier
```

---

## 4. Script TypeScript à créer

**Chemin** : `scripts/send-founder-campaign.ts`

```typescript
/**
 * Campagne Partenaire Fondateur — Semaine 17
 * Usage: npx tsx scripts/send-founder-campaign.ts --prospect=<key> [--dry-run]
 *
 * Keys valides: noam, nathan, avy, julie, gaelle, test
 *
 * --dry-run : affiche l'email sans l'envoyer (mais teste la connexion Resend)
 */

import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

type Prospect = {
  notionId: string;
  email: string;
  subject: string;
  body: string;
};

const FROM = 'Franck-Olivier Chabbat <franckolivier@leguideauditif.fr>';
const REPLY_TO = 'franckolivier@leguideauditif.fr';

const PROSPECTS: Record<string, Prospect> = {
  test: {
    notionId: 'self-test',
    email: 'franckolivier@leguideauditif.fr',
    subject: '[TEST] Campagne Fondateur — vérification envoi',
    body: 'Test de rendu Resend.\n\nSi tu lis ceci, le setup fonctionne.\n\n— FO',
  },

  noam: {
    notionId: '343e246ef8468142bd06e49027d9592d',
    email: 'contact@monaudioconcept.com',
    subject: 'Noam — pardon pour la confusion la semaine dernière',
    body: `Salut Noam,

Franck-Olivier Chabbat, du Guide Auditif. Je suis un confrère audio DE (28 ans d'exercice). J'ai tenté de te joindre deux fois la semaine dernière — deux fois je suis tombé au standard d'Audiosphère à Houilles en pensant que c'était chez toi à Villeurbanne. C'était en fait Nathan Marciano. Pardon pour le mix-up, ta collègue a dû me trouver un peu léger.

Tu as revendiqué ta fiche Mon Audio Concept sur leguideauditif.fr le 14/04 — merci d'avoir pris ce temps. Elle est déjà en ligne, visible par les patients qui cherchent un audio à Villeurbanne. C'est la version gratuite, et elle reste gratuite pour toujours.

J'ai remarqué qu'il manque encore une photo sur ta fiche — petit détail mais important pour le référencement local. À ajouter quand tu as 2 minutes.

À côté, j'ai monté une offre spécifique — le Partenaire Fondateur — réservée aux 20 premiers audios DE indépendants qui s'inscrivent. Il reste 19 places. Ton profil colle à ce que je cible.

Les conditions, je préfère te les expliquer en direct — 15 min en visio, je te montre la fiche premium en partage d'écran, tu juges.

Tu me donnes un créneau cette semaine ? Ou réponds juste "oui" / "non" à ce mail.

Confraternellement,
Franck-Olivier`,
  },

  nathan: {
    notionId: '342e246ef84681f3ae79f39f4cfcbfd5',
    email: 'audiosphere-houilles@hotmail.com',
    subject: 'Nathan — rappel vendredi 11h15 confirmé, + une info en avance',
    body: `Salut Nathan,

Franck-Olivier Chabbat. Je confirme notre rappel vendredi 25/04 à 11h15 pile — ta collègue a été très claire sur le créneau (avec raison, pardon pour les deux tentatives foireuses de la semaine dernière où je t'ai confondu avec Noam Amsellem).

Pour que tu arrives préparé vendredi, voilà ce qu'on va se dire :

Ta fiche Audiosphère est déjà en ligne sur leguideauditif.fr, dans sa version gratuite. À côté, j'ai réservé 20 places à des audios DE indépendants pour une offre spécifique — le Partenaire Fondateur. Il en reste 19.

Je te détaille les conditions au call, avec les chiffres précis pour ton centre. Pas besoin de répondre à ce mail — garde juste le créneau 11h15 vendredi.

À vendredi,
Franck-Olivier`,
  },

  avy: {
    notionId: '342e246ef8468129abc7edb5e4df3c09',
    email: 'a.knafo@sonance-audition.fr',
    subject: 'Avy — pardon pour vendredi, on se cale quand ?',
    body: `Salut Avy,

Franck-Olivier Chabbat, audio DE (28 ans). Je t'ai promis un rappel vendredi dernier, je ne l'ai pas fait. Pas d'excuse, juste les faits — j'ai laissé filer. Pardon.

Je t'écris parce que ta fiche Batignolles est revendiquée sur leguideauditif.fr depuis le 14/04. Elle est déjà en ligne, gratuite. J'ai remarqué qu'il manque encore une photo — c'est le blocage principal pour ressortir sur "audioprothésiste Paris 17e". À ajouter quand tu as un moment.

Et je ne veux pas que tu passes à côté du Partenaire Fondateur par ma faute : c'est une offre que j'ai réservée aux 20 premiers audios DE indépendants qui s'inscrivent, il reste 19 places.

Les conditions, je préfère te les expliquer en direct — en 15 min, je te montre la fiche premium en partage d'écran, tu juges. Trois créneaux possibles cette semaine :

— Mercredi 23/04 après 16h
— Jeudi 24/04 10h–12h
— Vendredi 25/04 9h–10h

Tu choisis. Ou tu m'appelles direct au 04 65 84 77 71, plus rapide.

Confraternellement,
Franck-Olivier`,
  },

  julie: {
    notionId: '341e246ef846817596fbfbea8aa108d4',
    email: 'TODO_RECUPERER_EMAIL_JULIE',
    subject: 'Julie — ravi du retour positif via ton assistante',
    body: `Salut Julie,

Franck-Olivier Chabbat, audio DE (28 ans), comme toi. Ton assistante m'a fait part de ton retour très positif sur leguideauditif.fr vendredi — elle m'a rapporté « ça regroupe beaucoup de choses, tout au même endroit ». Merci pour ça, ça fait plaisir à entendre d'une consœur.

Ta fiche Audition Passion est déjà en ligne, gratuite, et elle le restera. Elle est construite pour apparaître quand un patient de Joué-lès-Tours cherche un audio sur Google, avec mon nom DE associé qui pondère l'autorité YMYL santé.

À côté de la fiche gratuite, j'ai monté une offre spécifique pour les 20 premiers audios DE indépendants qui s'inscrivent — le Partenaire Fondateur. Il reste 19 places, et ton profil y colle.

Les conditions, je préfère te les expliquer en direct — 15 min en visio, je te montre la fiche premium en partage d'écran, tu juges par toi-même.

Tu me donnes un créneau cette semaine ? Ou appelle-moi direct si plus simple : 04 65 84 77 71.

À bientôt,
Franck-Olivier`,
  },

  gaelle: {
    notionId: '341e246ef84681cbbdb3fc9d9e6e3494',
    email: 'TODO_RECUPERER_EMAIL_GAELLE',
    subject: 'Gaëlle — rappel demain, + un détail pour IDF Audition',
    body: `Salut Gaëlle,

Franck-Olivier Chabbat, audio DE (28 ans), fondateur du Guide Auditif. Ton assistante m'a dit que tu rentres au bureau demain — je te rappelle dans la journée.

Avant qu'on se parle, deux choses utiles :

1. Ta fiche IDF Audition est déjà en ligne sur leguideauditif.fr, gratuite. Tu peux aller la voir. J'ai noté un petit détail sur la photo que je te signalerai demain, rien de grave.

2. J'ai monté une offre Partenaire Fondateur réservée aux 20 premiers audios DE indépendants qui s'inscrivent. Il reste 19 places, et vu ton positionnement à Mantes-la-Jolie, ça pourrait t'intéresser plus que tout autre confrère. On en parle demain.

Si tu préfères un créneau précis dans la journée, réponds-moi ici et je m'adapte.

À demain,
Franck-Olivier`,
  },
};

async function send(key: string, dryRun: boolean) {
  const p = PROSPECTS[key];
  if (!p) {
    console.error(`❌ Prospect "${key}" inconnu. Clés valides: ${Object.keys(PROSPECTS).join(', ')}`);
    process.exit(1);
  }

  if (p.email.startsWith('TODO_')) {
    console.error(`❌ Email manquant pour ${key}. Mets à jour scripts/send-founder-campaign.ts avant l'envoi.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n' + '='.repeat(60));
    console.log(`DRY RUN — ${key.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`From:    ${FROM}`);
    console.log(`To:      ${p.email}`);
    console.log(`Subject: ${p.subject}`);
    console.log('-'.repeat(60));
    console.log(p.body);
    console.log('='.repeat(60) + '\n');
    return;
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: p.email,
    subject: p.subject,
    text: p.body,
    replyTo: REPLY_TO,
  });

  if (error) {
    console.error(`❌ Échec envoi ${key}:`, error);
    process.exit(1);
  }

  const now = new Date().toISOString();
  console.log(`✓ Envoyé à ${key}`);
  console.log(`  Email    : ${p.email}`);
  console.log(`  Resend ID: ${data?.id}`);
  console.log(`  Timestamp: ${now}`);
  console.log(`  Notion   : https://www.notion.so/${p.notionId}`);
  console.log(`  → Logger manuellement dans la fiche Notion ci-dessus`);
}

// Parse args
const args = process.argv.slice(2);
const key = args.find(a => a.startsWith('--prospect='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!key) {
  console.error('Usage: npx tsx scripts/send-founder-campaign.ts --prospect=<key> [--dry-run]');
  console.error(`Keys valides: ${Object.keys(PROSPECTS).join(', ')}`);
  process.exit(1);
}

send(key, dryRun);
```

---

## 5. Checklist & commandes d'exécution

### 5.1 Test de bout en bout (à faire AVANT tout envoi réel)

```bash
# Step 1: dry-run sur un prospect pour vérifier le rendu texte
npx tsx scripts/send-founder-campaign.ts --prospect=noam --dry-run

# Step 2: envoyer un vrai email à toi-même
npx tsx scripts/send-founder-campaign.ts --prospect=test

# Step 3: vérifier réception dans ta boîte franckolivier@leguideauditif.fr
# - Pas de spam ?
# - Rendu texte correct ?
# - Lien reply-to fonctionne ?
```

**Seulement si le test passe, continuer.**

### 5.2 Planning d'envoi (ordre + dates)

| Ordre | Date | Heure | Prospect | Commande |
|---|---|---|---|---|
| 1 | **Lundi 20/04** | ce soir | Gaëlle (si email OK) | `npx tsx scripts/send-founder-campaign.ts --prospect=gaelle` |
| 2 | **Mardi 21/04** | matin | Avy | `npx tsx scripts/send-founder-campaign.ts --prospect=avy` |
| 3 | **Jeudi 24/04** | matin | Nathan | `npx tsx scripts/send-founder-campaign.ts --prospect=nathan` |
| 4 | **Jeudi 24/04** | matin | Noam | `npx tsx scripts/send-founder-campaign.ts --prospect=noam` |
| 5 | **Jeudi 24/04** | matin | Julie (si email OK) | `npx tsx scripts/send-founder-campaign.ts --prospect=julie` |

**Rationale du timing** :
- Gaëlle ce soir → elle lit avant ton rappel de demain
- Avy mardi → la promesse non tenue ne doit pas vieillir
- Les 3 autres jeudi → avoir entre-temps Anthony signé (mardi) + Laurent signé (lundi-mardi) pour maximiser la preuve sociale si quelqu'un te répond et demande "qui d'autre a signé ?"

### 5.3 Si un prospect répond entre-temps

- **Stopper** l'envoi prévu pour lui
- Le passer en conversation active
- Le retirer du batch du jeudi

---

## 6. Post-envoi — logging Notion

Après chaque envoi réussi, mettre à jour la fiche Notion correspondante :

1. **Deal Stage** : passer `03 — Fiche revendiquée` → `04 — Conversation en cours`
2. **Date dernière action** : la date d'envoi
3. **Prochaine action** : J+3 (relance douce si pas de retour)
4. **Notes** : ajouter `"Email Fondateur envoyé [date], Resend ID [id]"`

Les IDs Notion sont dans le script (`notionId` de chaque prospect).

---

## 7. Ce qu'il ne faut PAS faire

- ❌ Ne pas relancer par email 2x le même prospect la même semaine
- ❌ Ne pas envoyer à quelqu'un qui est en conversation active (Anthony, Laurent, Lucie, Victor, Nicolas, Michael, Avidan, Jonathan)
- ❌ Ne pas envoyer aux salariés d'enseignes (Catherine Audika, Céline Entendre, Hugo VYV3, Mathieu Optical Center, Camille Amplifon) — non-éligibles Fondateur
- ❌ Ne pas mentionner les chiffres tarifaires (19€, 49€, 6 mois offerts) dans les emails — c'est réservé au call de visio
- ❌ Ne pas ajouter de signature HTML / logo / tracking pixels — garder l'effet "email personnel"

---

## 8. Récap des chiffres de référence (pour tes rappels de call)

- **Fondateur** : 19 €/mois/centre verrouillé à vie, 6 mois offerts
- **Tarif post-20** : 49 €/mois/centre (futur)
- **Places** : 20 max, 19 restantes post-Anthony
- **Écart sur 10 ans** : (49−19) × 12 × 10 = 3 600 € / centre

---

*Brief généré le 20/04/2026 — À jour avec la mémoire projet (recent_updates du 20/04) et les transcriptions Ringover des 15-16/04.*
