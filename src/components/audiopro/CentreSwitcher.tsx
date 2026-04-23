// CentreSwitcher.tsx — sélecteur de centre actif pour l'espace pro.
// Inspiré du pattern admin prospects/LinkedCentreCard (cards avec badges)
// plutôt qu'un <select> natif discgracieux.
//
// - 1 centre : card fixe (nom + ville + badge plan)
// - N centres : card cliquable avec chevron → popup flottant listant les
//   autres fiches. Clic sur une entrée = POST set-active-centre + reload.

import { useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import type { UserCentre } from '../../lib/audiopro';

export interface CentreSwitcherProps {
  centres: UserCentre[];
  activeSlug: string;
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
      <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'w-4 h-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-orange" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlanBadge({ plan }: { plan: UserCentre['plan'] }) {
  if (plan === 'premium') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 text-orange px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wide shrink-0">
        Premium
      </span>
    );
  }
  if (plan === 'claimed') {
    return (
      <span className="inline-flex items-center rounded-full bg-marine/10 text-marine px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wide shrink-0">
        Standard
      </span>
    );
  }
  return null;
}

const CentreSwitcher: FC<CentreSwitcherProps> = ({ centres, activeSlug }) => {
  const active = centres.find((c) => c.slug === activeSlug) ?? centres[0];
  const others = centres.filter((c) => c.slug !== active.slug);
  const multi = centres.length > 1;

  const [open, setOpen] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fermer le popup au clic en dehors
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  async function switchCentre(slug: string) {
    if (slug === active.slug) {
      setOpen(false);
      return;
    }
    setBusySlug(slug);
    try {
      const res = await fetch('/api/audiopro/set-active-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Impossible de changer de centre.');
      }
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.');
      setBusySlug(null);
    }
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  // Cas 1 centre : card figée, pas d'interaction
  if (!multi) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gris-clair bg-blanc px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-marine/10 text-marine flex items-center justify-center shrink-0">
          <BuildingIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-sans font-semibold text-marine truncate">{active.nom}</p>
            <PlanBadge plan={active.plan} />
          </div>
          <p className="text-xs text-gris-texte font-sans truncate">
            {active.ville ?? active.cp}
          </p>
        </div>
      </div>
    );
  }

  // Cas N centres : trigger cliquable + popup
  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 rounded-xl border border-gris-clair bg-blanc px-4 py-3 text-left hover:border-orange/40 hover:bg-blanc focus:outline-none focus:ring-2 focus:ring-orange/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-marine/10 text-marine flex items-center justify-center shrink-0">
          <BuildingIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-sans font-semibold text-marine truncate">{active.nom}</p>
            <PlanBadge plan={active.plan} />
          </div>
          <p className="text-xs text-gris-texte font-sans truncate">
            {active.ville ?? active.cp}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {centres.length} fiches dans votre espace
          </p>
        </div>
        <span className="text-gris-texte">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Changer de centre actif"
          className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 rounded-xl border border-gris-clair bg-blanc shadow-[0_10px_40px_rgba(27,46,74,0.12)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gris-clair bg-creme">
            <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-marine/70">
              Centre actif
            </p>
            <p className="text-sm font-sans font-semibold text-marine truncate mt-0.5">
              {active.nom}
            </p>
          </div>

          <div className="px-4 py-2 border-b border-gris-clair">
            <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-marine/70">
              Basculer vers
            </p>
          </div>

          <ul className="max-h-[380px] overflow-y-auto divide-y divide-gris-clair">
            {others.map((c) => {
              const busy = busySlug === c.slug;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={busy}
                    onClick={() => switchCentre(c.slug)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-creme focus:outline-none focus:bg-creme disabled:opacity-60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-marine/5 text-marine flex items-center justify-center shrink-0 mt-0.5">
                      <BuildingIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-sans font-semibold text-sm text-marine truncate">
                          {c.nom}
                        </p>
                        <PlanBadge plan={c.plan} />
                        {c.is_primary && (
                          <span className="inline-flex items-center rounded-full bg-[#E3F0EA] text-[#2F7A5A] px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wide shrink-0">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gris-texte font-sans truncate mt-0.5">
                        {c.ville ?? c.cp}
                      </p>
                    </div>
                    {busy && (
                      <span className="text-xs text-gris-texte font-sans shrink-0 self-center">
                        …
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="px-4 py-3 border-t border-gris-clair bg-creme flex items-center gap-2">
            <CheckIcon />
            <p className="text-[11px] text-gris-texte font-sans">
              Vous voyez les stats, leads et l'édition du centre sélectionné.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentreSwitcher;
