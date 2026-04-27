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
  photos_cabine: string[];
  audio_bio: string | null;
  audio_annee_dip: number | null;
  audio_associations: string[];
  services_inclus: Record<string, boolean> | null;
  langues: string[];
  equipement_cabine: Record<string, boolean | number> | null;
  accessibilite: Record<string, boolean | string> | null;
  partenaires_locaux: Array<{
    nom: string;
    role: 'orl' | 'generaliste' | 'kine' | 'ehpad' | 'pharmacie' | 'autre';
    ville?: string;
    tel?: string;
    url?: string;
  }> | null;
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
  // SIRENE INSEE : 'A' actif, 'C' cessé, 'F' fermé.
  // Les fiches 'C' sont exclues de la vue publique v_centres_auditifs_public (sauf
  // exception claim_status='approved'). La page /centre/[slug] retourne HTTP 410 Gone
  // pour 'C' et 'F' (cf. migration 033_centres_public_view.sql).
  etat_administratif?: 'A' | 'C' | 'F' | null;
}

export type CentrePlan = 'rpps' | 'claimed' | 'premium';
