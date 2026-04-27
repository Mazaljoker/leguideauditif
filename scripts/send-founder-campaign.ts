/**
 * Campagne Partenaire Fondateur — Semaine 17
 * Brief source : Docs/claude-code-brief-campagne-fondateur.md
 *
 * Usage :
 *   npx tsx scripts/send-founder-campaign.ts --prospect=<key> [--dry-run]
 *
 * Clés valides : test, noam, nathan, avy, julie, gaelle
 *
 * --dry-run : affiche l'email sans l'envoyer (aucun appel Resend).
 *
 * Après chaque envoi réussi, un Resend ID + lien Notion sont affichés
 * pour logging manuel dans la fiche prospect (voir Brief §6).
 */

import { config } from 'dotenv';
import { Resend } from 'resend';

config({ path: '.env.local' });
config({ path: '.env' });

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('[FAIL] RESEND_API_KEY manquant dans .env.local ou .env');
  process.exit(1);
}

const resend = new Resend(apiKey);

const FROM = 'Franck-Olivier Chabbat <franckolivier@leguideauditif.fr>';
const REPLY_TO = 'franckolivier@leguideauditif.fr';

type Prospect = {
  notionId: string;
  email: string;
  subject: string;
  body: string;
};

const PROSPECTS: Record<string, Prospect> = {
  test: {
    notionId: 'self-test',
    email: 'franckolivier@leguideauditif.fr',
    subject: '[TEST] Campagne Fondateur — vérification envoi',
    body: `Test de rendu Resend.

Si tu lis ceci, le setup fonctionne :
- FROM : ${FROM}
- REPLY_TO : ${REPLY_TO}
- Domaine leguideauditif.fr vérifié dans Resend

Prochaine étape : lancer les envois prospects un par un selon le planning.

— FO`,
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
    email: 'auditionpassion@gmail.com',
    subject: 'Julie — ravi du retour positif via ton assistante',
    body: `Salut Julie,

Franck-Olivier Chabbat, audio DE (28 ans), comme toi. Ton assistante m'a fait part de ton retour très positif sur leguideauditif.fr vendredi — elle m'a rapporté « ça regroupe beaucoup de choses, tout au même endroit ». Merci pour ça, ça fait plaisir à entendre d'une consœur.

Ta fiche Audition Passion est déjà en ligne, gratuite, et elle le restera. Elle est construite pour apparaître quand un patient de Villeneuve-sur-Lot cherche un audio sur Google, avec mon nom DE associé qui pondère l'autorité YMYL santé.

À côté de la fiche gratuite, j'ai monté une offre spécifique pour les 20 premiers audios DE indépendants qui s'inscrivent — le Partenaire Fondateur. Il reste 19 places, et ton profil y colle.

Les conditions, je préfère te les expliquer en direct — 15 min en visio, je te montre la fiche premium en partage d'écran, tu juges par toi-même.

Tu me donnes un créneau cette semaine ? Ou appelle-moi direct si plus simple : 04 65 84 77 71.

À bientôt,
Franck-Olivier`,
  },

  gaelle: {
    notionId: '341e246ef84681cbbdb3fc9d9e6e3494',
    email: 'mantes@audition-center.fr',
    subject: 'Gaëlle — rappel demain, + un détail pour IDF Audition',
    body: `Bonjour,

Je cherche à joindre Gaëlle Nezonde au sujet de sa fiche revendiquée sur leguideauditif.fr. Si vous n'êtes pas Gaëlle, merci de lui transmettre ce message — ci-dessous le contenu qui lui est destiné.

---

Salut Gaëlle,

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
    console.error(`[FAIL] Prospect "${key}" inconnu.`);
    console.error(`       Clés valides : ${Object.keys(PROSPECTS).join(', ')}`);
    process.exit(1);
  }

  if (p.email.startsWith('TODO_')) {
    console.error(`[FAIL] Email manquant pour ${key}. Mets à jour le script avant envoi.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n' + '='.repeat(64));
    console.log(`DRY RUN — ${key.toUpperCase()}`);
    console.log('='.repeat(64));
    console.log(`From    : ${FROM}`);
    console.log(`To      : ${p.email}`);
    console.log(`Reply-To: ${REPLY_TO}`);
    console.log(`Subject : ${p.subject}`);
    console.log('-'.repeat(64));
    console.log(p.body);
    console.log('='.repeat(64) + '\n');
    return;
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [p.email],
    subject: p.subject,
    text: p.body,
    replyTo: REPLY_TO,
  });

  if (error) {
    console.error(`[FAIL] Envoi ${key} : ${error.message ?? JSON.stringify(error)}`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  console.log(`[OK] Envoyé à ${key}`);
  console.log(`     Email     : ${p.email}`);
  console.log(`     Resend ID : ${data?.id ?? '(unknown)'}`);
  console.log(`     Timestamp : ${now}`);
  console.log(`     Notion    : https://www.notion.so/${p.notionId}`);
  console.log(`     -> Logger manuellement dans la fiche Notion ci-dessus`);
}

const args = process.argv.slice(2);
const keyArg = args.find((a) => a.startsWith('--prospect='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!keyArg) {
  console.error('Usage : npx tsx scripts/send-founder-campaign.ts --prospect=<key> [--dry-run]');
  console.error(`Clés valides : ${Object.keys(PROSPECTS).join(', ')}`);
  process.exit(1);
}

send(keyArg, dryRun);
