// Fixtures mock pour le dashboard pro en dev. Permet de basculer entre
// les 3 états (revendicateur / premium_solo / reseau) via le query param
// ?preview=... sans avoir besoin de comptes réels en base.
//
// Ces fixtures reproduisent fidèlement les mockups HTML :
//   - revendicateur → CP Bordeaux (Sophie Martin)
//   - premium_solo  → CP Paris 16e (Anthony Athuil - 1 centre)
//   - reseau        → CP Paris 8e/15e/16e (Anthony Athuil - 3 centres)
//
// Jamais importé en prod — guard derrière import.meta.env.DEV côté
// appelant.

import type { CentreData } from '../types/centre';
import type { CentreTableRow } from '../types/audiopro';

export function makeMockCentre(overrides: Partial<CentreData> = {}): CentreData {
  return {
    id: 'mock-' + (overrides.slug ?? 'centre'),
    slug: 'centre-audio-bordeaux-centre',
    nom: 'Centre Audio Bordeaux Centre',
    adresse: '12 rue Sainte-Catherine',
    cp: '33000',
    ville: 'Bordeaux',
    departement: '33',
    lat: null,
    lng: null,
    siret: null,
    tel: '05 56 00 00 00',
    horaires: 'Lun-Ven 9h-18h',
    site_web: null,
    email: 'sophie@centre-audio-bordeaux.fr',
    photo_url: null,
    specialites: [],
    marques: [],
    reseaux_sociaux: null,
    a_propos: null,
    rpps: '10001234567',
    plan: 'claimed',
    source: 'rpps',
    finess: null,
    audio_nom: 'Martin',
    audio_prenom: 'Sophie',
    claimed_by_name: 'Sophie Martin',
    claimed_by_email: 'sophie@centre-audio-bordeaux.fr',
    claimed_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    claim_status: 'approved',
    is_demo: true,
    ...overrides,
  };
}

export const mockReseauRows: CentreTableRow[] = [
  {
    slug: 'laboratoire-auditif-anthony-athuil-trocadero-paris-75016',
    nom: 'Trocadéro',
    adresse: '20 rue Benjamin Franklin',
    cp: '75016',
    adsStatus: 'active',
    adsLabel: 'Active',
    positionRank: 3,
    positionTotal: 47,
    vues30j: 5,
    reviewScore: 4.7,
    reviewCount: 47,
    completeness: 89,
  },
  {
    slug: 'laboratoire-auditif-anthony-athuil-parc-monceau-paris-75008',
    nom: 'Parc Monceau',
    adresse: 'Av. de Messine',
    cp: '75008',
    adsStatus: 'pending',
    adsLabel: 'Setup en cours',
    positionRank: null,
    positionTotal: null,
    vues30j: 1,
    reviewScore: 4.6,
    reviewCount: 28,
    completeness: 76,
  },
  {
    slug: 'laboratoire-auditif-anthony-athuil-commerce-paris-75015',
    nom: 'Commerce',
    adresse: 'Rue du Commerce',
    cp: '75015',
    adsStatus: 'pending',
    adsLabel: 'Setup en cours',
    positionRank: null,
    positionTotal: null,
    vues30j: 1,
    reviewScore: 4.5,
    reviewCount: 19,
    completeness: 82,
  },
];
