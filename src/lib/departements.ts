/**
 * Données départements français pour le silo SEO local.
 * Utilisé par les pages /audioprothesiste/departement/[dep] et /audioprothesiste/[ville].
 */

export interface DepartementInfo {
  code: string;
  nom: string;
  region: string;
  slug: string; // URL-safe : "bouches-du-rhone"
}

export const DEPARTEMENTS: DepartementInfo[] = [
  { code: '01', nom: 'Ain', region: 'Auvergne-Rhône-Alpes', slug: 'ain' },
  { code: '02', nom: 'Aisne', region: 'Hauts-de-France', slug: 'aisne' },
  { code: '03', nom: 'Allier', region: 'Auvergne-Rhône-Alpes', slug: 'allier' },
  { code: '04', nom: 'Alpes-de-Haute-Provence', region: 'Provence-Alpes-Côte d\'Azur', slug: 'alpes-de-haute-provence' },
  { code: '05', nom: 'Hautes-Alpes', region: 'Provence-Alpes-Côte d\'Azur', slug: 'hautes-alpes' },
  { code: '06', nom: 'Alpes-Maritimes', region: 'Provence-Alpes-Côte d\'Azur', slug: 'alpes-maritimes' },
  { code: '07', nom: 'Ardèche', region: 'Auvergne-Rhône-Alpes', slug: 'ardeche' },
  { code: '08', nom: 'Ardennes', region: 'Grand Est', slug: 'ardennes' },
  { code: '09', nom: 'Ariège', region: 'Occitanie', slug: 'ariege' },
  { code: '10', nom: 'Aube', region: 'Grand Est', slug: 'aube' },
  { code: '11', nom: 'Aude', region: 'Occitanie', slug: 'aude' },
  { code: '12', nom: 'Aveyron', region: 'Occitanie', slug: 'aveyron' },
  { code: '13', nom: 'Bouches-du-Rhône', region: 'Provence-Alpes-Côte d\'Azur', slug: 'bouches-du-rhone' },
  { code: '14', nom: 'Calvados', region: 'Normandie', slug: 'calvados' },
  { code: '15', nom: 'Cantal', region: 'Auvergne-Rhône-Alpes', slug: 'cantal' },
  { code: '16', nom: 'Charente', region: 'Nouvelle-Aquitaine', slug: 'charente' },
  { code: '17', nom: 'Charente-Maritime', region: 'Nouvelle-Aquitaine', slug: 'charente-maritime' },
  { code: '18', nom: 'Cher', region: 'Centre-Val de Loire', slug: 'cher' },
  { code: '19', nom: 'Corrèze', region: 'Nouvelle-Aquitaine', slug: 'correze' },
  { code: '21', nom: 'Côte-d\'Or', region: 'Bourgogne-Franche-Comté', slug: 'cote-d-or' },
  { code: '22', nom: 'Côtes-d\'Armor', region: 'Bretagne', slug: 'cotes-d-armor' },
  { code: '23', nom: 'Creuse', region: 'Nouvelle-Aquitaine', slug: 'creuse' },
  { code: '24', nom: 'Dordogne', region: 'Nouvelle-Aquitaine', slug: 'dordogne' },
  { code: '25', nom: 'Doubs', region: 'Bourgogne-Franche-Comté', slug: 'doubs' },
  { code: '26', nom: 'Drôme', region: 'Auvergne-Rhône-Alpes', slug: 'drome' },
  { code: '27', nom: 'Eure', region: 'Normandie', slug: 'eure' },
  { code: '28', nom: 'Eure-et-Loir', region: 'Centre-Val de Loire', slug: 'eure-et-loir' },
  { code: '29', nom: 'Finistère', region: 'Bretagne', slug: 'finistere' },
  { code: '2A', nom: 'Corse-du-Sud', region: 'Corse', slug: 'corse-du-sud' },
  { code: '2B', nom: 'Haute-Corse', region: 'Corse', slug: 'haute-corse' },
  { code: '30', nom: 'Gard', region: 'Occitanie', slug: 'gard' },
  { code: '31', nom: 'Haute-Garonne', region: 'Occitanie', slug: 'haute-garonne' },
  { code: '32', nom: 'Gers', region: 'Occitanie', slug: 'gers' },
  { code: '33', nom: 'Gironde', region: 'Nouvelle-Aquitaine', slug: 'gironde' },
  { code: '34', nom: 'Hérault', region: 'Occitanie', slug: 'herault' },
  { code: '35', nom: 'Ille-et-Vilaine', region: 'Bretagne', slug: 'ille-et-vilaine' },
  { code: '36', nom: 'Indre', region: 'Centre-Val de Loire', slug: 'indre' },
  { code: '37', nom: 'Indre-et-Loire', region: 'Centre-Val de Loire', slug: 'indre-et-loire' },
  { code: '38', nom: 'Isère', region: 'Auvergne-Rhône-Alpes', slug: 'isere' },
  { code: '39', nom: 'Jura', region: 'Bourgogne-Franche-Comté', slug: 'jura' },
  { code: '40', nom: 'Landes', region: 'Nouvelle-Aquitaine', slug: 'landes' },
  { code: '41', nom: 'Loir-et-Cher', region: 'Centre-Val de Loire', slug: 'loir-et-cher' },
  { code: '42', nom: 'Loire', region: 'Auvergne-Rhône-Alpes', slug: 'loire' },
  { code: '43', nom: 'Haute-Loire', region: 'Auvergne-Rhône-Alpes', slug: 'haute-loire' },
  { code: '44', nom: 'Loire-Atlantique', region: 'Pays de la Loire', slug: 'loire-atlantique' },
  { code: '45', nom: 'Loiret', region: 'Centre-Val de Loire', slug: 'loiret' },
  { code: '46', nom: 'Lot', region: 'Occitanie', slug: 'lot' },
  { code: '47', nom: 'Lot-et-Garonne', region: 'Nouvelle-Aquitaine', slug: 'lot-et-garonne' },
  { code: '48', nom: 'Lozère', region: 'Occitanie', slug: 'lozere' },
  { code: '49', nom: 'Maine-et-Loire', region: 'Pays de la Loire', slug: 'maine-et-loire' },
  { code: '50', nom: 'Manche', region: 'Normandie', slug: 'manche' },
  { code: '51', nom: 'Marne', region: 'Grand Est', slug: 'marne' },
  { code: '52', nom: 'Haute-Marne', region: 'Grand Est', slug: 'haute-marne' },
  { code: '53', nom: 'Mayenne', region: 'Pays de la Loire', slug: 'mayenne' },
  { code: '54', nom: 'Meurthe-et-Moselle', region: 'Grand Est', slug: 'meurthe-et-moselle' },
  { code: '55', nom: 'Meuse', region: 'Grand Est', slug: 'meuse' },
  { code: '56', nom: 'Morbihan', region: 'Bretagne', slug: 'morbihan' },
  { code: '57', nom: 'Moselle', region: 'Grand Est', slug: 'moselle' },
  { code: '58', nom: 'Nièvre', region: 'Bourgogne-Franche-Comté', slug: 'nievre' },
  { code: '59', nom: 'Nord', region: 'Hauts-de-France', slug: 'nord' },
  { code: '60', nom: 'Oise', region: 'Hauts-de-France', slug: 'oise' },
  { code: '61', nom: 'Orne', region: 'Normandie', slug: 'orne' },
  { code: '62', nom: 'Pas-de-Calais', region: 'Hauts-de-France', slug: 'pas-de-calais' },
  { code: '63', nom: 'Puy-de-Dôme', region: 'Auvergne-Rhône-Alpes', slug: 'puy-de-dome' },
  { code: '64', nom: 'Pyrénées-Atlantiques', region: 'Nouvelle-Aquitaine', slug: 'pyrenees-atlantiques' },
  { code: '65', nom: 'Hautes-Pyrénées', region: 'Occitanie', slug: 'hautes-pyrenees' },
  { code: '66', nom: 'Pyrénées-Orientales', region: 'Occitanie', slug: 'pyrenees-orientales' },
  { code: '67', nom: 'Bas-Rhin', region: 'Grand Est', slug: 'bas-rhin' },
  { code: '68', nom: 'Haut-Rhin', region: 'Grand Est', slug: 'haut-rhin' },
  { code: '69', nom: 'Rhône', region: 'Auvergne-Rhône-Alpes', slug: 'rhone' },
  { code: '70', nom: 'Haute-Saône', region: 'Bourgogne-Franche-Comté', slug: 'haute-saone' },
  { code: '71', nom: 'Saône-et-Loire', region: 'Bourgogne-Franche-Comté', slug: 'saone-et-loire' },
  { code: '72', nom: 'Sarthe', region: 'Pays de la Loire', slug: 'sarthe' },
  { code: '73', nom: 'Savoie', region: 'Auvergne-Rhône-Alpes', slug: 'savoie' },
  { code: '74', nom: 'Haute-Savoie', region: 'Auvergne-Rhône-Alpes', slug: 'haute-savoie' },
  { code: '75', nom: 'Paris', region: 'Île-de-France', slug: 'paris' },
  { code: '76', nom: 'Seine-Maritime', region: 'Normandie', slug: 'seine-maritime' },
  { code: '77', nom: 'Seine-et-Marne', region: 'Île-de-France', slug: 'seine-et-marne' },
  { code: '78', nom: 'Yvelines', region: 'Île-de-France', slug: 'yvelines' },
  { code: '79', nom: 'Deux-Sèvres', region: 'Nouvelle-Aquitaine', slug: 'deux-sevres' },
  { code: '80', nom: 'Somme', region: 'Hauts-de-France', slug: 'somme' },
  { code: '81', nom: 'Tarn', region: 'Occitanie', slug: 'tarn' },
  { code: '82', nom: 'Tarn-et-Garonne', region: 'Occitanie', slug: 'tarn-et-garonne' },
  { code: '83', nom: 'Var', region: 'Provence-Alpes-Côte d\'Azur', slug: 'var' },
  { code: '84', nom: 'Vaucluse', region: 'Provence-Alpes-Côte d\'Azur', slug: 'vaucluse' },
  { code: '85', nom: 'Vendée', region: 'Pays de la Loire', slug: 'vendee' },
  { code: '86', nom: 'Vienne', region: 'Nouvelle-Aquitaine', slug: 'vienne' },
  { code: '87', nom: 'Haute-Vienne', region: 'Nouvelle-Aquitaine', slug: 'haute-vienne' },
  { code: '88', nom: 'Vosges', region: 'Grand Est', slug: 'vosges' },
  { code: '89', nom: 'Yonne', region: 'Bourgogne-Franche-Comté', slug: 'yonne' },
  { code: '90', nom: 'Territoire de Belfort', region: 'Bourgogne-Franche-Comté', slug: 'territoire-de-belfort' },
  { code: '91', nom: 'Essonne', region: 'Île-de-France', slug: 'essonne' },
  { code: '92', nom: 'Hauts-de-Seine', region: 'Île-de-France', slug: 'hauts-de-seine' },
  { code: '93', nom: 'Seine-Saint-Denis', region: 'Île-de-France', slug: 'seine-saint-denis' },
  { code: '94', nom: 'Val-de-Marne', region: 'Île-de-France', slug: 'val-de-marne' },
  { code: '95', nom: 'Val-d\'Oise', region: 'Île-de-France', slug: 'val-d-oise' },
  { code: '971', nom: 'Guadeloupe', region: 'Outre-mer', slug: 'guadeloupe' },
  { code: '972', nom: 'Martinique', region: 'Outre-mer', slug: 'martinique' },
  { code: '973', nom: 'Guyane', region: 'Outre-mer', slug: 'guyane' },
  { code: '974', nom: 'La Réunion', region: 'Outre-mer', slug: 'la-reunion' },
  { code: '976', nom: 'Mayotte', region: 'Outre-mer', slug: 'mayotte' },
];

