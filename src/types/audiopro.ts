// Types partagés pour le dashboard /audioprothesiste-pro/.
//
// Les 3 états de dashboard (revendicateur / premium_solo / reseau) sont
// résolus par resolveDashboardState() dans src/lib/audiopro.ts à partir
// du plan des centres et de leur nombre. L'état 'onboarding' correspond
// au cas "aucun centre approved" — déjà géré par le layout via un redirect
// vers /audioprothesiste-pro/bienvenue/.

export type DashboardState =
  | 'onboarding'
  | 'revendicateur'
  | 'premium_solo'
  | 'reseau';

export type KPITone = 'positive' | 'action' | 'muted' | 'neutral';

export type LeverStatus = 'active' | 'pending' | 'inactive';

export interface KPIValue {
  label: string;
  value: string;
  valueSub?: string;
  desc: string;
  footer?: string;
  footerTone?: KPITone;
  locked?: boolean;
}

export interface LeverDefinition {
  num: 1 | 2 | 3;
  title: string;
  body: string;
  statusLabel: string;
  statusValue: string;
  statusTone: 'positive' | 'muted' | 'action';
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: 'marine' | 'outline' | 'ghost';
  iconName: string;
}

export interface ActionPrioritaireInfo {
  label: string;
  title: string;
  desc: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface CentreTableRow {
  slug: string;
  nom: string;
  adresse: string;
  cp: string;
  adsStatus: LeverStatus;
  adsLabel: string;
  positionRank: number | null;
  positionTotal: number | null;
  vues30j: number;
  completeness: number;
}
