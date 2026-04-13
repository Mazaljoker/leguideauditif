// --- Catégories et sous-catégories ---

export type AnnonceCategorie = 'cession' | 'emploi' | 'remplacement' | 'materiel' | 'services';

export type SousCategorieCession =
  | 'fonds_commerce'
  | 'bail_ceder'
  | 'patientele'
  | 'murs';

export type SousCategorieEmploi =
  | 'audioprothesiste_cdi'
  | 'audioprothesiste_cdd'
  | 'assistant_audio'
  | 'technicien'
  | 'secretaire_medical'
  | 'stage';

export type SousCategorieRemplacement =
  | 'vacances'
  | 'conge_maternite'
  | 'maladie'
  | 'ponctuel'
  | 'longue_duree';

export type SousCategorieMateriel =
  | 'cabine_audiometrique'
  | 'audiometre'
  | 'chaine_mesure'
  | 'bac_ultrasons'
  | 'otoscope'
  | 'mobilier'
  | 'informatique'
  | 'autre';

export type SousCategorieServices =
  | 'marketing_digital'
  | 'gestion_reseaux_sociaux'
  | 'formation'
  | 'conseil'
  | 'comptabilite'
  | 'juridique'
  | 'autre';

export type AnnonceSousCategorie =
  | SousCategorieCession
  | SousCategorieEmploi
  | SousCategorieRemplacement
  | SousCategorieMateriel
  | SousCategorieServices;

export type AnnoncePrixType =
  | 'fixe'
  | 'negociable'
  | 'sur_demande'
  | 'gratuit'
  | 'salaire_annuel'
  | 'salaire_mensuel'
  | 'tjm';

export type AnnonceStatut =
  | 'brouillon'
  | 'active'
  | 'expiree'
  | 'supprimee'
  | 'moderee';

// --- Annonce ---

export interface Annonce {
  id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  user_id: string;
  contact_email: string;
  contact_tel: string | null;
  contact_nom: string;
  titre: string;
  description: string;
  slug: string;
  categorie: AnnonceCategorie;
  sous_categorie: AnnonceSousCategorie | null;
  departement: string | null;
  ville: string | null;
  code_postal: string | null;
  region: string | null;
  prix_min: number | null;
  prix_max: number | null;
  prix_type: AnnoncePrixType | null;
  photos: string[];
  photo_count: number | null;
  statut: AnnonceStatut;
  is_premium: boolean;
  is_verified: boolean;
  boost_until: string | null;
  contacts_unlocked: boolean;
  views_count: number;
  contacts_count: number;
  meta_title: string | null;
  meta_description: string | null;
}

// --- Contact ---

export type ContactProfil =
  | 'audioprothesiste_de'
  | 'etudiant_audio'
  | 'assistant'
  | 'investisseur'
  | 'enseigne'
  | 'autre';

export interface AnnonceContact {
  id: string;
  created_at: string;
  annonce_id: string;
  user_id: string | null;
  nom: string;
  email: string;
  telephone: string | null;
  message: string | null;
  profil: ContactProfil | null;
  lu: boolean;
}

// --- Profil utilisateur ---

export type ProfilType =
  | 'audioprothesiste_de'
  | 'etudiant_audio'
  | 'assistant_audio'
  | 'enseigne'
  | 'investisseur'
  | 'autre';

export interface Profile {
  id: string;
  created_at: string;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  profil_type: ProfilType | null;
  numero_rpps: string | null;
  centre_nom: string | null;
  centre_ville: string | null;
  centre_departement: string | null;
}

// --- Alerte ---

export type AlerteFrequence = 'immediat' | 'quotidien' | 'hebdo';

export interface AnnonceAlerte {
  id: string;
  created_at: string;
  user_id: string;
  categorie: AnnonceCategorie;
  sous_categorie: AnnonceSousCategorie | null;
  departements: string[] | null;
  prix_max: number | null;
  frequence: AlerteFrequence;
  active: boolean;
  last_sent_at: string | null;
}

// --- Paiement ---

export type AnnonceProduit =
  | 'unlock_contacts'
  | 'premium'
  | 'boost_semaine'
  | 'alerte_ciblee'
  | 'pack_cession'
  | 'pack_cession_accomp';

export type PaiementStatut = 'pending' | 'paid' | 'failed' | 'refunded';

export interface AnnoncePaiement {
  id: string;
  created_at: string;
  user_id: string;
  annonce_id: string;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  produit: AnnonceProduit;
  montant: number;
  statut: PaiementStatut;
}

