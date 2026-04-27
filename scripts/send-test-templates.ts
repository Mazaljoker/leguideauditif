/**
 * Envoi test des 7 templates lifecycle email à une adresse destinataire.
 * Pas commité comme migration — outil local pour Franck-Olivier.
 *
 * Usage :
 *   npx tsx scripts/send-test-templates.ts [email-destinataire]
 *   (défaut : emarketingconcept2@gmail.com — compte test Demo)
 *
 * Les templates sont envoyés avec des données sample (prenom="Franck",
 * 3 centres Audika Paris, slotsRestants=5, calendarUrl/articleUrl
 * placeholders). Subject préfixé [TEST] pour tracabilité en inbox.
 */

import 'dotenv/config';
import { Resend } from 'resend';

import { premiumWelcomeEmail } from '../src/emails/premium-welcome';
import { ficheIncompleteRelanceEmail } from '../src/emails/fiche-incomplete-relance';
import { nurture01PremiersPatientsEmail } from '../src/emails/nurture-01-premiers-patients';
import { nurture02OffreFondateursEmail } from '../src/emails/nurture-02-offre-fondateurs';
import { nurture03CasConcretEmail } from '../src/emails/nurture-03-cas-concret';
import { nurture04SlotsRestantsEmail } from '../src/emails/nurture-04-slots-restants';
import { nurture05AdsOuSortieEmail } from '../src/emails/nurture-05-ads-ou-sortie';
import { nouvelEspaceProAnnonceEmail } from '../src/emails/nouvel-espace-pro-annonce';

const FROM = 'Franck-Olivier — LeGuideAuditif <franckolivier@leguideauditif.fr>';
const recipient = process.argv[2] ?? 'emarketingconcept2@gmail.com';
// Filtre optionnel : --only <template_key> (envoie uniquement celui-ci)
const onlyArgIndex = process.argv.indexOf('--only');
const onlyKey = onlyArgIndex >= 0 ? process.argv[onlyArgIndex + 1] : null;

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('RESEND_API_KEY manquant dans .env');
  process.exit(1);
}
const resend = new Resend(apiKey);

// Données sample partagées
const SAMPLE = {
  prenom: 'Franck',
  centreNom: 'Audika Paris 11e',
  centreSlug: 'audika-paris-11e-75011-demo',
  nbCentres: 3,
  completenessAvg: 62,
  primaryCentreSlug: 'audika-paris-11e-75011-demo',
  slotsRestants: 5,
  stayFreeUrl: 'https://leguideauditif.fr/audioprothesiste-pro/preferences?choix=gratuit',
  // Token sample pour le footer unsub. UUID v4 fixe pour les tests —
  // en prod c'est audiopro_lifecycle.email_preferences_token.
  unsubscribeToken: '00000000-0000-4000-8000-000000000000',
};

// Sample pour fiche_incomplete_relance (format AudioproMissingField[])
const MISSING_SAMPLE = [
  {
    centre_id: '00000000-0000-0000-0000-000000000001',
    centre_slug: 'audika-paris-11e-75011-demo',
    centre_nom: 'Audika Paris 11e',
    completeness_pct: 43,
    missing_fields: ['tel', 'photo_url', 'a_propos', 'specialites'] as const,
  },
  {
    centre_id: '00000000-0000-0000-0000-000000000002',
    centre_slug: 'audika-paris-15e-75015-demo',
    centre_nom: 'Audika Paris 15e',
    completeness_pct: 71,
    missing_fields: ['photo_url', 'specialites'] as const,
  },
];

interface TestEmail {
  key: string;
  subject: string;
  html: string;
}

const emails: TestEmail[] = [
  {
    key: 'premium_welcome',
    subject: '[TEST 1/8 v2] Bienvenue dans LeGuideAuditif Premium',
    html: premiumWelcomeEmail({
      prenom: SAMPLE.prenom,
      centreNom: SAMPLE.centreNom,
      centreSlug: SAMPLE.centreSlug,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'fiche_incomplete_relance',
    subject: `[TEST 2/8 v2] Il manque des infos sur ${MISSING_SAMPLE.length} de vos fiches`,
    html: ficheIncompleteRelanceEmail({
      prenom: SAMPLE.prenom,
      centres: MISSING_SAMPLE as unknown as Parameters<typeof ficheIncompleteRelanceEmail>[0]['centres'],
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nurture_01_premiers_patients',
    subject: '[TEST 3/8 v2] Vos premiers patients sur LeGuideAuditif — quelques repères',
    html: nurture01PremiersPatientsEmail({
      prenom: SAMPLE.prenom,
      nbCentres: SAMPLE.nbCentres,
      completenessAvg: SAMPLE.completenessAvg,
      primaryCentreSlug: SAMPLE.primaryCentreSlug,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nurture_02_offre_fondateurs',
    subject: `[TEST 4/8 v5] Programme Partenaires Fondateurs — ${SAMPLE.slotsRestants} places restantes`,
    html: nurture02OffreFondateursEmail({
      prenom: SAMPLE.prenom,
      slotsRestants: SAMPLE.slotsRestants,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nurture_03_cas_concret',
    subject: '[TEST 5/8 v3] Trois choses qui changent la perception côté patient',
    html: nurture03CasConcretEmail({
      prenom: SAMPLE.prenom,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nurture_04_slots_restants',
    subject: `[TEST 6/8 v3] Plus que ${SAMPLE.slotsRestants} places Fondateurs`,
    html: nurture04SlotsRestantsEmail({
      prenom: SAMPLE.prenom,
      slotsRestants: SAMPLE.slotsRestants,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nurture_05_ads_ou_sortie',
    subject: '[TEST 7/8 v4] Des RDV patients ou vous restez en vitrine ?',
    html: nurture05AdsOuSortieEmail({
      prenom: SAMPLE.prenom,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
  {
    key: 'nouvel_espace_pro_annonce',
    subject: '[TEST 8/8 v2] Votre espace pro LeGuideAuditif a été refondu',
    html: nouvelEspaceProAnnonceEmail({
      prenom: SAMPLE.prenom,
      unsubscribeToken: SAMPLE.unsubscribeToken,
    }),
  },
];

async function main() {
  const selected = onlyKey ? emails.filter((e) => e.key === onlyKey) : emails;
  if (onlyKey && selected.length === 0) {
    console.error(`Aucun template ne matche --only ${onlyKey}. Clés valides :`);
    emails.forEach((e) => console.error(`  - ${e.key}`));
    process.exit(1);
  }
  console.log(`Envoi de ${selected.length} template(s) à ${recipient}\n`);

  for (const email of selected) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [recipient],
        subject: email.subject,
        html: email.html,
        replyTo: 'franckolivier@leguideauditif.fr',
      });
      if (error) {
        console.error(`  [X] ${email.key} — ${error.message}`);
      } else {
        console.log(`  [OK] ${email.key} — messageId=${data?.id ?? '?'}`);
      }
      // Petite pause pour éviter un rate limit agressif
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [X] ${email.key} — ${msg}`);
    }
  }

  console.log('\nFini.');
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
