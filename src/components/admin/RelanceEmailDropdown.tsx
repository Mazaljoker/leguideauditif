import { useState, useRef, useEffect } from 'react';
import RelanceConfirmModal from './RelanceConfirmModal';
import type { EmailTemplateKey } from '../../types/audiopro-lifecycle';

interface Props {
  audioproId: string;
  audioproEmail: string;
  isUnsubscribed: boolean;
}

interface TemplateOption {
  key: EmailTemplateKey;
  label: string;
  availableInPhase1: boolean;
}

const OPTIONS: readonly TemplateOption[] = [
  { key: 'fiche_incomplete_relance',     label: 'Complétude de fiche',       availableInPhase1: true  },
  { key: 'nurture_01_premiers_patients', label: 'Premiers patients',          availableInPhase1: false },
  { key: 'nurture_02_offre_fondateurs',  label: 'Offre Fondateurs',           availableInPhase1: false },
  { key: 'nurture_03_cas_concret',       label: 'Étude de cas',               availableInPhase1: false },
  { key: 'nurture_04_slots_restants',    label: 'Slots Fondateurs restants',  availableInPhase1: false },
  { key: 'nurture_05_ads_ou_sortie',     label: 'Ads ou sortie',              availableInPhase1: false },
];

/**
 * Dropdown à 6 templates. En Phase 1, seul `fiche_incomplete_relance` est
 * fonctionnel. Les 5 autres sont affichés grisés avec tooltip "Phase 2".
 * Si l'audio est désabonné, le bouton entier est disabled.
 */
export default function RelanceEmailDropdown({
  audioproId,
  audioproEmail,
  isUnsubscribed,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateKey | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (isUnsubscribed) {
    return (
      <button
        disabled
        title="Cet audio est désabonné — relance impossible"
        className="px-3 py-1.5 text-xs font-sans text-[#6B7A90] border border-[#E4DED3] rounded cursor-not-allowed"
        style={{ minHeight: 44 }}
      >
        Relancer
      </button>
    );
  }

  return (
    <>
      <div ref={ref} className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 text-xs font-sans font-medium text-[#1B2E4A] border border-[#E4DED3] rounded hover:bg-[#F8F5F0] focus:outline-2 focus:outline-[#D97B3D]"
          style={{ minHeight: 44 }}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          Relancer ▾
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E4DED3] rounded shadow-lg z-10 font-sans"
            role="menu"
          >
            <div className="py-1">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  disabled={!opt.availableInPhase1}
                  onClick={() => {
                    if (!opt.availableInPhase1) return;
                    setSelectedTemplate(opt.key);
                    setIsOpen(false);
                  }}
                  role="menuitem"
                  title={opt.availableInPhase1 ? undefined : 'Disponible en Phase 2'}
                  className={
                    opt.availableInPhase1
                      ? 'w-full text-left px-3 py-2 text-xs text-[#1B2E4A] hover:bg-[#F8F5F0] cursor-pointer'
                      : 'w-full text-left px-3 py-2 text-xs text-[#6B7A90] cursor-not-allowed'
                  }
                >
                  {opt.label}
                  {!opt.availableInPhase1 && <span className="ml-1 text-[10px]">(v2)</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <RelanceConfirmModal
          audioproId={audioproId}
          audioproEmail={audioproEmail}
          templateKey={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  );
}