// --- Constantes ---

export const CATEGORIES_META: Record<AnnonceCategorie, {
  label: string;
  description: string;
  icon: string;
}> = {
  cession: {
    label: 'Cession & Installation',
    description: 'Vendre ou reprendre un centre',
    icon: 'lucide:building-2',
  },
  emploi: {
    label: 'Emploi & Recrutement',
    description: 'Recruter ou trouver un poste',
    icon: 'lucide:briefcase',
  },
  remplacement: {
    label: 'Remplacement',
    description: 'Trouver ou proposer un remplacement',
    icon: 'lucide:calendar-clock',
  },
  materiel: {
    label: 'Materiel professionnel',
    description: 'Acheter ou vendre du materiel',
    icon: 'lucide:wrench',
  },
  services: {
    label: 'Services professionnels',
    description: 'Marketing, gestion, conseil pour votre centre',
    icon: 'lucide:handshake',
  },
};

export const SOUS_CATEGORIES: Record<AnnonceCategorie, { value: string; label: string }[]> = {
  cession: [
    { value: 'fonds_commerce', label: 'Fonds de commerce' },
    { value: 'bail_ceder', label: 'Bail a ceder' },
    { value: 'patientele', label: 'Patientele' },
    { value: 'murs', label: 'Murs' },
  ],
  emploi: [
    { value: 'audioprothesiste_cdi', label: 'Audioprothesiste CDI' },
    { value: 'audioprothesiste_cdd', label: 'Audioprothesiste CDD' },
    { value: 'assistant_audio', label: 'Assistant audio' },
    { value: 'technicien', label: 'Technicien' },
    { value: 'secretaire_medical', label: 'Secretaire medical' },
    { value: 'stage', label: 'Stage' },
  ],
  remplacement: [
    { value: 'vacances', label: 'Vacances' },
    { value: 'conge_maternite', label: 'Conge maternite' },
    { value: 'maladie', label: 'Maladie' },
    { value: 'ponctuel', label: 'Ponctuel' },
    { value: 'longue_duree', label: 'Longue duree' },
  ],
  materiel: [
    { value: 'cabine_audiometrique', label: 'Cabine audiometrique' },
    { value: 'audiometre', label: 'Audiometre' },
    { value: 'chaine_mesure', label: 'Chaine de mesure' },
    { value: 'bac_ultrasons', label: 'Bac a ultrasons' },
    { value: 'otoscope', label: 'Otoscope' },
    { value: 'mobilier', label: 'Mobilier' },
    { value: 'informatique', label: 'Informatique' },
    { value: 'autre', label: 'Autre' },
  ],
  services: [
    { value: 'marketing_digital', label: 'Marketing digital' },
    { value: 'gestion_reseaux_sociaux', label: 'Gestion reseaux sociaux' },
    { value: 'formation', label: 'Formation' },
    { value: 'conseil', label: 'Conseil' },
    { value: 'comptabilite', label: 'Comptabilite' },
    { value: 'juridique', label: 'Juridique' },
    { value: 'autre', label: 'Autre' },
  ],
};

export const PROFILS_CONTACT: { value: ContactProfil; label: string }[] = [
  { value: 'audioprothesiste_de', label: 'Audioprothesiste DE' },
  { value: 'etudiant_audio', label: 'Etudiant en audioprothese' },
  { value: 'assistant', label: 'Assistant audio' },
  { value: 'investisseur', label: 'Investisseur' },
  { value: 'enseigne', label: 'Enseigne / reseau' },
  { value: 'autre', label: 'Autre' },
];

