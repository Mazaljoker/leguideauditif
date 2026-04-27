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
  /** Indication contextuelle facultative affichée en gris à droite. */
  hint?: string;
}

/**
 * Tous les templates exposés en Phase 2 (PR-d). Ordre éditorial :
 * complétude → onboarding → offre Fondateurs → étude de cas →
 * relance slots → ads vs sortie → annonce one-shot.
 *
 * `premium_welcome` et les transactionnels (claim_*, payment_*,
 * subscription_cancelled) ne sont PAS exposés ici — ils ont leur propre
 * point d'entrée (webhook Stripe / endpoints claim).
 */
const OPTIONS: readonly TemplateOption[] = [
  { key: 'fiche_incomplete_relance',     label: 'Complétude de fiche' },
  { key: 'nurture_01_premiers_patients', label: 'Premiers patients',          hint: 'J+3' },
  { key: 'nurture_02_offre_fondateurs',  label: 'Offre Fondateurs',           hint: 'J+7' },
  { key: 'nurture_03_cas_concret',       label: 'Méthode 3 points',           hint: 'J+14' },
  { key: 'nurture_04_slots_restants',    label: 'Slots Fondateurs restants',  hint: 'J+21' },
  { key: 'nurture_05_ads_ou_sortie',     label: 'Ads ou sortie',              hint: 'J+45' },
  { key: 'nouvel_espace_pro_annonce',    label: 'Annonce nouvel espace pro',  hint: 'one-shot' },
];

/**
 * Dropdown de relance manuelle admin. Tous les templates sont actifs en
 * Phase 2. Si l'audio est désabonné (soft ou hard), le bouton entier
 * est disabled — le serveur le bloquerait de toute façon (409).
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
        type="button"
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
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 text-xs font-sans font-medium text-[#1B2E4A] border border-[#E4DED3] rounded hover:bg-[#F8F5F0] focus:outline-2 focus:outline-[#D97B3D]"
          style={{ minHeight: 44 }}
          aria-haspopup="true"
          aria-expanded={isOpen ? 'true' : 'false'}
        >
          Relancer ▾
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-64 bg-white border border-[#E4DED3] rounded shadow-lg z-10 font-sans"
            role="menu"
          >
            <div className="py-1">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(opt.key);
                    setIsOpen(false);
                  }}
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-xs text-[#1B2E4A] hover:bg-[#F8F5F0] cursor-pointer flex justify-between items-center gap-2"
                >
                  <span>{opt.label}</span>
                  {opt.hint && (
                    <span className="text-[10px] text-[#6B7A90]">{opt.hint}</span>
                  )}
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