/** Lookup par slug */
export function getDepartementBySlug(slug: string): DepartementInfo | undefined {
  return DEPARTEMENTS.find((d) => d.slug === slug);
}

/** Lookup par code */
export function getDepartementByCode(code: string): DepartementInfo | undefined {
  return DEPARTEMENTS.find((d) => d.code === code);
}

// Les ligatures Œ/Æ sont des caractères précomposés qui ne sont pas décomposés
// par NFD. Sans ce mapping, "Schœlcher" → "sch-lcher" → URL cassée → 404 Google.
const LIGATURE_MAP: Record<string, string> = {
  'œ': 'oe',
  'Œ': 'OE',
  'æ': 'ae',
  'Æ': 'AE',
};

/** Slugify une ville pour l'URL — regroupe les arrondissements (Paris 15e → paris) */
export function slugifyVille(ville: string): string {
  return normalizeVilleBase(ville)
    .replace(/[œŒæÆ]/g, (c) => LIGATURE_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Supprime les suffixes d'arrondissement pour regrouper :
 * "Paris 15e" → "Paris", "LYON 7EME" → "LYON", "MARSEILLE 01" → "MARSEILLE"
 */
export function normalizeVilleBase(ville: string): string {
  return ville
    .replace(/\s+\d+\s*(er|ère|eme|ème|e)?(\s+arr\.?(ondissement)?)?$/i, '')
    .replace(/\s+arr\.?(ondissement)?$/i, '')
    .trim();
}

/**
 * Retourne la préposition française correcte pour parler d'un département.
 * Ex: "le Rhône" → "du Rhône", "les Yvelines" → "des Yvelines", "Paris" → "de Paris".
 * Renvoie aussi le déterminant complet pour les formulations "dans ...".
 */
export function prepositionDepartement(nom: string): { de: string; dans: string } {
  // Départements sans article : Paris, Guyane, Mayotte, Martinique, Guadeloupe, La Réunion, Corse (partiel)
  const sansArticle = ['Paris', 'Guadeloupe', 'Martinique', 'Guyane', 'Mayotte', 'La Réunion', 'Corse-du-Sud', 'Haute-Corse'];
  if (sansArticle.includes(nom)) {
    return { de: `de ${nom}`, dans: `à ${nom}` };
  }

  // Départements féminins pluriels (les) : Alpes-Maritimes, Hautes-Alpes, etc.
  const pluriel = /^(Alpes-|Hautes-Alpes|Alpes-de|Ardennes|Bouches-du|Côtes-d|Deux-Sèvres|Hautes-Pyrénées|Landes|Pyrénées-|Vosges|Yvelines|Hauts-de-Seine)/;
  if (pluriel.test(nom)) {
    return { de: `des ${nom}`, dans: `dans les ${nom}` };
  }

  // Départements commençant par une voyelle → "d'" et "en" / "dans l'"
  if (/^(A|E|I|O|U|Y|H[aeiouy])/i.test(nom)) {
    return { de: `d'${nom}`, dans: `dans l'${nom}` };
  }

  // Par défaut : masculin singulier (le)
  return { de: `du ${nom}`, dans: `dans le ${nom}` };
}

/**
 * Affiche un nom de ville en Title Case ("PARIS" → "Paris", "LA-ROCHE-SUR-YON" → "La Roche-sur-Yon").
 * Conserve les particules en minuscule (de, du, la, le, sur, etc.).
 */
export function formatVilleName(ville: string): string {
  if (!ville) return '';
  const particules = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'aux', 'et', 'l', 'd']);

  return ville
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part, idx) => {
      // Préserve les séparateurs (espaces, tirets)
      if (/^\s+$/.test(part) || part === '-') return part;
      // Particules en minuscule, sauf en première position
      if (idx > 0 && particules.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}