export const DEPARTEMENTS: { code: string; nom: string }[] = [
  { code: '01', nom: 'Ain' },
  { code: '02', nom: 'Aisne' },
  { code: '03', nom: 'Allier' },
  { code: '04', nom: 'Alpes-de-Haute-Provence' },
  { code: '05', nom: 'Hautes-Alpes' },
  { code: '06', nom: 'Alpes-Maritimes' },
  { code: '07', nom: 'Ardeche' },
  { code: '08', nom: 'Ardennes' },
  { code: '09', nom: 'Ariege' },
  { code: '10', nom: 'Aube' },
  { code: '11', nom: 'Aude' },
  { code: '12', nom: 'Aveyron' },
  { code: '13', nom: 'Bouches-du-Rhone' },
  { code: '14', nom: 'Calvados' },
  { code: '15', nom: 'Cantal' },
  { code: '16', nom: 'Charente' },
  { code: '17', nom: 'Charente-Maritime' },
  { code: '18', nom: 'Cher' },
  { code: '19', nom: 'Correze' },
  { code: '2A', nom: 'Corse-du-Sud' },
  { code: '2B', nom: 'Haute-Corse' },
  { code: '21', nom: "Cote-d'Or" },
  { code: '22', nom: "Cotes-d'Armor" },
  { code: '23', nom: 'Creuse' },
  { code: '24', nom: 'Dordogne' },
  { code: '25', nom: 'Doubs' },
  { code: '26', nom: 'Drome' },
  { code: '27', nom: 'Eure' },
  { code: '28', nom: 'Eure-et-Loir' },
  { code: '29', nom: 'Finistere' },
  { code: '30', nom: 'Gard' },
  { code: '31', nom: 'Haute-Garonne' },
  { code: '32', nom: 'Gers' },
  { code: '33', nom: 'Gironde' },
  { code: '34', nom: 'Herault' },
  { code: '35', nom: 'Ille-et-Vilaine' },
  { code: '36', nom: 'Indre' },
  { code: '37', nom: 'Indre-et-Loire' },
  { code: '38', nom: 'Isere' },
  { code: '39', nom: 'Jura' },
  { code: '40', nom: 'Landes' },
  { code: '41', nom: 'Loir-et-Cher' },
  { code: '42', nom: 'Loire' },
  { code: '43', nom: 'Haute-Loire' },
  { code: '44', nom: 'Loire-Atlantique' },
  { code: '45', nom: 'Loiret' },
  { code: '46', nom: 'Lot' },
  { code: '47', nom: 'Lot-et-Garonne' },
  { code: '48', nom: 'Lozere' },
  { code: '49', nom: 'Maine-et-Loire' },
  { code: '50', nom: 'Manche' },
  { code: '51', nom: 'Marne' },
  { code: '52', nom: 'Haute-Marne' },
  { code: '53', nom: 'Mayenne' },
  { code: '54', nom: 'Meurthe-et-Moselle' },
  { code: '55', nom: 'Meuse' },
  { code: '56', nom: 'Morbihan' },
  { code: '57', nom: 'Moselle' },
  { code: '58', nom: 'Nievre' },
  { code: '59', nom: 'Nord' },
  { code: '60', nom: 'Oise' },
  { code: '61', nom: 'Orne' },
  { code: '62', nom: 'Pas-de-Calais' },
  { code: '63', nom: 'Puy-de-Dome' },
  { code: '64', nom: 'Pyrenees-Atlantiques' },
  { code: '65', nom: 'Hautes-Pyrenees' },
  { code: '66', nom: 'Pyrenees-Orientales' },
  { code: '67', nom: 'Bas-Rhin' },
  { code: '68', nom: 'Haut-Rhin' },
  { code: '69', nom: 'Rhone' },
  { code: '70', nom: 'Haute-Saone' },
  { code: '71', nom: 'Saone-et-Loire' },
  { code: '72', nom: 'Sarthe' },
  { code: '73', nom: 'Savoie' },
  { code: '74', nom: 'Haute-Savoie' },
  { code: '75', nom: 'Paris' },
  { code: '76', nom: 'Seine-Maritime' },
  { code: '77', nom: 'Seine-et-Marne' },
  { code: '78', nom: 'Yvelines' },
  { code: '79', nom: 'Deux-Sevres' },
  { code: '80', nom: 'Somme' },
  { code: '81', nom: 'Tarn' },
  { code: '82', nom: 'Tarn-et-Garonne' },
  { code: '83', nom: 'Var' },
  { code: '84', nom: 'Vaucluse' },
  { code: '85', nom: 'Vendee' },
  { code: '86', nom: 'Vienne' },
  { code: '87', nom: 'Haute-Vienne' },
  { code: '88', nom: 'Vosges' },
  { code: '89', nom: 'Yonne' },
  { code: '90', nom: 'Territoire de Belfort' },
  { code: '91', nom: 'Essonne' },
  { code: '92', nom: 'Hauts-de-Seine' },
  { code: '93', nom: 'Seine-Saint-Denis' },
  { code: '94', nom: 'Val-de-Marne' },
  { code: '95', nom: "Val-d'Oise" },
  { code: '971', nom: 'Guadeloupe' },
  { code: '972', nom: 'Martinique' },
  { code: '973', nom: 'Guyane' },
  { code: '974', nom: 'La Reunion' },
  { code: '976', nom: 'Mayotte' },
];
