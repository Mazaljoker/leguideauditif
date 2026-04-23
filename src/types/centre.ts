export interface CentreData {
  id: string;
  slug: string;
  nom: string;
  adresse: string;
  cp: string;
  ville: string | null;
  departement: string | null;
  lat: number | null;
  lng: number | null;
  siret: string | null;
  tel: string | null;
  horaires: string | null;
  site_web: string | null;
  email: string | null;
  photo_url: string | null;
  audio_photo_url: string | null;
  specialites: string[];
  marques: string[];
  reseaux_sociaux: Record<string, string> | null;
  a_propos: string | null;
  rpps: string | null;
  plan: CentrePlan;
  source: string;
  finess: string | null;
  audio_nom: string | null;
  audio_prenom: string | null;
  claimed_by_name: string | null;
  claimed_by_email: string | null;
  claimed_at: string | null;
  claim_status: 'none' | 'pending' | 'approved' | 'rejected';
  is_demo?: boolean;
}

export type CentrePlan = 'rpps' | 'claimed' | 'premium';
