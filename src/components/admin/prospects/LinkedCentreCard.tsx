// LinkedCentreCard.tsx — card d'un centre lié au prospect.
// Affiche infos complètes + badge complétude + bouton détach + lien fiche LGA.

import Button from '../ui/react/Button';
import type { LinkedCentre } from '../../../types/prospect';

interface Props {
  centre: LinkedCentre;
  onUnlink: () => void;
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CompletenessBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? 'bg-[#E3F0EA] text-[#2F7A5A]'
      : pct >= 50
        ? 'bg-[#FBEFD8] text-[#B8761F]'
        : 'bg-[#F6E3E3] text-[#B34444]';
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-1 rounded ${color}`}
      aria-label={`Complétude ${pct} pour cent`}
    >
      {pct}%
    </span>
  );
}

export default function LinkedCentreCard({ centre, onUnlink }: Props) {
  return (
    <div className="border border-[#E4DED3] rounded-lg p-4 bg-white font-sans">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[15px] text-[#1B2E4A]">{centre.nom}</h3>
            {centre.is_primary && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[#D97B3D] text-white rounded font-semibold">
                Principal
              </span>
            )}
            {centre.linked_via === 'auto_claim' && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[#E3F0EA] text-[#2F7A5A] rounded font-semibold">
                Auto
              </span>
            )}
          </div>
          {(centre.audio_prenom || centre.audio_nom) && (
            <div className="text-xs text-[#6B7A90] mt-0.5">
              {[centre.audio_prenom, centre.audio_nom].filter(Boolean).join(' ')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <CompletenessBadge pct={centre.completeness_pct} />
          <Button variant="icon" onClick={onUnlink} aria-label="Détacher ce centre">
            <XIcon />
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {centre.adresse && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">Adresse</dt>
            <dd className="text-[#1B2E4A]">
              {centre.adresse}
              {(centre.cp || centre.ville) && `, ${[centre.cp, centre.ville].filter(Boolean).join(' ')}`}
            </dd>
          </div>
        )}
        {centre.tel && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">Téléphone</dt>
            <dd>
              <a href={`tel:${centre.tel}`} className="text-[#1B2E4A] hover:text-[#D97B3D]">
                {centre.tel}
              </a>
            </dd>
          </div>
        )}
        {centre.email && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">E-mail</dt>
            <dd>
              <a href={`mailto:${centre.email}`} className="text-[#1B2E4A] hover:text-[#D97B3D]">
                {centre.email}
              </a>
            </dd>
          </div>
        )}
        {centre.siret && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">SIRET</dt>
            <dd className="font-mono text-[13px] text-[#1B2E4A]">{centre.siret}</dd>
          </div>
        )}
        {centre.claimed_by_adeli && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">ADELI / RPPS</dt>
            <dd className="font-mono text-[13px] text-[#1B2E4A]">{centre.claimed_by_adeli}</dd>
          </div>
        )}
        {centre.finess && (
          <div>
            <dt className="text-[11px] text-[#6B7A90] uppercase tracking-wide">FINESS</dt>
            <dd className="font-mono text-[13px] text-[#1B2E4A]">{centre.finess}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 pt-3 border-t border-dashed border-[#E4DED3] flex items-center gap-4 text-xs flex-wrap">
        <a
          href={`/centre/${centre.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#D97B3D] hover:underline inline-flex items-center gap-1 font-medium"
        >
          Voir la fiche LGA →
        </a>
        {centre.claim_status === 'approved' && (
          <span className="text-[#2F7A5A]">
            Revendiquée{centre.claimed_at && ` le ${new Date(centre.claimed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            {centre.claimed_by_name && ` par ${centre.claimed_by_name.trim()}`}
          </span>
        )}
        {centre.plan === 'premium' && (
          <span className="text-[#D97B3D]">Premium</span>
        )}
      </div>
    </div>
  );
}
