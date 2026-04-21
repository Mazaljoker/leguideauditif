// ProspectEditModal.tsx — modal d'édition en vue Pipeline.
// 3 onglets : Info (form), Centres, Historique.
// Close sur overlay / Escape. La vue Liste utilise toujours ProspectEditPanel.

import { useEffect, useState } from 'react';
import Tabs from '../ui/react/Tabs';
import ProspectFormFields from './ProspectFormFields';
import ProspectCentresTab from './ProspectCentresTab';
import ProspectHistoriqueTab from './ProspectHistoriqueTab';
import {
  PROSPECT_STATUS_LABELS,
  type Prospect,
} from '../../../types/prospect';

interface Props {
  prospect: Prospect;
  onClose: () => void;
  onSaved: (updated: Prospect) => void;
  onDeleted: (id: string) => void;
}

type TabId = 'info' | 'centres' | 'historique';

function CrownIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#D97B3D]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Partenaire Fondateur"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
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

export default function ProspectEditModal({
  prospect,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [centresCount, setCentresCount] = useState<number | undefined>(undefined);
  const [interactionsCount, setInteractionsCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const statusLabel = PROSPECT_STATUS_LABELS[prospect.status];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche de ${prospect.name}`}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-[#6B7A90] hover:text-[#1B2E4A] p-2 rounded-lg"
        >
          <CloseIcon />
        </button>

        <div className="mb-4 pr-10">
          <h2 className="font-serif text-2xl font-black text-[#1B2E4A] flex items-center gap-2">
            <span>{prospect.name}</span>
            {prospect.is_fondateur && <CrownIcon />}
          </h2>
          <p className="text-xs text-[#6B7A90] mt-0.5">
            {statusLabel}
            {prospect.company ? ` · ${prospect.company}` : ''}
          </p>
        </div>

        <Tabs
          tabs={[
            { id: 'info', label: 'Info' },
            { id: 'centres', label: 'Centres', count: centresCount },
            { id: 'historique', label: 'Historique', count: interactionsCount },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />

        {activeTab === 'info' && (
          <ProspectFormFields
            prospect={prospect}
            onSaved={onSaved}
            onCancel={onClose}
            onDeleted={(id) => {
              onDeleted(id);
              onClose();
            }}
          />
        )}

        {activeTab === 'centres' && (
          <ProspectCentresTab
            prospectId={prospect.id}
            onCountChange={setCentresCount}
          />
        )}

        {activeTab === 'historique' && (
          <ProspectHistoriqueTab
            prospectId={prospect.id}
            onCountChange={setInteractionsCount}
          />
        )}
      </div>
    </div>
  );
}
