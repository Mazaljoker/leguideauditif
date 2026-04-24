// Types pour la table centre_audios — équipe d'un centre Premium.
// 1 titulaire (role='titulaire') + jusqu'à N-1 collaborateurs.
// Max 10 par centre (validation dans /api/audiopro/team/add).

export type CentreAudioRole = 'titulaire' | 'collaborateur';

export type CentreAudioSpecialite =
  | 'acouphenes'
  | 'pediatrie'
  | 'implants'
  | '100_sante'
  | 'presbyacousie'
  | 'hyperacousie'
  | 'protection'
  | 'autre';

export interface CentreAudio {
  id: string;
  centre_id: string;
  rpps: string;
  prenom: string;
  nom: string;
  role: CentreAudioRole;
  ordre: number;
  photo_url: string | null;
  bio: string | null;
  annee_dip: number | null;
  associations: string[];
  specialite: CentreAudioSpecialite | null;
}

export const SPECIALITE_LABELS: Record<CentreAudioSpecialite, string> = {
  acouphenes: 'Acouphènes',
  pediatrie: 'Pédiatrie',
  implants: 'Implants cochléaires',
  '100_sante': '100% Santé',
  presbyacousie: 'Presbyacousie',
  hyperacousie: 'Hyperacousie',
  protection: 'Protection auditive',
  autre: 'Autre',
};

export const MAX_TEAM_SIZE = 10;
