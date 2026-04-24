import { emailLayout } from './layout';

interface Nurture02Data {
  prenom: string;
  slotsRestants: number;   // 0..20
  calendarUrl: string;     // lien Cal.com / Zoom pour réserver 20 min
}

/**
 * Template nurture #2 — Phase 2.
 * Trigger : stage `approuve`/`active`/`engage` depuis ≥ 7j ET
 * feature_flag `fondateurs_drip_enabled` = true.
 * Skip si `slotsRestants = 0`.
 */
export function nurture02OffreFondateursEmail(data: Nurture02Data): string {
  const { prenom, slotsRestants, calendarUrl } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    `Programme Partenaires Fondateurs — ${slotsRestants} places restantes`,
    `
    <p>${greeting}</p>

    <p>Je lance <strong>20 places Fondateurs</strong> pour les premiers audioprothésistes qui rejoignent le réseau LeGuideAuditif. Il en reste <strong>${slotsRestants}</strong>.</p>

    <h2>Ce que je propose</h2>
    <ul>
      <li><strong>Premium à vie offert</strong> : badge Centre vérifié, affichage prioritaire, demandes de devis exclusives sur votre zone</li>
      <li><strong>Accompagnement perso</strong> pour la mise en place de votre fiche et son positionnement local</li>
      <li><strong>Accès prioritaire</strong> aux fonctionnalités à venir (tracking des leads, campagnes Ads intégrées)</li>
    </ul>

    <h2>Ce que je demande en retour</h2>
    <ul>
      <li>Votre <strong>feedback à froid</strong> sur la plateforme, ce qui marche et ce qui coince</li>
      <li>Un <strong>court témoignage vidéo</strong> si vous êtes d'accord, au bout de quelques mois, pour aider les audios qui arrivent après</li>
    </ul>

    <p>C'est tout. Pas de frais cachés, pas de lock-in.</p>

    <p>Si ça vous parle, réservez 20 minutes en visio, je vous explique comment ça marche concrètement.</p>

    <p><a href="${calendarUrl}" class="btn">Réserver un créneau</a></p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
