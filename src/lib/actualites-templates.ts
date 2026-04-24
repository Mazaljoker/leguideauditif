// Templates d'actualités pour /audioprothesiste-pro/actualites/.
// Chaque template génère un title + body à partir de slots saisis par
// l'audio. Le body 'libre' permet un texte brut avec validation serveur.
//
// Règle YMYL : pas de promesse thérapeutique, pas de prix exact.

export type TemplateKey =
  | 'nouvelle_marque'
  | 'portes_ouvertes'
  | 'formation'
  | 'demenagement'
  | 'nouvel_equipement'
  | 'conges'
  | 'promo_100_sante'
  | 'libre';

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  maxlength?: number;
}

export interface TemplateDefinition {
  key: TemplateKey;
  label: string;
  icon: string;
  description: string;
  fields: TemplateField[];
  // Fonction qui construit title + body à partir des variables
  render(vars: Record<string, string>, centreNom: string): { title: string; body: string };
}

const MARQUES = ['Phonak', 'Oticon', 'Signia', 'ReSound', 'Starkey', 'Widex', 'Bernafon', 'Unitron', 'Audioservice'];

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  nouvelle_marque: {
    key: 'nouvelle_marque',
    label: 'Nouvelle marque disponible',
    icon: 'lucide:sparkles',
    description: 'Annoncez la disponibilité d\'une nouvelle marque au centre.',
    fields: [
      { key: 'marque', label: 'Marque', type: 'select', options: MARQUES, required: true },
      { key: 'modele', label: 'Modèle ou gamme (optionnel)', type: 'text', maxlength: 80 },
      { key: 'specificite', label: 'Spécificité ou avantage patient', type: 'textarea', maxlength: 400, placeholder: 'Ex : Bluetooth multipoints, autonomie 16h, ANC actif' },
    ],
    render(v, nom) {
      const modele = v.modele ? ` ${v.modele}` : '';
      const title = `Nouvelle marque au centre : ${v.marque}${modele}`;
      const body = `Le centre ${nom} propose désormais les solutions ${v.marque}${modele}. ${v.specificite ?? ''}`.trim();
      return { title, body };
    },
  },
  portes_ouvertes: {
    key: 'portes_ouvertes',
    label: 'Portes ouvertes',
    icon: 'lucide:door-open',
    description: 'Invitation à une journée portes ouvertes.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'heures', label: 'Horaires', type: 'text', required: true, placeholder: 'Ex : 9h - 18h' },
      { key: 'offre', label: 'Offre ou thème', type: 'textarea', maxlength: 400, placeholder: 'Ex : Bilan gratuit sans rendez-vous, essai d\'appareils Classe 1 et Classe 2' },
    ],
    render(v, nom) {
      const title = `Portes ouvertes le ${formatDate(v.date)}`;
      const body = `Le ${formatDate(v.date)} de ${v.heures}, le centre ${nom} vous accueille lors d'une journée portes ouvertes. ${v.offre ?? ''}`.trim();
      return { title, body };
    },
  },
  formation: {
    key: 'formation',
    label: 'Formation terminée',
    icon: 'lucide:graduation-cap',
    description: 'Signalez une formation continue récemment validée.',
    fields: [
      { key: 'sujet', label: 'Sujet de la formation', type: 'text', required: true, maxlength: 120, placeholder: 'Ex : Phonak Sphere Infinio — technologie DeepSonic' },
      { key: 'duree', label: 'Durée ou organisme (optionnel)', type: 'text', maxlength: 80, placeholder: 'Ex : 2 jours, certifiée UNSAF' },
      { key: 'benefice', label: 'Bénéfice patient', type: 'textarea', maxlength: 400, placeholder: 'Ex : Meilleure adaptation pour les pertes profondes asymétriques' },
    ],
    render(v, nom) {
      const title = `Formation terminée : ${v.sujet}`;
      const duree = v.duree ? ` (${v.duree})` : '';
      const body = `L'équipe de ${nom} vient de valider une formation sur ${v.sujet}${duree}. ${v.benefice ?? ''}`.trim();
      return { title, body };
    },
  },
  demenagement: {
    key: 'demenagement',
    label: 'Déménagement',
    icon: 'lucide:truck',
    description: 'Informez vos patients d\'un changement d\'adresse.',
    fields: [
      { key: 'nouvelle_adresse', label: 'Nouvelle adresse complète', type: 'text', required: true, maxlength: 200 },
      { key: 'date', label: 'Date du déménagement', type: 'date', required: true },
      { key: 'precisions', label: 'Précisions (transports, accès PMR, parking)', type: 'textarea', maxlength: 400 },
    ],
    render(v, nom) {
      const title = `Nouvelle adresse à partir du ${formatDate(v.date)}`;
      const body = `${nom} s'installe au ${v.nouvelle_adresse} à partir du ${formatDate(v.date)}. ${v.precisions ?? ''}`.trim();
      return { title, body };
    },
  },
  nouvel_equipement: {
    key: 'nouvel_equipement',
    label: 'Nouvel équipement',
    icon: 'lucide:cpu',
    description: 'Nouvel appareil technique au centre (cabine, audiomètre…).',
    fields: [
      { key: 'type', label: 'Type d\'équipement', type: 'text', required: true, maxlength: 120, placeholder: 'Ex : Cabine audiométrique insonorisée, audiomètre Interacoustics' },
      { key: 'benefice', label: 'Bénéfice patient', type: 'textarea', required: true, maxlength: 500, placeholder: 'Ex : Mesures plus précises en haute fréquence, tests pédiatriques possibles' },
    ],
    render(v, nom) {
      const title = `Nouvel équipement : ${v.type}`;
      const body = `${nom} s'équipe d'un nouveau matériel : ${v.type}. ${v.benefice}`;
      return { title, body };
    },
  },
  conges: {
    key: 'conges',
    label: 'Congés',
    icon: 'lucide:palmtree',
    description: 'Période de fermeture prévue.',
    fields: [
      { key: 'debut', label: 'Date de début', type: 'date', required: true },
      { key: 'fin', label: 'Date de fin', type: 'date', required: true },
      { key: 'urgence', label: 'Contact urgence (optionnel)', type: 'textarea', maxlength: 300, placeholder: 'Ex : En cas d\'urgence, contactez le centre partenaire X au 01 23 45 67 89' },
    ],
    render(v, nom) {
      const title = `Congés du ${formatDate(v.debut)} au ${formatDate(v.fin)}`;
      const body = `${nom} sera fermé du ${formatDate(v.debut)} au ${formatDate(v.fin)} inclus. Réouverture prévue le lendemain. ${v.urgence ?? ''}`.trim();
      return { title, body };
    },
  },
  promo_100_sante: {
    key: 'promo_100_sante',
    label: 'Semaine 100% Santé',
    icon: 'lucide:shield-check',
    description: 'Communication sur le dispositif 100% Santé (Classe 1).',
    fields: [
      { key: 'debut', label: 'Date de début', type: 'date', required: true },
      { key: 'fin', label: 'Date de fin', type: 'date', required: true },
      { key: 'details', label: 'Informations complémentaires', type: 'textarea', maxlength: 500, placeholder: 'Ex : Bilan gratuit + essai 30 jours sans engagement de tous les modèles Classe 1' },
    ],
    render(v, nom) {
      const title = `Semaine 100% Santé du ${formatDate(v.debut)} au ${formatDate(v.fin)}`;
      const body = `Du ${formatDate(v.debut)} au ${formatDate(v.fin)}, ${nom} met en avant le dispositif 100% Santé. Reste à charge 0€ sur les appareils Classe 1 (après Sécurité sociale + mutuelle responsable). ${v.details ?? ''}`.trim();
      return { title, body };
    },
  },
  libre: {
    key: 'libre',
    label: 'Texte libre',
    icon: 'lucide:pen-line',
    description: 'Annonce libre. Filtres YMYL actifs (pas de promesse thérapeutique, pas de prix exact).',
    fields: [
      { key: 'title_libre', label: 'Titre', type: 'text', required: true, maxlength: 120 },
      { key: 'body_libre', label: 'Contenu', type: 'textarea', required: true, maxlength: 800 },
    ],
    render(v) {
      return { title: v.title_libre ?? '', body: v.body_libre ?? '' };
    },
  },
};

export const TEMPLATE_ORDER: TemplateKey[] = [
  'nouvelle_marque',
  'formation',
  'nouvel_equipement',
  'portes_ouvertes',
  'promo_100_sante',
  'demenagement',
  'conges',
  'libre',
];
