// Tabs.tsx — primitive React pour onglets horizontaux (ProspectEditModal).
// Underline orange sur l'actif, muted sur les autres. Badge count optionnel.

export interface TabConfig {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: TabConfig[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeId, onChange }: Props) {
  return (
    <div className="border-b border-[#E4DED3] -mx-6 px-6 mb-5 font-sans">
      <div className="flex gap-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={
                isActive
                  ? 'px-4 py-2.5 text-sm font-semibold text-[#1B2E4A] border-b-2 border-[#D97B3D] -mb-px inline-flex items-center gap-1.5'
                  : 'px-4 py-2.5 text-sm font-medium text-[#6B7A90] hover:text-[#1B2E4A] border-b-2 border-transparent -mb-px inline-flex items-center gap-1.5'
              }
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={
                    isActive
                      ? 'px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D97B3D] text-white'
                      : 'px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8ECF2] text-[#1B2E4A]'
                  }
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
